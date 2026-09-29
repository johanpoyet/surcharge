/**
 * @jest-environment node
 */
import type { AppDatabase } from '@/db/client';
import { createTestDb } from '@/test/testDb';
import { assignDay, moveDay, setWeekdayTemplate, templateIdForDate } from '../repository';

const USER = '11111111-1111-1111-1111-111111111111';
const monday = new Date(2026, 8, 28);
const nextMonday = new Date(2026, 9, 5);
const tuesday = new Date(2026, 8, 29);
let db: AppDatabase;

beforeEach(async () => {
  db = await createTestDb();
  setWeekdayTemplate(db, USER, 1, 'push-a');
});

it('Pull A juste ce lundi : les lundis suivants restent Push A (critère Phase 7)', () => {
  assignDay(db, USER, monday, 'pull-a', false);
  expect(templateIdForDate(db, USER, monday)).toBe('pull-a');
  expect(templateIdForDate(db, USER, nextMonday)).toBe('push-a');
});

it('« Répéter chaque semaine » : modifie le modèle et retire l’exception de la date', () => {
  assignDay(db, USER, monday, 'pull-a', false);
  assignDay(db, USER, monday, 'legs', true);
  expect(templateIdForDate(db, USER, monday)).toBe('legs');
  expect(templateIdForDate(db, USER, nextMonday)).toBe('legs');
});

it('repos répété : le jour n’a plus de séance chaque semaine', () => {
  assignDay(db, USER, monday, null, true);
  expect(templateIdForDate(db, USER, nextMonday)).toBeNull();
});

it('déplacer : repos à l’origine, séance à la cible, sans toucher les autres semaines', () => {
  moveDay(db, USER, monday, tuesday, 'push-a');
  expect(templateIdForDate(db, USER, monday)).toBeNull();
  expect(templateIdForDate(db, USER, tuesday)).toBe('push-a');
  expect(templateIdForDate(db, USER, nextMonday)).toBe('push-a');
});
