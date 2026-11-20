import { applyDelta, canUseAbility, describeDelta, meetsRequirements, moodBand, START_RESOURCES, MAX_FUEL } from '../src/game/resources';

describe('resources', () => {
  it('clamps values to legal ranges and reports what was applied', () => {
    const r = { ...START_RESOURCES, hull: 28, mood: 95 };
    const applied = applyDelta(r, { hull: 10, mood: 20, scrap: -1000, fuel: 100 });
    expect(r.hull).toBe(r.maxHull);
    expect(r.mood).toBe(100);
    expect(r.scrap).toBe(0);
    expect(r.fuel).toBe(MAX_FUEL);
    expect(applied.hull).toBe(2);
    expect(applied.mood).toBe(5);
  });

  it('alert is clamped to 0-100', () => {
    const r = { ...START_RESOURCES };
    applyDelta(r, { alert: -10 });
    expect(r.alert).toBe(0);
    applyDelta(r, { alert: 250 });
    expect(r.alert).toBe(100);
  });

  it('checks requirements', () => {
    const r = { ...START_RESOURCES, scrap: 10, mood: 60 };
    expect(meetsRequirements(r, { scrap: 10 })).toBe(true);
    expect(meetsRequirements(r, { scrap: 11 })).toBe(false);
    expect(meetsRequirements(r, { mood: 50, scrap: 5 })).toBe(true);
    expect(meetsRequirements(r, undefined)).toBe(true);
  });

  it('maps mood to bands and gates abilities', () => {
    expect(moodBand(90)).toBe('gleeful');
    expect(moodBand(60)).toBe('pleased');
    expect(moodBand(30)).toBe('annoyed');
    expect(moodBand(10)).toBe('sulking');
    expect(canUseAbility(49, 'hack')).toBe(false);
    expect(canUseAbility(50, 'hack')).toBe(true);
    expect(canUseAbility(69, 'fake')).toBe(false);
    expect(canUseAbility(70, 'fake')).toBe(true);
  });

  it('describes deltas', () => {
    expect(describeDelta({ scrap: 5, alert: -2 })).toEqual(['Scrap +5', 'Alien Alert -2']);
  });
});
