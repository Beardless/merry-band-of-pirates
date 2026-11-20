# Merry Band of Pirates

An FTL-style roguelite set in Craig Alanson's *Expeditionary Force* universe. You captain the
stolen, battered Thuranin star carrier **Flying Dutchman**, with Skippy the Magnificent
aboard. Cross 6 sectors of the wormhole network and destroy a Kristang/Thuranin comms relay
before the aliens learn that humans have a starship.

> **Fan-project disclaimer.** This is an unofficial, non-commercial fan project.
> *Expeditionary Force* and its characters belong to Craig Alanson. This project is not
> affiliated with or endorsed by the author or publishers. All code, art and dialogue here are
> original fan work: no text from the books is reproduced, and all graphics are drawn
> procedurally in code.

## Play it

**Live: https://beardless.github.io/merry-band-of-pirates/** (static site on GitHub Pages,
deployed automatically from `main`; best on a laptop or desktop at 1280×720 or larger).

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Static build (no backend; saves go to `localStorage`):

```bash
npm run build      # outputs dist/
npm run preview    # serve the built files locally
```

Production builds use the GitHub Pages base path `/merry-band-of-pirates/` (see
`vite.config.ts`); `npm run dev` serves from `/` as usual. To host the build somewhere else,
override the base: `BASE_PATH=./ npm run build` produces relative asset paths that work from
any folder.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci`, lint, tests, build,
then publishes `dist/` with `actions/configure-pages`, `actions/upload-pages-artifact` and
`actions/deploy-pages`. Pages is configured with **GitHub Actions** as its source.

## Test and check

```bash
npm run lint       # ESLint (typescript-eslint)
npm test           # Vitest unit tests: combat, map/jumps, events, resources, shop, saves, quick-sim
npm run sim        # only the quick-sim tests (full seeded runs played by a bot)
npm run balance    # balance report: simulates 200 seeded runs (npm run balance -- 500)
```

The quick-sim (`src/game/sim.ts`) is an auto-player that plays whole runs through the same
pure game logic the UI uses. The tests use it to check that runs always end in a win or a
loss (no soft-locks) and that the game can be won. They also check that every sector map
connects the start to the exit and that the relay boss is reachable.

## Controls

**Starmap**
- Click a highlighted beacon to jump (costs 1 fuel and raises the Alien Alert).
- *Stealth Field* / *Fake Wormhole* buttons use Skippy's tricks (they need enough mood).
- `1`–`4` pick event choices, `Enter` continues, `Esc` closes dialogs and leaves shops.

**Combat** (real time with pause)
| Key | Action |
| --- | --- |
| `Space` | Pause / resume |
| `1`–`4` | Toggle weapon power |
| `V` | Cycle fire mode (Volley / As ready / Hold) |
| `F` | Fire all charged weapons now |
| `S` | Activate the ship's stealth field |
| `H` | Skippy: hack enemy shields |
| `G` | Skippy: fake wormhole (instant escape) |
| `J` | Jump away (once the jump drive is charged) |

Mouse: use `+`/`−` to route reactor power and station crew. Click a weapon card, then click a
system on the enemy ship to target it. Clicking an enemy system with no card selected
retargets every weapon.

Debug: append `?speed=4` to the URL to run combat 4× faster. The automated playtests use this.

## How a run works

- **6 sectors**, each a node map of 8–12 beacons with branching paths: events, hostiles,
  shipyards, empty space, and the exit. In sector 6 the exit is the **relay** (final boss).
- **Alien Alert** rises with every jump; at 100% the run is lost. A **pursuit fleet** sweeps
  across each sector, and beacons behind its front hold dangerous pursuit ships.
- **Resources**: hull, fuel, missiles, scrap, crew and **Skippy Mood** (0–100). High mood
  unlocks *Hack Shields* (50+), *Stealth Field* (60+) and *Fake Wormhole* (70+). Below 25
  Skippy sulks: no beacon scans, a slower jump drive, and no help.
- **Enemies** scale by sector: brutal Kristang warships, high-tech Thuranin, and in the late
  sectors the near-unbeatable **Maxolhx hunter** (run!).
- A full run takes roughly 20–30 minutes.

## Project layout

```
src/game/        pure TypeScript game logic (no DOM): unit tested
  rng.ts         seeded PRNG (mulberry32), state saved in the run
  types.ts       shared types
  map.ts         sector generation, connectivity, pursuit
  combat.ts      real-time combat simulation
  run.ts         run state machine: jumps, encounters, events, rewards, abilities
  shop.ts        shipyard stock and purchases
  resources.ts   resource clamping, mood bands, ability thresholds
  save.ts        localStorage (de)serialisation
  sim.ts         headless auto-player used by tests and the balance script
  data/          events (28), Skippy barks, weapons and enemy templates
src/art/         procedural SVG sprites (ships, Skippy, portraits, icons)
src/ui/          DOM screens, combat canvas view, starfield, WebAudio SFX
tests/           Vitest suites
scripts/         balance report
```

See [DECISIONS.md](DECISIONS.md) for design and technical decisions.
