# Decisions

The brief said "you decide everything". This file records each choice and the reason for it.

## Tech

- **Vite + TypeScript, DOM UI + plain Canvas, no Phaser.** The game is mostly menus, panels,
  bars and dialog, which HTML/CSS handles well and scales crisply. Canvas covers the parts that
  animate every frame: the starfield and the combat scene (ships, shields, projectiles,
  explosions). This keeps the bundle small (~55 KB gzipped JS) and avoids a framework.
- **Fixed 1280×720 logical stage scaled with a CSS transform.** It letterboxes cleanly from
  1280×720 up to 1920×1080 and beyond. Every layout coordinate is fixed, so screens can't reflow.
- **Pure logic in `src/game/`, rendering in `src/ui/` and `src/art/`.** The UI reads the
  `RunState` / `CombatState` objects and calls pure functions. Everything in `src/game` runs
  in Node, which is what makes the unit tests and the quick-sim possible.
- **Seeded RNG (mulberry32) whose state lives inside the run.** Saving and loading is
  deterministic, and a typed seed reproduces a run. Seeds can be text (hashed with FNV-1a) or
  numbers.
- **Input uses `pointerdown` with event delegation (`data-act`).** The combat panel
  re-renders about 8 times a second; `click` needs press and release on the same element and
  would sometimes be lost.
- **Saves**: one autosave slot in `localStorage`, written after every state change and
  cleared when a run ends. A save made mid-combat restores to the start of that fight. This is
  a deliberate simplification: combat state isn't serialised, so reloading can restart a
  fight. That's acceptable for a single-player fan game.
- **Sound**: small WebAudio synth (no audio files), with a mute toggle remembered in
  `localStorage`.

## Game design

- **Map**: each sector has 3–4 middle columns of 2–3 beacons, plus start and exit, for 8–12
  nodes. Edges join consecutive columns by relative rank (so lines rarely cross), with extra
  branches and occasional links inside a column. Every node gets a forward edge and every
  node has an incoming edge, so the map is always connected. Tests check this over thousands
  of seeds. Each sector has at least 1 shipyard, 3 hostiles and 2 events.
- **Movement is undirected.** You can backtrack, but backtracking costs fuel and alert, and
  the pursuit keeps coming.
- **Alien Alert as the run-level clock.** Each jump adds +2% (+3% from sector 4). Pursuit
  fights add +3%, siphoning fuel adds +6%, events can move it either way, and each new sector
  removes 4%. **At 100% the run is lost**, which ties the loss condition to the brief's goal
  ("before the aliens learn humans have a starship"). In the simulations, final alert averages
  about 40%: a real threat for players who wander or siphon, not a timer that kills careful
  play.
- **Pursuit front**, like FTL's rebel fleet. It starts left of the first column and advances
  0.7 columns per jump (0.9 once alert is 50%+). Beacons behind it are overrun, and entering
  one triggers a pursuit fight: Kristang in sectors 1–2, Thuranin in 3–4, a Maxolhx hunter in
  5–6. The exit is never overrun.
- **Out of fuel never soft-locks**: "Siphon fuel" always gives 2 fuel, at the cost of alert,
  pursuit progress and Skippy mood. If Skippy is sulking, Nagatha does it instead.
- **Skippy Mood** is a resource you spend:
  - *Hack Shields* (50+, costs 10, once per fight): enemy shields drop to 0 and stay down for
    14 s (10 s against the relay).
  - *Stealth Field* (60+, costs 12, on the map): the next jump raises no alert, doesn't
    advance the pursuit, and has a 50% chance to slip past a hostile or pursuit encounter.
  - *Fake Wormhole* (70+, costs 18): an instant escape from any fight except the relay, or a
    free, silent jump up to 2 beacons away on the map.
  - 75+: Skippy helps with targeting (-10% enemy evasion) and the jump drive (+15%).
  - Below 25, sulking: unvisited beacons show as "?", the jump drive charges 40% slower, every
    ability is refused, and Nagatha speaks for the ship instead.
  - Mood goes up from praise choices, wins (+3), show-tune data crystals (+20) and beating a
    Maxolhx (+20). It goes down from being ignored, chores, fleeing, and slow boredom drift on
    long trips.
- **The ship stealth system vs Skippy's stealth.** The brief lists both a ship system and a
  Skippy ability, so they do different things. The ship's *stealth field* is a combat system:
  you power and activate it, enemy shots miss for 5.5–10.5 s, then it has a 20 s cooldown.
  Skippy's *Stealth Field* works on the map, as described above.
- **Combat model** (simplified FTL):
  - Reactor power goes to shields (1 layer per 2 power), weapons (each weapon needs its own
    power), engines (6% evasion per power), stealth, and the jump drive.
  - Up to 2 crew per system. Crew speed the system up and repair it. Nagatha slowly repairs
    the most damaged system on her own.
  - Hits damage the hull and the targeted system, and can kill crew stationed there. When a
    system is repaired, power comes back to what you had set.
  - **Volley fire mode** (the default) holds shield-stripping guns until all of them are
    charged, then fires together. Missiles ignore shields and fire as soon as they're ready.
    Balance testing showed independent fire can never get through 2-layer shields, so syncing
    volleys is the main tactical lever, as in FTL.
  - **Ways to win**: destroy the enemy, or keep its weapons fully disabled for 4 s so it
    surrenders. Surrender pays 40% more scrap plus fuel and missiles. Maxolhx ships and the
    relay never surrender.
  - **Escape** by charging the jump drive (it takes about 20–30 s) or with Skippy's fake
    wormhole.
- **Enemies**:
  - Kristang: crude and brutal, heavy masers, weak shields, more hull.
  - Thuranin: 2-layer shields, maser batteries, more evasion, later railguns.
  - Maxolhx hunter: 45 hull, 3 shield layers, railgun plus battery. It's tuned to be
    near-unbeatable, and the bot wins well under 5% of these fights.
  - Enemy gunnery speeds up by sector (charge rate 0.60× in sector 1 to 0.80× in sector 6) on
    top of better loadouts.
- **Final boss: the relay station.** 40 hull, 2 shield layers, battery + heavy maser +
  missiles, and no escape (jumping and the fake wormhole are both disabled). It runs an
  **uplink transmission** meter. If the meter reaches 100% the run is lost; damaging the
  relay's uplink (its "jump" system slot) slows it down. This gives the boss fight a target
  priority puzzle instead of only being a big health bar.
- **Economy**: combat pays 16 + 5×sector + 0–10 scrap. Shipyards always offer every system
  upgrade, a reactor coupling, a hull reinforcement (+5 max hull), consumables, a show-tune
  crystal and one random weapon. Prices rise 4% per sector.
- **Starting ship**: 30 hull, reactor 9, shields 2, weapons 3, engines 2, stealth 1, jump 2,
  armed with a Maser Battery (3 shots) and a Missile Launcher. The 3-shot battery is what
  lets the start get through one shield layer.
- **Map visibility**: beacon types are visible while Skippy is willing to scan, which is part
  of the mood mechanic. FTL hides them; here the mood penalty does that job.

## Balance process

- I tuned balance with the auto-player (`npm run balance`), recording hull lost per fight by
  sector and faction. Significant fixes:
  - Enemy charge-rate scaling. Sector-1 fights were costing half the hull.
  - Starting with the 3-shot Maser Battery.
  - Volley mode.
  - Restoring power after repairs. Its absence caused death spirals of 20–30 hull from a
    single early fight.
  - Denser combat maps and full shipyards.
  - Hull reinforcements.
- Final numbers over 300 seeds:
  - The simple bot wins **13%** of runs and reaches sector 5 on average.
  - Typical fights take 25–60 s.
  - A winning run is estimated at about **19 minutes**, counting combat at 1× with no pausing
    plus about 30 s per event or shop. Human players pause and read, which puts a real run at
    roughly 20–30 minutes.
  - The bot never uses pause, timing or system targeting beyond simple rules, so a thoughtful
    human should win much more often. That fits a FTL-like "normal" difficulty.
- `tests/sim.test.ts` asserts:
  - Runs always terminate.
  - Some seeded runs are won.
  - Wins really reach sector 6 and take more than 20 jumps.
  - Every sector connects start to exit, and the boss sits at the sector-6 exit.

## Content and IP

- **All dialogue is original.** Two writing passes: 28 events (2–4 choices each, weighted
  outcomes) and around 110 Skippy and Nagatha barks. No book text is quoted or closely paraphrased, and no
  song lyrics appear (Skippy's show tunes are referred to, never quoted). The recurring jokes
  the brief asked for ("filthy monkeys", "I am awesome", mocking Joe's plans) are used as
  short catchphrases.
- **All art is original, procedural SVG** generated in code. The ships are new designs:
  - The Dutchman: patched, asymmetric, docking arms.
  - Kristang: slab armour, spikes, big guns.
  - Thuranin: sleek green-grey teardrops.
  - Maxolhx: black daggers with violet seams.
  - The relay: a Thuranin hub with Kristang plates bolted on.

  Skippy is an original design: a plain shiny cylinder (no label or branding) with an
  abstract holographic glyph face. I deliberately left out costume elements such as hats.
  Crew portraits are abstract silhouettes, not likenesses.
- The fan-project disclaimer appears on the title screen and in the README.

## Repo and deploy

- **Originally private, now public.** The repo first went up as a private repository with no
  deploy: GitHub Pages on a private repo needs a paid plan, and no other host was set up.
  Bartłomiej later asked for the game to be public, so the repo was switched to public and
  deployed to GitHub Pages: https://beardless.github.io/merry-band-of-pirates/
- **Pre-publication audit.** Before the visibility change:
  - Every tracked file and the whole history (one commit at that point) were scanned for
    secrets: token prefixes, private keys, `.env`/credential files, `settings.local`.
    Nothing was found. The only pattern hit was the word "password" in a line of Skippy
    dialogue.
  - Tracked files were checked for personal data such as local filesystem paths or email
    addresses. None were found.
  - The commit author email was compared (without printing it) to the email on the
    account's public GitHub profile. They match, so making history public exposes nothing
    new. That matters because history could not be rewritten anyway: force-push and rebase
    were ruled out.
- **Base path.** Production builds use `base: '/merry-band-of-pirates/'`, because a Pages
  project site lives under the repo-name sub-path. Dev (`vite` serve) keeps `/`, so local
  development doesn't change. A `BASE_PATH` env var overrides the build base (for example
  `./`), so the build can be hosted elsewhere. Earlier builds used `./` everywhere; an
  explicit absolute base is the conventional, unambiguous choice for Pages.
  `@types/node` was added because `vite.config.ts` now reads `process.env` and is
  type-checked by `npm run build`.
- **Workflow** (`.github/workflows/deploy.yml`):
  - Runs on pushes to `main` and on manual dispatch.
  - The build job runs `npm ci`, lint, tests and build before uploading `dist/`, so a broken
    commit never reaches the live site.
  - The deploy job uses `actions/deploy-pages` in the `github-pages` environment, with the
    minimal permissions `contents: read`, `pages: write` and `id-token: write`.
  - Concurrency group `pages`, without cancelling an in-flight deploy.
  - Action versions are pinned to the current major releases at setup time: checkout v7,
    setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5.
  - Node 22, matching local development.
- **Pages source = GitHub Actions** (`build_type: workflow`), set through the REST API, so no
  `gh-pages` branch is needed.
- **Disclaimer.** The fan-project disclaimer stays on the title screen and at the top of the
  README. The repo description also says the project is unofficial and non-commercial.
