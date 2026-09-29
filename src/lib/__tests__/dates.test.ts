import { formatRelativeDay, formatSessionDay, formatShortDay } from '../dates';

describe('dates', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 28, 18, 0));
  });
  afterAll(() => jest.useRealTimers());

  it("aujourd'hui, hier, sinon « 25 sept. »", () => {
    expect(formatRelativeDay(new Date(2026, 8, 28, 9, 0).toISOString())).toBe("aujourd'hui");
    expect(formatRelativeDay(new Date(2026, 8, 27, 9, 0).toISOString())).toBe('hier');
    expect(formatRelativeDay(new Date(2026, 8, 25, 9, 0).toISOString())).toBe('25 sept.');
  });

  it('jour de séance avec majuscule', () => {
    expect(formatSessionDay(new Date(2026, 8, 28, 9, 0).toISOString())).toBe('Lun. 28 sept.');
    expect(formatShortDay(new Date(2026, 6, 3, 9, 0).toISOString())).toBe('3 juil.');
  });
});
