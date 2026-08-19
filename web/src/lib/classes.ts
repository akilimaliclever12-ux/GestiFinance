// Classes standardisées (système RDC / écoles congolaises), dans l'ordre.
// Évite la saisie « en désordre » : le comptable choisit dans cette liste.

export const CLASSES: string[] = [
  "1ère Maternelle",
  "2ème Maternelle",
  "3ème Maternelle",
  "1ère Primaire",
  "2ème Primaire",
  "3ème Primaire",
  "4ème Primaire",
  "5ème Primaire",
  "6ème Primaire",
  "7ème EB",
  "8ème EB",
  "1ère Humanités",
  "2ème Humanités",
  "3ème Humanités",
  "4ème Humanités",
];

/** Index d'ordre pour trier les classes logiquement (pas alphabétiquement). */
export const CLASS_ORDER: Record<string, number> = Object.fromEntries(
  CLASSES.map((c, i) => [c, i]),
);

/** Sections / options courantes (suggestions — le champ reste souple). */
export const SECTIONS: string[] = [
  "Scientifique",
  "Commerciale & Gestion",
  "Pédagogie Générale",
  "Littéraire",
  "Sociale",
  "Coupe & Couture",
  "Mécanique",
  "Électricité",
  "Construction",
  "Informatique",
  "Biochimie",
];

/** Normalise une classe saisie (import) vers la forme canonique si elle correspond. */
export function normalizeClass(input: string | null | undefined): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  const hit = CLASSES.find((c) => c.toLowerCase() === v.toLowerCase());
  return hit ?? v; // garde la valeur telle quelle si non reconnue
}
