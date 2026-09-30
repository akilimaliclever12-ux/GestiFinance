import { db, type PaymentEventRow, type ExpenseEventRow, type StudentRow } from "./db";
import { enqueueInsert } from "./sync";
import type { CurrencyCode, PaymentMethod } from "@/lib/types";

export interface Ctx {
  userId: string;
  tenantId: string;
}

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// ============================================================
// Lectures (depuis Dexie) — compatibles useLiveQuery
// ============================================================
export async function listStudents(q?: string): Promise<StudentRow[]> {
  const all = (await db.students.toArray()).filter((s) => !s.deleted_at);
  const term = (q ?? "").trim().toLowerCase();
  const filtered = term
    ? all.filter(
        (s) =>
          s.matricule.toLowerCase().includes(term) ||
          s.last_name.toLowerCase().includes(term) ||
          s.first_name.toLowerCase().includes(term),
      )
    : all;
  return filtered.sort((a, b) => a.last_name.localeCompare(b.last_name));
}

function effectivePayments(rows: PaymentEventRow[]): PaymentEventRow[] {
  const cancelled = new Set(
    rows.filter((p) => p.event_type === "cancellation").map((p) => p.cancels_event_id),
  );
  return rows.filter((p) => p.event_type === "payment" && !cancelled.has(p.id));
}

export interface FeeStatus {
  fee_type_id: string;
  name: string;
  currency: CurrencyCode;
  total_expected: number;
  total_paid: number;
  balance: number;
}

export interface StudentFeeContext {
  school_id: string;
  fees: FeeStatus[];
  banks: { id: string; name: string }[];
}

/** Solvabilité calculée localement (attendu vs payé) pour un élève. */
export async function getStudentFeeContext(
  studentId: string,
): Promise<StudentFeeContext | null> {
  const student = await db.students.get(studentId);
  if (!student) return null;

  const [feeTypes, schedules, banks, payAll] = await Promise.all([
    db.fee_types.where("school_id").equals(student.school_id).toArray(),
    db.fee_schedules.where("school_id").equals(student.school_id).toArray(),
    db.banks.where("school_id").equals(student.school_id).toArray(),
    db.payment_events.where("student_id").equals(studentId).toArray(),
  ]);

  const effective = effectivePayments(payAll);

  const fees: FeeStatus[] = feeTypes
    .filter((ft) => !ft.deleted_at)
    .map((ft) => {
      const expected = schedules
        .filter(
          (s) =>
            s.fee_type_id === ft.id &&
            !s.deleted_at &&
            (s.class_name == null || s.class_name === student.class_name),
        )
        .reduce((a, s) => a + Number(s.amount_expected), 0);
      const paid = effective
        .filter((p) => p.fee_type_id === ft.id)
        .reduce((a, p) => a + Number(p.amount), 0);
      return {
        fee_type_id: ft.id,
        name: ft.name,
        currency: ft.currency,
        total_expected: expected,
        total_paid: paid,
        balance: expected - paid,
      };
    });

  return {
    school_id: student.school_id,
    fees,
    banks: banks.filter((b) => !b.deleted_at).map((b) => ({ id: b.id, name: b.name })),
  };
}

// ============================================================
// Fiche élève : frais (tranches + exigible), paiements, statut
// ============================================================
export interface Tranche {
  amount: number;
  due_date: string | null;
  covered: number; // part couverte par les paiements (imputés par échéance)
  is_due: boolean;
}

export interface FeeFile extends FeeStatus {
  due_expected: number; // exigible à ce jour (tranches échues ou sans échéance)
  is_in_order: boolean;
  next_due: string | null; // prochaine échéance non encore couverte
  tranches: Tranche[];
}

export interface StudentPayment {
  id: string;
  paid_at: string;
  fee: string;
  bank: string | null;
  bordereau_no: string | null;
  amount: number;
  currency: CurrencyCode;
  cancelled: boolean;
  synced: boolean;
}

export interface StudentFile {
  student: StudentRow;
  school: string;
  fees: FeeFile[];
  payments: StudentPayment[];
  is_in_order: boolean;
}

/** Même règle que la vue student_solvency_status (migration 0016). */
export async function getStudentFile(studentId: string): Promise<StudentFile | null> {
  const student = await db.students.get(studentId);
  if (!student || student.deleted_at) return null;

  const [school, feeTypes, schedules, banks, payAll, outbox] = await Promise.all([
    db.schools.get(student.school_id),
    db.fee_types.where("school_id").equals(student.school_id).toArray(),
    db.fee_schedules.where("school_id").equals(student.school_id).toArray(),
    db.banks.where("school_id").equals(student.school_id).toArray(),
    db.payment_events.where("student_id").equals(studentId).toArray(),
    db.outbox.toArray(),
  ]);

  const today = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-JJ, heure locale
  const effective = effectivePayments(payAll);

  const fees: FeeFile[] = feeTypes
    .filter((ft) => !ft.deleted_at)
    .map((ft) => {
      const own = schedules
        .filter(
          (s) =>
            s.fee_type_id === ft.id &&
            !s.deleted_at &&
            (s.class_name == null || s.class_name === student.class_name),
        )
        // sans échéance d'abord, puis par date : ordre d'imputation des paiements
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
      const paid = effective
        .filter((p) => p.fee_type_id === ft.id)
        .reduce((a, p) => a + Number(p.amount), 0);

      let left = paid;
      const tranches: Tranche[] = own.map((s) => {
        const amount = Number(s.amount_expected);
        const covered = Math.min(amount, Math.max(left, 0));
        left -= covered;
        return { amount, due_date: s.due_date, covered, is_due: !s.due_date || s.due_date <= today };
      });

      const expected = tranches.reduce((a, t) => a + t.amount, 0);
      const due_expected = tranches.filter((t) => t.is_due).reduce((a, t) => a + t.amount, 0);
      return {
        fee_type_id: ft.id,
        name: ft.name,
        currency: ft.currency,
        total_expected: expected,
        total_paid: paid,
        balance: expected - paid,
        due_expected,
        is_in_order: paid >= due_expected,
        next_due: tranches.find((t) => t.covered < t.amount && t.due_date && !t.is_due)?.due_date ?? null,
        tranches,
      };
    })
    .filter((f) => f.tranches.length > 0 || f.total_paid > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const cancelled = new Set(
    payAll.filter((p) => p.event_type === "cancellation").map((p) => p.cancels_event_id),
  );
  const pending = new Set(
    outbox.filter((o) => o.table === "payment_events").map((o) => o.payload.id as string),
  );
  const feeName = new Map(feeTypes.map((f) => [f.id, f.name]));
  const bankName = new Map(banks.map((b) => [b.id, b.name]));
  const payments: StudentPayment[] = payAll
    .filter((p) => p.event_type === "payment")
    .sort((a, b) => (a.paid_at === b.paid_at ? b.created_at.localeCompare(a.created_at) : b.paid_at.localeCompare(a.paid_at)))
    .map((p) => ({
      id: p.id,
      paid_at: p.paid_at,
      fee: feeName.get(p.fee_type_id) ?? "—",
      bank: p.bank_id ? (bankName.get(p.bank_id) ?? null) : null,
      bordereau_no: p.bordereau_no,
      amount: Number(p.amount),
      currency: p.currency,
      cancelled: cancelled.has(p.id),
      synced: !pending.has(p.id),
    }));

  return {
    student,
    school: school?.name ?? "",
    fees,
    payments,
    is_in_order: fees.every((f) => f.is_in_order),
  };
}

export async function listRecentPayments(limit = 30) {
  const rows = await db.payment_events
    .where("event_type")
    .equals("payment")
    .toArray();
  const cancelled = new Set(
    (await db.payment_events.where("event_type").equals("cancellation").toArray()).map(
      (c) => c.cancels_event_id,
    ),
  );
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return rows.slice(0, limit).map((p) => ({ ...p, cancelled: cancelled.has(p.id) }));
}

export async function listRecentExpenses(limit = 30) {
  const rows = await db.expense_events.where("event_type").equals("expense").toArray();
  const cancelled = new Set(
    (await db.expense_events.where("event_type").equals("cancellation").toArray()).map(
      (c) => c.cancels_event_id,
    ),
  );
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return rows.slice(0, limit).map((e) => ({ ...e, cancelled: cancelled.has(e.id) }));
}

export async function listCategories() {
  return (await db.expense_categories.toArray()).filter((c) => !c.deleted_at);
}
export async function listSchools() {
  return (await db.schools.toArray()).filter((s) => !s.deleted_at);
}

// ============================================================
// Écritures (Dexie + outbox) — fonctionnent hors-ligne
// ============================================================
export async function createStudentLocal(
  ctx: Ctx,
  input: {
    school_id: string;
    matricule: string;
    last_name: string;
    first_name: string;
    class_name?: string | null;
    section?: string | null;
  },
): Promise<{ id?: string; error?: string }> {
  const dup = await db.students
    .where("school_id")
    .equals(input.school_id)
    .filter((s) => !s.deleted_at && s.matricule === input.matricule)
    .first();
  if (dup) return { error: `Matricule « ${input.matricule} » déjà utilisé.` };

  const row: StudentRow = {
    id: uuid(),
    tenant_id: ctx.tenantId,
    school_id: input.school_id,
    matricule: input.matricule,
    last_name: input.last_name,
    first_name: input.first_name,
    class_name: input.class_name ?? null,
    section: input.section ?? null,
    deleted_at: null,
  };
  await enqueueInsert("students", row as unknown as Record<string, unknown>);
  return { id: row.id };
}

export async function createPaymentLocal(
  ctx: Ctx,
  input: {
    student_id: string;
    fee_type_id: string;
    bank_id?: string | null;
    bordereau_no?: string | null;
    amount: number;
    paid_at: string;
    note?: string | null;
  },
): Promise<{ id?: string; error?: string }> {
  const feeType = await db.fee_types.get(input.fee_type_id);
  if (!feeType) return { error: "Type de frais introuvable." };

  if (input.bordereau_no) {
    const dup = await db.payment_events
      .where("school_id")
      .equals(feeType.school_id)
      .filter(
        (p) => p.event_type === "payment" && p.bordereau_no === input.bordereau_no,
      )
      .first();
    if (dup)
      return { error: `Bordereau n°${input.bordereau_no} déjà enregistré (anti-doublon).` };
  }

  // Plafond : on ne peut pas payer plus que le reste dû pour ce frais.
  const ctxData = await getStudentFeeContext(input.student_id);
  const fee = ctxData?.fees.find((f) => f.fee_type_id === input.fee_type_id);
  if (fee) {
    if (fee.balance <= 0)
      return { error: "Ce frais est déjà entièrement payé (aucun montant dû)." };
    if (input.amount > fee.balance + 0.001)
      return {
        error: `Le montant dépasse le reste dû. Maximum : ${new Intl.NumberFormat("fr-FR").format(fee.balance)} ${fee.currency}.`,
      };
  }

  const row: PaymentEventRow = {
    id: uuid(),
    tenant_id: ctx.tenantId,
    school_id: feeType.school_id,
    student_id: input.student_id,
    fee_type_id: input.fee_type_id,
    bank_id: input.bank_id ?? null,
    event_type: "payment",
    cancels_event_id: null,
    bordereau_no: input.bordereau_no ?? null,
    amount: input.amount,
    currency: feeType.currency,
    paid_at: input.paid_at,
    note: input.note ?? null,
    created_by: ctx.userId,
    authorized_by: null,
    created_at: nowIso(),
  };
  await enqueueInsert("payment_events", row as unknown as Record<string, unknown>);
  return { id: row.id };
}

export async function createExpenseCategoryLocal(
  ctx: Ctx,
  input: { school_id: string; name: string },
): Promise<{ id?: string; error?: string }> {
  const row = {
    id: uuid(),
    tenant_id: ctx.tenantId,
    school_id: input.school_id,
    name: input.name,
    deleted_at: null,
  };
  await enqueueInsert("expense_categories", row);
  return { id: row.id };
}

export async function createExpenseLocal(
  ctx: Ctx,
  input: {
    school_id: string;
    category_id?: string | null;
    beneficiary?: string | null;
    amount: number;
    currency: CurrencyCode;
    payment_method?: PaymentMethod | null;
    reference?: string | null;
    paid_at: string;
    note?: string | null;
  },
): Promise<{ id?: string; error?: string }> {
  const row: ExpenseEventRow = {
    id: uuid(),
    tenant_id: ctx.tenantId,
    school_id: input.school_id,
    category_id: input.category_id ?? null,
    event_type: "expense",
    cancels_event_id: null,
    beneficiary: input.beneficiary ?? null,
    amount: input.amount,
    currency: input.currency,
    payment_method: input.payment_method ?? null,
    reference: input.reference ?? null,
    paid_at: input.paid_at,
    note: input.note ?? null,
    created_by: ctx.userId,
    authorized_by: null,
    created_at: nowIso(),
  };
  await enqueueInsert("expense_events", row as unknown as Record<string, unknown>);
  return { id: row.id };
}
