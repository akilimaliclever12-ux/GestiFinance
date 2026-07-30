import Dexie, { type Table } from "dexie";
import type { CurrencyCode, PaymentMethod } from "@/lib/types";

// Les lignes locales reflètent la forme Supabase (mêmes colonnes).
export interface SchoolRow {
  id: string;
  tenant_id: string;
  name: string;
  deleted_at?: string | null;
}
export interface StudentRow {
  id: string;
  tenant_id: string;
  school_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  section: string | null;
  deleted_at?: string | null;
}
export interface FeeTypeRow {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  currency: CurrencyCode;
  deleted_at?: string | null;
}
export interface FeeScheduleRow {
  id: string;
  tenant_id: string;
  school_id: string;
  fee_type_id: string;
  class_name: string | null;
  amount_expected: number;
  due_date: string | null;
  deleted_at?: string | null;
}
export interface BankRow {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  deleted_at?: string | null;
}
export interface ExpenseCategoryRow {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  deleted_at?: string | null;
}
export interface PaymentEventRow {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id: string;
  fee_type_id: string;
  bank_id: string | null;
  event_type: "payment" | "cancellation";
  cancels_event_id: string | null;
  bordereau_no: string | null;
  amount: number;
  currency: CurrencyCode;
  paid_at: string;
  note: string | null;
  created_by: string;
  authorized_by: string | null;
  created_at: string;
}
export interface ExpenseEventRow {
  id: string;
  tenant_id: string;
  school_id: string;
  category_id: string | null;
  event_type: "expense" | "cancellation";
  cancels_event_id: string | null;
  beneficiary: string | null;
  amount: number;
  currency: CurrencyCode;
  payment_method: PaymentMethod | null;
  reference: string | null;
  paid_at: string;
  note: string | null;
  created_by: string;
  authorized_by: string | null;
  created_at: string;
}

export interface OutboxItem {
  id?: number;
  table: string;
  payload: Record<string, unknown>;
  createdAt: number;
  lastError?: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

class GestiDB extends Dexie {
  schools!: Table<SchoolRow, string>;
  students!: Table<StudentRow, string>;
  fee_types!: Table<FeeTypeRow, string>;
  fee_schedules!: Table<FeeScheduleRow, string>;
  banks!: Table<BankRow, string>;
  expense_categories!: Table<ExpenseCategoryRow, string>;
  payment_events!: Table<PaymentEventRow, string>;
  expense_events!: Table<ExpenseEventRow, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("gestifinance");
    this.version(1).stores({
      schools: "id, tenant_id",
      students: "id, school_id, matricule",
      fee_types: "id, school_id",
      fee_schedules: "id, school_id, fee_type_id",
      banks: "id, school_id",
      expense_categories: "id, school_id",
      payment_events: "id, school_id, student_id, event_type",
      expense_events: "id, school_id, event_type",
      outbox: "++id, createdAt",
      meta: "key",
    });
  }
}

// Instance unique (créée uniquement dans le navigateur).
export const db = new GestiDB();

/** Tables synchronisées depuis Supabase (dans l'ordre de dépendance). */
export const PULL_TABLES = [
  "schools",
  "students",
  "fee_types",
  "fee_schedules",
  "banks",
  "expense_categories",
  "payment_events",
  "expense_events",
] as const;
