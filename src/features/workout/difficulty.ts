// Ressenti d'une série (enum Postgres `difficulty`, SPEC 6.2).
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'fail'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
