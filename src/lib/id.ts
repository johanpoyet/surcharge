import { randomUUID } from 'expo-crypto';

/** UUID v4 généré côté client : les lignes sont créées hors ligne (SPEC 6.1). */
export const newId = (): string => randomUUID();
