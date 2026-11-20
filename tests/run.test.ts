import {
  newRun, jumpTo, jumpTargets, canJumpTo, leaveSector, atExit, emergencySiphon, armStealth, fakeWormholeJump,
  fakeWormholeTargets, startCombat, finishCombat, dismissResult, checkLoss, alertGainPerJump, buyItem, openShop,
} from '../src/game/run';
import { hopDistances } from '../src/game/map';

describe('run: jumping and the map', () => {
  it('starts at sector 1 on the start node with sane resources', () => {
    const run = newRun(1);
    expect(run.sector).toBe(1);
    expect(run.current).toBe(run.map.startId);
    expect(run.phase).toBe('map');
    expect(run.res.fuel).toBeGreaterThan(0);
  });

  it('a jump costs fuel, raises the alert and advances the pursuit', () => {
    const run = newRun(2);
    const target = jumpTargets(run)[0];
    const fuel = run.res.fuel;
    const pursuit = run.map.pursuit;
    expect(jumpTo(run, target)).toBe(true);
    expect(run.res.fuel).toBe(fuel - 1);
    expect(run.res.alert).toBe(alertGainPerJump({ ...run, sector: 1 }));
    expect(run.map.pursuit).toBeGreaterThan(pursuit);
    expect(run.stats.jumps).toBe(1);
  });

  it('cannot jump to non-adjacent nodes or without fuel', () => {
    const run = newRun(3);
    const far = run.map.exitId;
    expect(canJumpTo(run, far)).toBe(false);
    expect(jumpTo(run, far)).toBe(false);
    run.res.fuel = 0;
    expect(canJumpTo(run, jumpTargets(run)[0])).toBe(false);
  });

  it('out of fuel: emergency siphon never soft-locks', () => {
    const run = newRun(4);
    run.res.fuel = 0;
    const panel = emergencySiphon(run);
    expect(panel).not.toBeNull();
    expect(run.res.fuel).toBe(2);
    expect(run.res.alert).toBeGreaterThan(0);
  });

  it('entering an overrun node triggers a pursuit fight', () => {
    const run = newRun(5);
    const target = jumpTargets(run)[0];
    run.map.pursuit = 10;
    jumpTo(run, target);
    expect(run.phase).toBe('combat');
    expect(run.pendingCombat?.pursuit).toBe(true);
  });

  it('stealth field: next jump raises no alert', () => {
    const run = newRun(6);
    run.res.mood = 80;
    expect(armStealth(run)).toBe(true);
    expect(run.res.mood).toBeLessThan(80);
    jumpTo(run, jumpTargets(run)[0]);
    expect(run.res.alert).toBe(0);
  });

  it('Skippy refuses abilities when sulking', () => {
    const run = newRun(6);
    run.res.mood = 20;
    expect(armStealth(run)).toBe(false);
    const t = fakeWormholeTargets(run)[0];
    expect(fakeWormholeJump(run, t)).toBe(false);
  });

  it('fake wormhole jumps up to two hops for free', () => {
    const run = newRun(7);
    run.res.mood = 90;
    const d = hopDistances(run.map, run.current);
    const two = fakeWormholeTargets(run).find((id) => d[id] === 2)!;
    const fuel = run.res.fuel;
    expect(fakeWormholeJump(run, two)).toBe(true);
    expect(run.res.fuel).toBe(fuel);
    expect(run.res.alert).toBe(0);
  });

  it('leaving a sector builds the next map and lowers the alert', () => {
    const run = newRun(8);
    run.current = run.map.exitId;
    run.res.alert = 20;
    expect(atExit(run)).toBe(true);
    expect(leaveSector(run)).toBe(true);
    expect(run.sector).toBe(2);
    expect(run.res.alert).toBe(16);
    expect(run.current).toBe(run.map.startId);
  });

  it('loses at 100 alert, 0 hull or 0 crew', () => {
    for (const patch of [{ alert: 100 }, { hull: 0 }, { crew: 0 }]) {
      const run = newRun(9);
      Object.assign(run.res, patch);
      expect(checkLoss(run)).toBe(true);
      expect(run.phase).toBe('lost');
      expect(run.lossReason).toBeTruthy();
    }
  });
});

describe('run: combat integration', () => {
  it('a won fight pays out scrap and returns via a result panel', () => {
    const run = newRun(10);
    run.phase = 'combat';
    run.pendingCombat = { faction: 'kristang', isBoss: false, pursuit: false };
    const c = startCombat(run)!;
    c.enemy.hull = 0;
    c.outcome = 'destroyed';
    const scrap = run.res.scrap;
    finishCombat(run, c);
    expect(run.res.scrap).toBeGreaterThan(scrap);
    expect(run.stats.shipsDestroyed).toBe(1);
    expect(run.phase).toBe('result');
    dismissResult(run);
    expect(run.phase).toBe('map');
  });

  it('destroying the relay wins the run; its transmission loses it', () => {
    const win = newRun(11);
    win.phase = 'combat';
    win.pendingCombat = { faction: 'relay', isBoss: true, pursuit: false };
    const c = startCombat(win)!;
    expect(c.canFlee).toBe(false);
    c.outcome = 'destroyed';
    finishCombat(win, c);
    expect(win.phase).toBe('won');

    const lose = newRun(12);
    lose.phase = 'combat';
    lose.pendingCombat = { faction: 'relay', isBoss: true, pursuit: false };
    const c2 = startCombat(lose)!;
    c2.outcome = 'transmitted';
    finishCombat(lose, c2);
    expect(lose.phase).toBe('lost');
  });

  it('fight damage and missile use carry over to the run', () => {
    const run = newRun(13);
    run.phase = 'combat';
    run.pendingCombat = { faction: 'kristang', isBoss: false, pursuit: false };
    const c = startCombat(run)!;
    c.player.hull = 12;
    c.missiles = 2;
    c.outcome = 'fled';
    finishCombat(run, c);
    expect(run.res.hull).toBe(12);
    expect(run.res.missiles).toBe(2);
  });
});

describe('run: shops', () => {
  it('buys items, spends scrap and keeps stock on revisit', () => {
    const run = newRun(14);
    const shopNode = run.map.nodes.find((n) => n.type === 'shop')!;
    // Teleport for the test: pretend we just arrived.
    run.current = shopNode.id;
    shopNode.visited = false;
    run.phase = 'map';
    run.res.fuel = 5;
    // emulate entering the node
    run.shops[shopNode.id] = undefined as never;
    delete run.shops[shopNode.id];
    run.phase = 'map';
    // enter through a jump from a neighbour
    const from = run.map.edges.find(([a, b]) => a === shopNode.id || b === shopNode.id)!;
    run.current = from[0] === shopNode.id ? from[1] : from[0];
    run.map.pursuit = -5;
    jumpTo(run, shopNode.id);
    expect(run.phase).toBe('shop');
    run.res.scrap = 100;
    run.res.hull = 10;
    expect(buyItem(run, 'repair')).toBe(true);
    expect(run.res.hull).toBe(14);
    expect(run.res.scrap).toBeLessThan(100);
    expect(buyItem(run, 'sys-shields')).toBe(true);
    expect(run.loadout.systems.shields).toBe(3);
    run.phase = 'map';
    expect(openShop(run)).toBe(true);
    expect(run.shop).toBe(run.shops[shopNode.id]);
  });

  it('cannot buy without scrap', () => {
    const run = newRun(15);
    run.phase = 'shop';
    run.shop = [{ id: 'fuel', kind: 'fuel', label: 'Fuel', description: '', cost: 3 }];
    run.res.scrap = 0;
    expect(buyItem(run, 'fuel')).toBe(false);
  });
});
