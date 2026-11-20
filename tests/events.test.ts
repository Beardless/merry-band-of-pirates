import { EVENTS } from '../src/game/data/events';
import { BARKS, NAGATHA_BARKS } from '../src/game/data/barks';
import { SYSTEM_IDS } from '../src/game/types';
import { WEAPONS } from '../src/game/data/ships';
import { newRun, chooseEventOption, availableChoices, dismissResult } from '../src/game/run';

describe('event data', () => {
  it('has around 25+ events with unique ids', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });

  it('every event has 2-3 choices, each with outcomes, and at least one unconditional choice', () => {
    for (const e of EVENTS) {
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.choices.length, e.id).toBeLessThanOrEqual(4);
      expect(e.intro.length, e.id).toBeGreaterThan(0);
      expect(e.choices.some((c) => !c.requires), `${e.id} needs a fallback choice`).toBe(true);
      for (const c of e.choices) {
        expect(c.outcomes.length, `${e.id}/${c.label}`).toBeGreaterThan(0);
        for (const o of c.outcomes) {
          expect(o.lines.length).toBeGreaterThan(0);
          if (o.upgradeSystem) expect(SYSTEM_IDS).toContain(o.upgradeSystem);
          if (o.weapon) expect(Object.keys(WEAPONS)).toContain(o.weapon);
        }
      }
    }
  });

  it('most events have real consequences', () => {
    const withEffects = EVENTS.filter((e) => e.choices.some((c) => c.outcomes.some((o) => o.effects && Object.keys(o.effects).length)));
    expect(withEffects.length).toBe(EVENTS.length);
  });

  it('many events feature Skippy', () => {
    const skippy = EVENTS.filter((e) => [...e.intro, ...e.choices.flatMap((c) => c.outcomes.flatMap((o) => o.lines))].some((l) => l.speaker === 'skippy'));
    expect(skippy.length).toBeGreaterThanOrEqual(15);
  });

  it('sector ranges are valid and every sector has events', () => {
    for (let s = 1; s <= 6; s++) {
      expect(EVENTS.filter((e) => (e.minSector ?? 1) <= s && (e.maxSector ?? 6) >= s).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('barks exist for all keys', () => {
    for (const [k, lines] of Object.entries(BARKS)) expect(lines.length, k).toBeGreaterThan(0);
    expect(NAGATHA_BARKS.length).toBeGreaterThan(0);
  });
});

describe('event resolution in a run', () => {
  it('applies outcome effects and returns to the map or a fight', () => {
    for (const ev of EVENTS) {
      for (let ci = 0; ci < ev.choices.length; ci++) {
        const run = newRun(77);
        run.res.scrap = 100; run.res.mood = 80; run.res.missiles = 5; run.res.fuel = 5; run.res.crew = 8;
        run.phase = 'event';
        run.eventId = ev.id;
        expect(availableChoices(run)[ci]).toBe(true);
        const panel = chooseEventOption(run, ci);
        expect(panel).not.toBeNull();
        expect(['result', 'lost']).toContain(run.phase);
        dismissResult(run);
        expect(['map', 'combat', 'lost']).toContain(run.phase);
      }
    }
  });

  it('refuses choices whose requirements are not met', () => {
    const ev = EVENTS.find((e) => e.choices.some((c) => c.requires?.scrap));
    if (!ev) return;
    const idx = ev.choices.findIndex((c) => c.requires?.scrap);
    const run = newRun(1);
    run.res.scrap = 0;
    run.phase = 'event';
    run.eventId = ev.id;
    expect(availableChoices(run)[idx]).toBe(false);
    expect(chooseEventOption(run, idx)).toBeNull();
  });
});
