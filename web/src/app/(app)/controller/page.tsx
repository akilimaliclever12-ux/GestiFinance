import { createClient } from "@/lib/supabase/server";

type StatusRow = {
  student_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  is_in_order: boolean;
};

export default async function ControllerDashboard() {
  const supabase = await createClient();
  // Vue SANS montants : le directeur ne voit que le statut.
  const { data } = await supabase
    .from("student_solvency_status")
    .select("student_id, matricule, first_name, last_name, class_name, is_in_order")
    .order("last_name");

  const rows = (data ?? []) as StatusRow[];
  const inOrder = rows.filter((r) => r.is_in_order).length;
  const notInOrder = rows.length - inOrder;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Contrôle de solvabilité</h1>
        <p className="text-sm text-neutral-500">
          Statut des élèves — sans aucun montant.
        </p>
      </div>

      <div className="flex gap-4">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          En ordre : {inOrder}
        </span>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
          Non en ordre : {notInOrder}
        </span>
      </div>

      <table className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
          <tr>
            <th className="px-4 py-2">Matricule</th>
            <th className="px-4 py-2">Nom</th>
            <th className="px-4 py-2">Classe</th>
            <th className="px-4 py-2">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map((r) => (
            <tr key={r.student_id}>
              <td className="px-4 py-2">{r.matricule}</td>
              <td className="px-4 py-2">
                {r.last_name} {r.first_name}
              </td>
              <td className="px-4 py-2">{r.class_name ?? "—"}</td>
              <td className="px-4 py-2">
                {r.is_in_order ? (
                  <span className="text-emerald-600">● En ordre</span>
                ) : (
                  <span className="text-red-600">● Non en ordre</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-neutral-500">
                Aucun élève (vérifiez la configuration Supabase / le seed ECOBU).
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
