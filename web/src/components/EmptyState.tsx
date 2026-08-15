import { IconInbox } from "./icons";

/** État vide accueillant (à placer dans une cellule colSpan pour un tableau). */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-neutral-500">
      <IconInbox className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
      <span>{children}</span>
    </div>
  );
}
