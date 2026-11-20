import { newRun, jumpTo, jumpTargets } from '../src/game/run';
import { serializeRun, deserializeRun } from '../src/game/save';

describe('save / load', () => {
  it('round-trips a run, including the RNG state', () => {
    const run = newRun(99);
    jumpTo(run, jumpTargets(run)[0]);
    const json = serializeRun(run);
    const back = deserializeRun(json)!;
    expect(back).toEqual(run);
  });

  it('rejects garbage and wrong versions', () => {
    expect(deserializeRun('not json')).toBeNull();
    expect(deserializeRun(JSON.stringify({ version: -1 }))).toBeNull();
  });
});
