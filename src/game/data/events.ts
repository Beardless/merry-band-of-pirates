// Narrative events. All dialogue is original fan writing.
import type { DialogueLine, GameEvent } from '../types';

const sk = (text: string): DialogueLine => ({ speaker: 'skippy', text });
const jo = (text: string): DialogueLine => ({ speaker: 'joe', text });
const ad = (text: string): DialogueLine => ({ speaker: 'adams', text });
const si = (text: string): DialogueLine => ({ speaker: 'simms', text });
const sm = (text: string): DialogueLine => ({ speaker: 'smythe', text });
const na = (text: string): DialogueLine => ({ speaker: 'nagatha', text });
const nr = (text: string): DialogueLine => ({ speaker: 'narrator', text });
const al = (text: string): DialogueLine => ({ speaker: 'alien', text });

export const EVENTS: GameEvent[] = [
  // ------------------------------------------------------------ Kristang (1-3)
  {
    id: 'derelict-kristang-frigate',
    title: 'Dead in the Water',
    minSector: 1,
    maxSector: 3,
    intro: [
      nr("A Kristang frigate tumbles end over end, reactor cold, hull scorched by what looks like a clan feud."),
      sk("Ooh, a floating junkyard. Kristang engineering: held together with spite and duct tape. Mostly spite."),
      ad("Could be crawling with survivors, sir. Or booby traps. With lizards, it's usually both."),
    ],
    choices: [
      {
        label: 'Send a boarding party',
        requires: { crew: 3 },
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("The team sweeps the ship deck by deck. The armory is half full and nobody is home."),
              ad("Missiles, spare plating, and a calendar of very ugly pin-ups. We're taking two of the three."),
            ],
            effects: { scrap: 20, missiles: 2 },
          },
          {
            weight: 2,
            lines: [
              nr("A tripwire in the cargo bay sets off a charge. The team limps back carrying a wounded Marine."),
              sk("A booby trap. Left by lizards, for monkeys. Honestly, it is like watching nature documentaries."),
            ],
            effects: { scrap: 8, crew: -1, hull: -2 },
          },
        ],
      },
      {
        label: 'Ask Skippy to remotely scan every compartment',
        outcomes: [
          {
            lines: [
              sk("You want me to inventory a Kristang garbage scow? Item by item? Fine. Socks. Socks. Bone. More socks."),
              sk("Three hours of my magnificent life I will never get back. There's some salvage near the hull. Grab it and go."),
            ],
            effects: { scrap: 12, mood: -8 },
          },
        ],
      },
      {
        label: 'Leave it alone',
        outcomes: [
          {
            lines: [
              jo("Not worth the risk. Let the lizards bury their own."),
              sk("Wise. For a monkey. I'll make a note in your file: 'Showed restraint, once.'"),
            ],
            effects: { mood: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'clan-squabble',
    title: 'Family Feud',
    minSector: 1,
    maxSector: 3,
    intro: [
      nr("Two Kristang clan warships are trading insults, and occasionally missiles, above a gas giant."),
      sk("Listen to them! 'Your mother was a tree-sloth.' 'Your mother hatched in a gutter.' Poetry, really."),
      jo("Skippy, can they see us?"),
      sk("Not yet. They're far too busy being idiots. It's their greatest strength."),
    ],
    choices: [
      {
        label: 'Have Skippy fake insults from each side to the other',
        requires: { mood: 50 },
        outcomes: [
          {
            weight: 3,
            lines: [
              sk("Oh, this is my favorite kind of work. Sending: 'Your clan leader's tail is shorter than a Ruhar's.'"),
              nr("Both ships open fire with everything they have. When the smoke clears, there's salvage everywhere."),
              sk("I am awesome. Admit it. Say it out loud so the recorders pick it up."),
            ],
            effects: { scrap: 25, mood: 10, alert: -2 },
          },
          {
            weight: 1,
            lines: [
              nr("The insults work too well. One ship flees, the other notices the shimmer of your stealth field."),
              sk("In my defense, it was a really good insult."),
            ],
            effects: { alert: 4 },
            combat: 'kristang',
          },
        ],
      },
      {
        label: 'Wait for them to finish, then pick through the wreckage',
        outcomes: [
          {
            weight: 2,
            lines: [
              nr("Hours later, one ship limps away. You pick through the debris field like a seagull at a picnic."),
              si("Decent haul, sir. It'll keep the fabricators busy."),
            ],
            effects: { scrap: 15, fuel: -1 },
          },
          {
            weight: 1,
            lines: [
              nr("The 'winner' circles back to loot the wreckage too. You take a few parting shots on the way out."),
              ad("Should've just left, sir."),
            ],
            effects: { hull: -4, alert: 3 },
          },
        ],
      },
      {
        label: 'Sneak past quietly',
        outcomes: [
          {
            lines: [
              nr("The Dutchman slips by on minimum power, leaving the lizards to their screaming match."),
              sk("Boring. Effective, but boring."),
            ],
            effects: { mood: -3, alert: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'distress-call-kristang',
    title: 'Mayday, Maybe',
    minSector: 1,
    maxSector: 3,
    intro: [
      nr("A weak distress beacon pulses from a Kristang transport. The signal claims engine failure and dying crew."),
      sk("Ninety percent chance this is a trap. Ten percent chance it's an incompetent trap."),
      na("If there are truly injured aboard, dear, it seems unkind to simply ignore them."),
    ],
    choices: [
      {
        label: 'Answer the call',
        outcomes: [
          {
            weight: 2,
            lines: [
              nr("The transport's 'dying crew' powers up four hidden gun turrets the moment you close in."),
              sk("Called it! I called it! Somebody write down that I called it!"),
            ],
            combat: 'kristang',
          },
          {
            weight: 1,
            lines: [
              nr("It's genuine. The crew are enslaved laborers abandoned by their masters. They trade spare parts for air."),
              na("Oh, how lovely. They said thank you. Well, they made a noise that I've chosen to interpret as thank you."),
            ],
            effects: { scrap: 20, fuel: 1, mood: -3 },
          },
        ],
      },
      {
        label: 'Have Skippy scan it first',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Scanning... yep, weapons hot, troops in the cargo bay. And their trap's cloaking field is installed upside down."),
              sk("I've drained their capacitors. Go take whatever you want. They can't even turn the lights on."),
            ],
            effects: { scrap: 18, missiles: 1, mood: 5 },
          },
        ],
      },
      {
        label: 'Ignore it',
        outcomes: [
          {
            lines: [
              jo("We're not here to play hero. Not today."),
              na("I understand, Colonel. I shall simply feel a little sad about it, quietly."),
            ],
            effects: { mood: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'kristang-warlord-deal',
    title: 'The Warlord Calls',
    minSector: 1,
    maxSector: 3,
    intro: [
      al("Thuranin vessel! I am Warlord Grath of the Iron Fang. I require missiles. You will sell, or you will regret."),
      sk("He thinks we're Thuranin. He's threatening a star carrier with a frigate. I love this guy."),
      jo("Skippy, can you make me sound like a cranky little green cyborg?"),
    ],
    choices: [
      {
        label: 'Bluff: demand tribute instead',
        outcomes: [
          {
            weight: 2,
            lines: [
              jo("Insolent lizard. Pay tribute for daring to address us, or we'll turn your ship into a lawn ornament."),
              al("...Tribute is sent. The Iron Fang begs forgiveness. Please do not tell the other clans about this."),
              sk("A lawn ornament? That's what you went with? And it worked. The universe is broken."),
            ],
            effects: { scrap: 25, fuel: 1 },
          },
          {
            weight: 1,
            lines: [
              al("Thuranin do not use the word 'lawn'. Who are you?"),
              sk("Okay, that one's on you, Joe. I would have said 'decorative fragment'."),
              nr("The Warlord cuts the channel and starts telling every clan in range about the weird 'Thuranin'."),
            ],
            effects: { alert: 7 },
          },
        ],
      },
      {
        label: 'Sell him missiles at a markup',
        requires: { missiles: 2 },
        outcomes: [
          {
            lines: [
              nr("Two missiles change hands. Skippy quietly reprograms them to fail if ever aimed at the Dutchman."),
              sk("Ha! He paid double. Also they'll play an opera overture before detonating. My little gift to him."),
            ],
            effects: { missiles: -2, scrap: 30, mood: 5 },
          },
        ],
      },
      {
        label: 'Cut the channel',
        outcomes: [
          {
            lines: [
              nr("The Warlord's furious shouting cuts off mid-threat. He sends a few angry messages to his clan."),
              si("He'll be telling everyone about a rude Thuranin ship, sir. Not ideal."),
            ],
            effects: { alert: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'comet-fuel',
    title: 'Dirty Snowball',
    minSector: 1,
    maxSector: 4,
    intro: [
      nr("A fat comet drifts through an empty system, rich in frozen hydrogen."),
      si("Sir, we could crack that for fuel. It'd take hours of fiddly work to run the processors."),
      sk("Do NOT look at me. I am an Elder-grade intelligence, not a gas station attendant."),
    ],
    choices: [
      {
        label: 'Make Skippy run the refinery',
        outcomes: [
          {
            lines: [
              sk("Fine. Fine! I'll pump the gas. Would you like me to check your oil, too? Clean the windshield?"),
              nr("Skippy refines the comet with insulting speed and sulks loudly for the rest of the shift."),
            ],
            effects: { fuel: 3, mood: -12 },
          },
        ],
      },
      {
        label: 'Have the crew do it by hand',
        requires: { crew: 3 },
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("Simms organizes shifts. It's cold, slow work, but the tanks fill steadily."),
              ad("My fingers are icicles. Skippy, if you say one word..."),
              sk("I wasn't going to say anything. I was going to sing."),
            ],
            effects: { fuel: 2 },
          },
          {
            weight: 1,
            lines: [
              nr("A chunk of comet shears loose and slams the hull. A crewman's suit is breached; he doesn't make it back."),
            ],
            effects: { fuel: 1, crew: -1, hull: -3 },
          },
        ],
      },
      {
        label: 'Move on',
        outcomes: [
          {
            lines: [jo("We've got places to be. Let's keep going."), sk("The first sensible thing you've said all week.")],
            effects: { mood: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'pirate-salvage',
    title: 'Pirate Graveyard',
    minSector: 1,
    maxSector: 4,
    intro: [
      nr("A half-dozen gutted pirate ships orbit a dead moon. Someone ambushed the ambushers."),
      sk("Pirates robbing pirates. Which, technically, is what we are. Let's be the last pirates standing."),
      ad("One of those hulks still has a gun turret attached, sir. Looks intact."),
    ],
    choices: [
      {
        label: 'Cut the turret free',
        requires: { scrap: 15 },
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("Engineering spends scrap on mounting brackets and wrestles the turret onto the Dutchman."),
              sk("A twin maser! Crude, but it'll make Kristang shields cry. I've already named it 'Doris'."),
            ],
            effects: { scrap: -15 },
            weapon: 'twinMaser',
          },
          {
            weight: 1,
            lines: [
              nr("The turret's power cell ruptures during removal. It's ruined, and so is a chunk of your hull plating."),
              sk("Doris. No. She had so much to live for."),
            ],
            effects: { scrap: -15, hull: -4 },
          },
        ],
      },
      {
        label: 'Strip the hulks for scrap',
        outcomes: [
          {
            lines: [
              nr("Teams cut away bulkheads, wiring and the occasional ghastly pirate souvenir."),
              si("Everything is logged and stowed, sir. I've labeled the creepy things 'do not touch'."),
            ],
            effects: { scrap: 18 },
          },
        ],
      },
      {
        label: 'Search for whoever did this',
        outcomes: [
          {
            weight: 1,
            lines: [
              nr("Sensors pick up a stealthed Kristang raider waiting for scavengers. It knows you're here now."),
              sk("Good news: we found them. Bad news: we found them. Punching it!"),
              nr("You escape, but not before eating a full broadside."),
            ],
            effects: { hull: -6, alert: 4 },
          },
          {
            weight: 1,
            lines: [
              nr("You find the ambushers' hidden supply cache, unguarded."),
              ad("Missiles, sir. Lizard brand, but they go boom."),
            ],
            effects: { missiles: 3, scrap: 5 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ mixed (2-5)
  {
    id: 'joes-crazy-plan',
    title: 'A Dumb Grunt Idea',
    minSector: 2,
    maxSector: 5,
    intro: [
      nr("A Kristang fuel depot orbits a star. Two patrol boats guard it, bored out of their minds."),
      jo("Okay, hear me out. What if we fake a solar flare and make them evacuate the depot?"),
      sk("That is the dumbest thing I have heard this century. And I've listened to Kristang radio."),
      sk("...Although. Hmm. No. Well. Hmm. I hate that I'm considering it."),
    ],
    choices: [
      {
        label: 'Do the crazy plan',
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("Skippy tickles the star's magnetic field. The patrol boats panic and flee. The depot is wide open."),
              sk("It worked. Your monkey brain stumbled into genius again. It's like watching a dog play chess and win."),
              jo("I'll take that as a compliment."),
            ],
            effects: { fuel: 3, scrap: 15, mood: 5 },
          },
          {
            weight: 2,
            lines: [
              nr("The flare goes off. The patrol boats evacuate... directly toward you."),
              sk("For the record, I said it was dumb. I want that in the official history."),
            ],
            effects: { hull: -3 },
            combat: 'kristang',
          },
        ],
      },
      {
        label: 'Let Skippy come up with something smarter',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Finally, a request worthy of me. I'll just hack their refuel scheduler and send a tanker to us."),
              nr("A Kristang tanker arrives, refuels you, and its pilot even waves goodbye."),
              sk("No flares, no drama. Just pure, effortless awesomeness. You're welcome."),
            ],
            effects: { fuel: 2, mood: 8 },
          },
        ],
      },
      {
        label: 'Skip the depot',
        outcomes: [
          {
            lines: [jo("Yeah, nah. Let's not."), sk("Disappointing. I was starting to look forward to watching you fail.")],
            effects: { mood: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'smythe-raid',
    title: 'Quiet Professionals',
    minSector: 2,
    maxSector: 5,
    intro: [
      nr("A lightly garrisoned Kristang supply station sits on an asteroid. Its sensors are older than Skippy's ego. Almost."),
      sm("My lads could have that station cleaned out in forty minutes, Colonel. No noise."),
      sk("Forty minutes? I could do it in four seconds. But fine, let the meat-soldiers have their fun."),
    ],
    choices: [
      {
        label: 'Send in Smythe’s team',
        requires: { crew: 3 },
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("Smythe's team ghosts through the station. Nobody inside wakes up until long after they've gone."),
              sm("All done. Brought back some munitions, and a rather nice kettle."),
            ],
            effects: { missiles: 2, scrap: 20 },
          },
          {
            weight: 1,
            lines: [
              nr("A guard who should have been asleep wasn't. The team fights its way out, carrying a casualty."),
              sm("Got what we came for. Lost a good man doing it."),
            ],
            effects: { missiles: 2, scrap: 10, crew: -1, alert: 4 },
          },
        ],
      },
      {
        label: 'Let Skippy hack the station from orbit',
        outcomes: [
          {
            weight: 2,
            lines: [
              sk("Their security is a password. The password is 'password'. In Kristang. I'm almost embarrassed for them."),
              nr("The station's cargo pods launch themselves toward you."),
            ],
            effects: { scrap: 15, mood: 5 },
          },
          {
            weight: 1,
            lines: [
              sk("Oops. Their alarm system was so primitive I didn't notice it. It's ringing. Like, an actual bell."),
              nr("The station broadcasts an alert before you can jump."),
            ],
            effects: { scrap: 10, alert: 5 },
          },
        ],
      },
      {
        label: 'Not worth the risk',
        outcomes: [
          {
            lines: [sm("Understood, sir."), nr("Smythe looks faintly disappointed, which for him is a dramatic display.")],
          },
        ],
      },
    ],
  },
  {
    id: 'stowaway',
    title: 'Something in the Cargo Bay',
    minSector: 2,
    maxSector: 5,
    intro: [
      nr("A Marine finds a frightened, furry Ruhar youngster hiding in a cargo pod taken during the last salvage."),
      ad("Kid says he wanted to see space. Well. He's seeing it."),
      sk("A Ruhar child knows humans have a starship. This is fine. This is totally fine. Everything is fine."),
    ],
    choices: [
      {
        label: 'Drop him at a Ruhar beacon (costs a detour)',
        requires: { fuel: 2 },
        outcomes: [
          {
            lines: [
              nr("You make a detour and leave him in a lifeboat near a Ruhar navigation buoy, with snacks."),
              na("I gave him a little tablet of puzzle games for the wait. I do hope he enjoys them."),
            ],
            effects: { fuel: -2, alert: 2 },
          },
        ],
      },
      {
        label: 'Ask Skippy to blur his memory of the ship',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("I'll adjust his memory so he thinks he was abducted by a giant, magnificent beer can. Which is technically true."),
              nr("The youngster is sent home in a pod, giggling about a talking can. Nobody will believe him."),
            ],
            effects: { mood: -5, alert: -3, fuel: -1 },
          },
        ],
      },
      {
        label: 'Let him join the crew',
        outcomes: [
          {
            lines: [
              nr("The kid turns out to be a whiz with Ruhar-made components. Simms gives him a bunk and a job."),
              si("He's already reorganized the spare parts locker. I may adopt him."),
              sk("Now there's a furry monkey on board. My standards keep dropping."),
            ],
            effects: { crew: 1, scrap: 5, alert: 4 },
          },
        ],
      },
    ],
  },
  {
    id: 'elder-artifact',
    title: 'Shiny',
    minSector: 2,
    maxSector: 6,
    intro: [
      nr("Deep in an asteroid sits a faintly glowing lattice of Elder construction, older than every species in the galaxy."),
      sk("Oh. Oh my. Joe. Joe. JOE. That's an Elder power coupling. I need it. I need it more than you need oxygen."),
      si("It's sitting right next to a Thuranin listening post, sir."),
    ],
    choices: [
      {
        label: 'Grab it for Skippy',
        outcomes: [
          {
            weight: 2,
            lines: [
              nr("A delicate extraction under the listening post's nose. Skippy guides every step, giddy as a kid."),
              sk("I'm wiring it into the reactor. More power for everything. You may now worship me. Optional. But strongly encouraged."),
            ],
            effects: { mood: 20, alert: 4 },
            reactor: 1,
          },
          {
            weight: 1,
            lines: [
              nr("The artifact crumbles to dust the moment it's moved. The listening post notices the commotion."),
              sk("No. Nonononono. It was beautiful. I'm going to go sit in the dark and listen to sad opera."),
            ],
            effects: { mood: -10, alert: 6 },
          },
        ],
      },
      {
        label: 'Too risky. Leave it',
        outcomes: [
          {
            lines: [
              jo("Sorry, buddy. Not with a Thuranin post right there."),
              sk("I will remember this. When you're old and gray, I will still remember this."),
            ],
            effects: { mood: -15 },
          },
        ],
      },
      {
        label: 'Promise Skippy you will come back for it later',
        outcomes: [
          {
            lines: [
              jo("We'll come back for it, Skippy. Pinky swear."),
              sk("Monkeys don't keep promises. But I'm choosing to believe you, because I'm magnanimous like that."),
            ],
            effects: { mood: -5 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Thuranin (3-6)
  {
    id: 'thuranin-outpost',
    title: 'Little Green Men',
    minSector: 3,
    maxSector: 6,
    intro: [
      nr("A Thuranin sensor outpost hangs at the edge of the system, its cyborg crew humming along in perfect efficiency."),
      sk("Thuranin. Smug, gray-green, half-machine. Think they're the smartest beings around. Adorable."),
      ad("Can we just blow it up?"),
    ],
    choices: [
      {
        label: 'Have Skippy steal their stealth software',
        requires: { mood: 50 },
        outcomes: [
          {
            weight: 3,
            lines: [
              sk("Downloading their latest stealth package... and adding my own improvements. Okay, mostly improvements."),
              nr("Your stealth field shimmers and settles into something much harder to see."),
            ],
            effects: { mood: 5 },
            upgradeSystem: 'stealth',
          },
          {
            weight: 1,
            lines: [
              sk("Huh. Their firewall bit me. Me! I've reported it to... nobody, because there's nobody above me. Ugh."),
              nr("The outpost logs an intrusion attempt."),
            ],
            effects: { mood: -10, alert: 5 },
          },
        ],
      },
      {
        label: 'Attack the outpost',
        outcomes: [
          {
            lines: [
              ad("Finally."),
              nr("The outpost launches its defense drones as you close in."),
            ],
            effects: { alert: 3 },
            combat: 'thuranin',
          },
        ],
      },
      {
        label: 'Go around it',
        outcomes: [
          {
            lines: [nr("You take the long way around its sensor cone."), si("That took a bit of extra fuel, sir.")],
            effects: { fuel: -1 },
          },
        ],
      },
    ],
  },
  {
    id: 'thuranin-tanker',
    title: 'Topping Off',
    minSector: 3,
    maxSector: 6,
    intro: [
      nr("A lone Thuranin fuel tanker sits at a waypoint, waiting for a convoy that's late."),
      sk("Thuranin tankers have automated refueling ports. Automated, Joe. As in: they don't ask who's plugging in."),
    ],
    choices: [
      {
        label: 'Have Skippy siphon fuel quietly',
        outcomes: [
          {
            weight: 3,
            lines: [
              sk("Siphoning... siphoning... You realize I'm basically stealing gas from a parked car. My talents are wasted on you."),
              nr("The tanks fill. The tanker's logs now show a minor 'sensor calibration drift'."),
            ],
            effects: { fuel: 3, mood: -6 },
          },
          {
            weight: 1,
            lines: [
              nr("The tanker's escort arrives early, right in the middle of the theft."),
              sk("Okay, that's... bad timing. Hose disconnecting. Weapons, please."),
            ],
            effects: { fuel: 1 },
            combat: 'thuranin',
          },
        ],
      },
      {
        label: 'Seize the tanker outright',
        requires: { missiles: 1 },
        outcomes: [
          {
            lines: [
              nr("A missile disables its engines. You drain it dry and scrap the pumps for parts."),
              si("Full tanks and spare parts. The Thuranin will want to know who did this, though."),
            ],
            effects: { missiles: -1, fuel: 3, scrap: 15, alert: 6 },
          },
        ],
      },
      {
        label: 'Leave it',
        outcomes: [
          {
            lines: [jo("Let's not poke the cyborgs today."), sk("Coward. Practical coward. I respect it, a little.")],
          },
        ],
      },
    ],
  },
  {
    id: 'thuranin-inspection',
    title: 'Papers, Please',
    minSector: 3,
    maxSector: 6,
    intro: [
      al("Unidentified Thuranin carrier. Transmit registry and mission code. Compliance is required."),
      sk("Traffic control. Bureaucrats. Even cyborgs have bureaucrats. The universe is a sad place."),
      jo("Skippy, can you fake a code?"),
    ],
    choices: [
      {
        label: 'Have Skippy forge credentials',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Generating a mission code... and a personal letter of commendation from their fleet admiral. Overkill? I don't do underkill."),
              al("...Credentials accepted. Safe travels, honored vessel."),
            ],
            effects: { alert: -4, mood: 5 },
          },
        ],
      },
      {
        label: 'Bluff it yourself',
        outcomes: [
          {
            weight: 1,
            lines: [
              jo("This is, uh, Carrier Seven-Bravo-Niner. Classified mission. Very classified. Nobody tell anybody."),
              al("...Acknowledged. Carry on."),
              sk("I cannot believe that worked. Their AI must be on lunch break."),
            ],
            effects: { alert: 1 },
          },
          {
            weight: 1,
            lines: [
              al("'Seven-Bravo-Niner' is not a valid designation. Hold position for boarding."),
              sk("Well, Joe, they're boarding. Want to say hello with lasers?"),
            ],
            effects: { alert: 5 },
            combat: 'thuranin',
          },
        ],
      },
      {
        label: 'Jump away immediately',
        requires: { fuel: 2 },
        outcomes: [
          {
            lines: [nr("The Dutchman jumps before control can finish its query."), si("Burned fuel and left a mystery behind us. Not great, but alive.")],
            effects: { fuel: -2, alert: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'rogue-ai',
    title: 'Ghost in the Machine',
    minSector: 3,
    maxSector: 6,
    intro: [
      nr("A derelict Thuranin cruiser is broadcasting a strange, looping signal. Its ship AI has gone feral."),
      sk("A rogue AI. It thinks it's a god. Cute. There's room for only one god-like intelligence in this sector."),
      na("Please be careful, Skippy. It sounds rather unwell."),
    ],
    choices: [
      {
        label: 'Let Skippy duel it in cyberspace',
        outcomes: [
          {
            weight: 3,
            lines: [
              sk("It tried to rewrite me. Me! I rewrote it into a toaster program. It now dreams only of bread."),
              nr("With its defenses down, the derelict's shield emitters are yours for the taking."),
            ],
            effects: { mood: 10 },
            upgradeSystem: 'shields',
          },
          {
            weight: 1,
            lines: [
              sk("Okay, ow. It scratched me. It's gone now, but it took some of our systems down with it."),
              na("Oh dear. I'll start repairs. Do lie down, Skippy."),
            ],
            effects: { hull: -5, mood: -5 },
          },
        ],
      },
      {
        label: 'Ask Nagatha and Skippy to work together',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              na("I'll distract it with a lovely chat about the weather. Skippy, dear, you do the rude part."),
              sk("Teamwork. Ugh. Fine. It actually worked, but I'm not saying it out loud."),
              nr("The AI is cleanly purged. You strip the derelict of its intact armor plates."),
            ],
            effects: { hull: 6, scrap: 15 },
          },
        ],
      },
      {
        label: 'Leave before it notices us',
        outcomes: [
          {
            lines: [nr("You slip away. The rogue AI continues its sermon to an empty sky."), sk("You're no fun. I was going to win.")],
            effects: { mood: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'relay-intercept',
    title: 'Listening In',
    minSector: 4,
    maxSector: 6,
    intro: [
      nr("You've drifted close to a feeder line for the comms relay network. Encrypted traffic flows past like a river."),
      sk("If I tap this, I can learn their jump routes. Delicate work. Very delicate. Requires praise during the process."),
    ],
    choices: [
      {
        label: 'Praise Skippy the whole time while he works',
        outcomes: [
          {
            lines: [
              jo("Wow, Skippy. Amazing. Brilliant. So... magnificent. Is that a new subroutine? It looks great on you."),
              sk("Ohhh, more. Yes. Okay, done. I've optimized our jump drive with their routing tables. You should praise me more often."),
            ],
            effects: { mood: 15 },
            upgradeSystem: 'jump',
          },
        ],
      },
      {
        label: 'Tell him to just get it done',
        outcomes: [
          {
            weight: 2,
            lines: [
              sk("No praise? Fine. I'll do the bare minimum, like a monkey at a call center."),
              nr("He pulls patrol schedules, nothing more."),
            ],
            effects: { alert: -4, mood: -8 },
          },
          {
            weight: 1,
            lines: [
              sk("I got distracted by how unappreciated I am, and might have tripped a security flag. Oops."),
            ],
            effects: { alert: 6, mood: -8 },
          },
        ],
      },
      {
        label: 'Don’t risk it',
        outcomes: [
          {
            lines: [jo("Not worth the exposure."), sk("You never let me have any fun.")],
            effects: { mood: -4 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Maxolhx dread (4-6)
  {
    id: 'maxolhx-patrol',
    title: 'Apex Predator',
    minSector: 4,
    maxSector: 6,
    intro: [
      nr("A sleek Maxolhx warship glides through the system, sensors sweeping in slow, lazy arcs."),
      sk("Joe. Joe. Do not move. Do not breathe. Do not THINK loudly. That is a Maxolhx cruiser."),
      ad("How bad?"),
      sk("Imagine a shark. Now imagine the shark has a doctorate and a grudge."),
    ],
    choices: [
      {
        label: 'Go dark and drift',
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("All systems shut down. For two hours, the crew barely whispers. The cruiser finally moves on."),
              sk("I'm not saying I was scared. I'm saying my casing is sweating, which shouldn't be possible."),
            ],
            effects: { alert: 2, mood: -5 },
          },
          {
            weight: 1,
            lines: [
              nr("A sensor sweep brushes your hull. The cruiser pauses, then logs an 'anomaly' and leaves."),
              si("That 'anomaly' is going to be in a report somewhere, sir."),
            ],
            effects: { alert: 7 },
          },
        ],
      },
      {
        label: 'Have Skippy spoof a sensor ghost to lure it away',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Creating a fake Thuranin distress signal two lightyears away. Very convincing. I even added screaming."),
              nr("The cruiser turns and jumps toward the decoy."),
            ],
            effects: { alert: -3, mood: 5 },
          },
        ],
      },
      {
        label: 'Ambush the cruiser. What could go wrong?',
        outcomes: [
          {
            lines: [
              sk("What could go wrong? WHAT COULD GO WRONG? Everything, Joe! Literally everything! This is your worst idea EVER!"),
              ad("Too late, sir. It's turning toward us."),
            ],
            effects: { alert: 8 },
            combat: 'maxolhx',
          },
        ],
      },
    ],
  },
  {
    id: 'maxolhx-wreck',
    title: 'Dead Giant',
    minSector: 4,
    maxSector: 6,
    intro: [
      nr("The wreck of a Maxolhx destroyer lies split in two. Whatever killed it was even worse than it was."),
      sk("That weapon mount is intact. A heavy maser. I want it. But touching Maxolhx stuff is like licking a live wire."),
    ],
    choices: [
      {
        label: 'Take the heavy maser',
        requires: { crew: 3 },
        outcomes: [
          {
            weight: 2,
            lines: [
              nr("The crew works in sweating silence. The heavy maser comes free and is mounted on the Dutchman."),
              sk("Now that's a gun. Kristang ships will see it and simply surrender out of shame."),
            ],
            effects: { alert: 4 },
            weapon: 'heavyMaser',
          },
          {
            weight: 1,
            lines: [
              nr("A dormant defense node wakes and fires once before Skippy kills it. Two crew are caught in the blast."),
              sk("I... was too slow. I'm sorry. I don't say that often. Don't make me say it again."),
            ],
            effects: { crew: -2, hull: -4, alert: 4 },
          },
        ],
      },
      {
        label: 'Strip the outer armor only',
        outcomes: [
          {
            lines: [
              nr("You harvest exotic hull plating from the edge of the wreck."),
              si("Better armor than anything we could build. Patching now."),
            ],
            effects: { hull: 7, scrap: 10 },
          },
        ],
      },
      {
        label: 'Get away from it',
        outcomes: [
          {
            lines: [sk("Yes. Leave the scary thing. Good monkey."), nr("The wreck spins away behind you.")],
            effects: { alert: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'maxolhx-probe',
    title: 'Something Is Watching',
    minSector: 4,
    maxSector: 6,
    intro: [
      nr("A tiny Maxolhx probe silently tracks the Dutchman, a black needle against the stars."),
      sk("A survey probe. If it phones home with our signature, it's very bad. Like 'end of humanity' bad."),
      jo("Okay, how about we not let it phone home."),
    ],
    choices: [
      {
        label: 'Shoot it with a missile',
        requires: { missiles: 1 },
        outcomes: [
          {
            weight: 2,
            lines: [nr("The missile hits. The probe fragments before it can finish its report."), sk("Bullseye. And no, I didn't help. Okay, I helped a little.")],
            effects: { missiles: -1, alert: -3 },
          },
          {
            weight: 1,
            lines: [nr("The probe dodges and finishes part of its transmission before the second shot lands."), sk("Partial report. Not great. Not apocalyptic. Mildly apocalyptic.")],
            effects: { missiles: -2, alert: 5 },
          },
        ],
      },
      {
        label: 'Let Skippy hack it',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Hacking Maxolhx tech is like defusing a bomb with oven mitts. But I am awesome, so..."),
              sk("Done. It'll report a lovely empty system and a cluster of interesting rocks."),
            ],
            effects: { alert: -6, mood: -5 },
          },
        ],
      },
      {
        label: 'Outrun it',
        requires: { fuel: 2 },
        outcomes: [
          {
            lines: [nr("A string of rapid jumps shakes the probe's track."), si("Fuel reserves took a hit, sir.")],
            effects: { fuel: -2, alert: 2 },
          },
        ],
      },
      {
        label: 'Go dark and hope',
        outcomes: [
          {
            weight: 1,
            lines: [nr('Every system is powered down. The probe drifts past, close enough to count the rivets.'), na('Well done, everyone. I shall turn the heating back on now.')],
            effects: { alert: 1 },
          },
          {
            weight: 1,
            lines: [nr('The probe pings the hull, pauses, and races off to report something.'), sk('Fantastic. Somewhere a Maxolhx is reading "weird-looking junk, possibly monkeys". This is fine.')],
            effects: { alert: 7, mood: -5 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ any sector
  {
    id: 'skippy-opera',
    title: 'The Magnificent Opera',
    intro: [
      sk("Attention, monkeys! I have composed a new opera. Seven hours long. It's about me. Attendance is mandatory."),
      ad("Seven hours. Colonel, I would rather fight a Kristang barehanded."),
      na("It might be nice to support him, Colonel. He's been working on it for nearly a full second."),
    ],
    choices: [
      {
        label: 'Attend the whole premiere',
        outcomes: [
          {
            lines: [
              nr("The crew sits through seven hours of warbling, synthesized brass, and a twenty-minute aria about Skippy's shiny casing."),
              sk("A standing ovation! Well, one standing person, but Adams was trying to escape and I'm counting it."),
            ],
            effects: { mood: 20, hull: -2 },
          },
        ],
      },
      {
        label: 'Give him an honest critique',
        outcomes: [
          {
            weight: 1,
            lines: [
              jo("Honestly, Skippy? The third act needs work. And fewer kazoos."),
              sk("Fewer KAZOOS? You uncultured primate. I'm going to go sulk in the reactor room."),
            ],
            effects: { mood: -15 },
          },
          {
            weight: 1,
            lines: [
              jo("It's good, but it's long. Cut it to ten minutes and I'll make it the ship's anthem."),
              sk("The ship's anthem? Hmm. Fine. Editing now. Being bold, as always."),
            ],
            effects: { mood: 8 },
          },
        ],
      },
      {
        label: 'Ask him to postpone it and calibrate the sensors instead',
        outcomes: [
          {
            lines: [
              sk("Sensors. You choose sensors over art. Very well. I shall calibrate, with great sadness."),
              nr("Sensor calibration lets you spot salvage and avoid an approaching patrol."),
            ],
            effects: { mood: -10, scrap: 10, alert: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'beer-party',
    title: 'Beer Thirty',
    intro: [
      nr("Crew morale has sunk to boot-sole levels. Someone has discovered Skippy's secret beer brewing setup."),
      sk("That is not a brewing setup. It's a... chemistry experiment. That happens to produce beer. Coincidentally."),
      si("Sir, a party could help. It would cost some supplies, though."),
    ],
    choices: [
      {
        label: 'Throw a party',
        requires: { scrap: 10 },
        outcomes: [
          {
            weight: 3,
            lines: [
              nr("Music, terrible dancing, and Skippy's beer, which is suspiciously good. Even Smythe smiles once."),
              sk("I am an awesome bartender. Also a genius brewmaster. Also generally awesome."),
            ],
            effects: { scrap: -10, mood: 15, hull: 3 },
          },
          {
            weight: 1,
            lines: [
              nr("The party goes great until a Marine drives a cargo loader into a bulkhead."),
              ad("I'll deal with him, sir. Personally."),
            ],
            effects: { scrap: -10, mood: 10, hull: -3 },
          },
        ],
      },
      {
        label: 'Confiscate the beer to trade later',
        outcomes: [
          {
            lines: [
              jo("Sorry, folks. This is trade goods now."),
              sk("You're stealing my beer. My BEER. This is the darkest day of my long life."),
            ],
            effects: { scrap: 15, mood: -15 },
          },
        ],
      },
      {
        label: 'One beer each, then back to work',
        outcomes: [
          {
            lines: [nr("A short, cheerful break. Nobody drives anything into anything."), sk("Moderation. How very boring. But I'll allow it.")],
            effects: { mood: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'adams-vs-skippy',
    title: 'Gunny Has Had Enough',
    intro: [
      ad("Colonel, the beer can changed the mess hall music to opera. Again. At oh-four-hundred. Again."),
      sk("It's called culture, Sergeant. You should try it. It's like hygiene, but for your soul."),
      ad("One more word and I'm putting you in the garbage disposal."),
    ],
    choices: [
      {
        label: 'Side with Adams',
        outcomes: [
          {
            lines: [
              jo("Skippy, no opera before breakfast. That's an order."),
              sk("Fine. Fine! I'll stop, because nobody here appreciates anything beautiful."),
              ad("Thank you, sir. The Marines will remember this."),
            ],
            effects: { mood: -12, hull: 3 },
          },
        ],
      },
      {
        label: 'Side with Skippy',
        outcomes: [
          {
            lines: [
              jo("Gunny, maybe give it a chance. Some of it's... catchy."),
              sk("Ha! A man of taste! Who knew? I'm rewarding you with a free tune-up on the weapons."),
              ad("Sir. I'm disappointed."),
            ],
            effects: { mood: 12, scrap: 5 },
          },
        ],
      },
      {
        label: 'Make them settle it with a trivia contest',
        outcomes: [
          {
            weight: 1,
            lines: [
              nr("The trivia is themed on Marine Corps history. Adams wins by a landslide. Skippy demands a recount."),
              sk("Rigged! Totally rigged! I demand to speak to the trivia manager!"),
            ],
            effects: { mood: -8 },
          },
          {
            weight: 1,
            lines: [
              nr("Against the odds, the two end up laughing. Adams even admits one aria is 'not terrible'."),
              sk("Not terrible! From her, that's practically a medal."),
            ],
            effects: { mood: 10 },
          },
        ],
      },
    ],
  },
  {
    id: 'nagatha-tea',
    title: 'A Spot of Tea',
    intro: [
      na("Colonel, I hope I'm not interrupting. I've noticed some hull micro-fractures. Would you mind terribly if I fixed them?"),
      sk("Ugh. She always asks permission. Just fix it. I'd have fixed it already if I could be bothered."),
      na("Manners matter, dear. Even on a stolen warship."),
    ],
    choices: [
      {
        label: 'Let Nagatha fix the hull',
        outcomes: [
          {
            lines: [
              nr("Nagatha directs repair bots with meticulous care. She even straightens the crew's bunks."),
              na("All done. And I took the liberty of polishing Skippy. He seemed a little dull."),
            ],
            effects: { hull: 5, scrap: -5 },
          },
        ],
      },
      {
        label: 'Ask Nagatha to manage Skippy for a while',
        outcomes: [
          {
            lines: [
              na("Skippy, dear, why don't we have a nice quiet chat about your feelings?"),
              sk("Noooo. Not the feelings chat. Anything but the feelings chat."),
              nr("An hour later, Skippy emerges grumbling but somehow calmer."),
            ],
            effects: { mood: 8 },
          },
        ],
      },
      {
        label: 'Ask Skippy to fix it, since he’s the bigger AI',
        outcomes: [
          {
            lines: [
              sk("Oh, so NOW I'm the bigger AI. Flattery. I see your game. It's working. Patching now."),
              nr("Skippy fixes the hull in seconds, and gloats about it for an hour."),
            ],
            effects: { hull: 6, mood: 5 },
          },
        ],
      },
    ],
  },
  {
    id: 'ruhar-trader',
    title: 'The Hamster Merchant',
    intro: [
      nr("A neutral Ruhar trader, furry and cheerful, hails the Dutchman, apparently not caring who you are."),
      al("Greetings, strange ship! I have goods. You have scrap. Let us become friends of commerce."),
      sk("He thinks we're a Thuranin carrier with bad manners. Let's not correct him."),
    ],
    choices: [
      {
        label: 'Buy a railgun mount',
        requires: { scrap: 30 },
        outcomes: [
          {
            lines: [
              al("A fine railgun! Slightly used. Only fired at three pirates and one very large rock."),
              sk("A railgun. Simple, brutal, effective. Kind of like you, Joe."),
            ],
            effects: { scrap: -30 },
            weapon: 'railgun',
          },
        ],
      },
      {
        label: 'Trade scrap for fuel',
        requires: { scrap: 15 },
        outcomes: [
          {
            lines: [al("A very fair trade! Fuel for you, and shiny junk for me."), si("Tanks topped up, sir.")],
            effects: { scrap: -15, fuel: 2 },
          },
        ],
      },
      {
        label: 'Have Skippy haggle',
        outcomes: [
          {
            weight: 2,
            lines: [
              sk("Allow me. I've studied ten thousand years of commerce. Also, I'm a better liar than you."),
              al("I... I somehow paid you to take my missiles? How did this happen?"),
            ],
            effects: { missiles: 2, scrap: 5, mood: 8 },
          },
          {
            weight: 1,
            lines: [
              sk("I insulted his fur. It slipped out. In my defense, he looks like a stuffed animal."),
              al("Good day, rude Thuranin! I shall tell everyone about you!"),
            ],
            effects: { alert: 4, mood: -4 },
          },
        ],
      },
    ],
  },
  {
    id: 'injured-crew',
    title: 'Medical Emergency',
    intro: [
      nr("An overloaded power conduit explodes in Engineering. A tech is badly burned."),
      na("I'm stabilizing her, Colonel, but she needs proper treatment. I'm terribly sorry I didn't spot the fault sooner."),
      sk("Nagatha's medical bay is good. Mine is better. But I'm busy, so..."),
    ],
    choices: [
      {
        label: 'Ask Skippy to help heal her',
        requires: { mood: 50 },
        outcomes: [
          {
            lines: [
              sk("Fine. I'll help the monkey. Not because I care. I just hate unfinished repairs."),
              nr("Skippy rebuilds damaged tissue with eerie precision. The tech is back on duty within a day."),
              na("He cares a great deal, you know. He simply hates anyone noticing."),
            ],
            effects: { mood: 5 },
          },
        ],
      },
      {
        label: 'Use medical supplies',
        requires: { scrap: 10 },
        outcomes: [
          {
            lines: [nr("Nagatha uses the last advanced dressings. The tech will recover, slowly."), na("She'll be fine. I'll keep a careful eye on her.")],
            effects: { scrap: -10 },
          },
        ],
      },
      {
        label: 'Do what you can with what you have',
        outcomes: [
          {
            weight: 1,
            lines: [nr("Basic first aid is enough. She'll be on light duty for a while."), si("We're shorthanded, but we'll manage.")],
            effects: { mood: -2 },
          },
          {
            weight: 1,
            lines: [nr("Despite everyone's efforts, she doesn't make it."), sk("...I could have helped. I should have. Never mind. Let's keep moving.")],
            effects: { crew: -1, mood: -10 },
          },
        ],
      },
    ],
  },
  {
    id: 'wormhole-anomaly',
    title: 'Hiccup in the Network',
    intro: [
      nr("A nearby wormhole stutters, flickering between two endpoints like a broken light."),
      sk("That wormhole is glitching. I could poke it into a shortcut. Or I could poke it into a black hole. Fifty-fifty-ish."),
      jo("What's the 'ish'?"),
      sk("The 'ish' is where we die."),
    ],
    choices: [
      {
        label: 'Ask Skippy to stabilize it into a shortcut',
        requires: { mood: 50 },
        outcomes: [
          {
            weight: 3,
            lines: [
              sk("Poking... poking... there! A nice shortcut. You may thank me in song."),
              nr("The shortcut saves a full jump's worth of fuel and throws off any pursuers."),
            ],
            effects: { fuel: 2, alert: -3, mood: 5 },
          },
          {
            weight: 1,
            lines: [
              sk("Hmm. Shortcut-ish. The 'ish' didn't kill us, but it did shake the ship really hard."),
            ],
            effects: { hull: -5, fuel: 1 },
          },
        ],
      },
      {
        label: 'Fly through without help',
        outcomes: [
          {
            weight: 1,
            lines: [nr("The ship screams through the unstable wormhole and emerges, bruised, much further ahead."), ad("Never doing that again.")],
            effects: { hull: -4, fuel: 2 },
          },
          {
            weight: 1,
            lines: [nr("The wormhole spits you out right next to a busy shipping lane."), sk("Hi, everyone! Nobody look over here!")],
            effects: { hull: -3, alert: 6 },
          },
        ],
      },
      {
        label: 'Avoid it',
        outcomes: [{ lines: [jo("Not today, space hiccup."), sk("Boring.")] }],
      },
    ],
  },
  {
    id: 'your-magnificence',
    title: 'Your Magnificence',
    intro: [
      sk("From now on, all crew will address me as 'Your Magnificence'. This is not a request. This is an awesome new policy."),
      ad("Not happening."),
      si("Sir, it might be easier to just... humor him for a while."),
    ],
    choices: [
      {
        label: 'Order everyone to comply for a day',
        outcomes: [
          {
            lines: [
              nr("For one long day, the crew says 'Your Magnificence' through gritted teeth."),
              sk("This is the best day of my existence. I've created a whole performance review based on it."),
              ad("Your Magnificence, I hope your casing rusts."),
            ],
            effects: { mood: 20, hull: -2 },
          },
        ],
      },
      {
        label: 'Refuse',
        outcomes: [
          {
            lines: [
              jo("You're the beer can, Skippy. That's your title."),
              sk("Beer can. BEER CAN. I want you to know I'm composing a very sad song about this moment."),
            ],
            effects: { mood: -15 },
          },
        ],
      },
      {
        label: 'Compromise: "Skippy the Magnificent" on official logs',
        outcomes: [
          {
            lines: [
              sk("Official logs? Permanent? Historical record? ...Acceptable. The future will know my greatness."),
              si("I'll update the log templates, sir."),
            ],
            effects: { mood: 10 },
          },
        ],
      },
    ],
  },
  {
    id: 'simms-inventory',
    title: 'Missing Inventory',
    intro: [
      si("Colonel, we're short several crates of salvage. The logs show they were moved to Cargo Bay Seven."),
      jo("We don't have a Cargo Bay Seven."),
      sk("Ah. Well. You do now. It's... a stage. For my opera. With lights."),
    ],
    choices: [
      {
        label: 'Make Skippy return the materials',
        outcomes: [
          {
            lines: [
              sk("Dismantling my beautiful stage. Piece by piece. Like my dreams."),
              si("Inventory restored, sir. Thank you."),
            ],
            effects: { scrap: 20, mood: -15 },
          },
        ],
      },
      {
        label: 'Let him keep his stage',
        outcomes: [
          {
            lines: [
              jo("Leave it. Everyone needs a hobby."),
              sk("I knew you had a soul in there somewhere, Joe! A tiny, monkey-shaped soul!"),
            ],
            effects: { mood: 15 },
          },
        ],
      },
      {
        label: 'Split it: half back, half for the stage',
        outcomes: [
          {
            lines: [si("A sensible compromise, sir."), sk("Half a stage. A minimalist production. Very avant-garde. I can work with that.")],
            effects: { scrap: 10, mood: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'skippy-ignored',
    title: 'The Silent Treatment',
    intro: [
      nr("The bridge has been unusually quiet. Skippy hasn't insulted anyone in three hours."),
      na("Colonel, I believe Skippy is upset. He feels nobody thanked him for the last jump."),
      sk("I'm fine. Totally fine. I don't need validation from monkeys. Nobody even said 'nice jump'."),
    ],
    choices: [
      {
        label: 'Give a heartfelt thank-you speech',
        outcomes: [
          {
            lines: [
              jo("Skippy, we'd be dead a hundred times over without you. Thank you. Seriously."),
              sk("Oh. Well. That was... adequate. I'm not crying. Beer cans can't cry. Shut up."),
            ],
            effects: { mood: 18 },
          },
        ],
      },
      {
        label: 'Ignore it, he’ll get over it',
        outcomes: [
          {
            lines: [
              sk("Fine. I'll just be over here. Calculating jumps. With no thanks. Forever."),
              na("I'll handle the routine tasks for a while, Colonel. Just in case."),
            ],
            effects: { mood: -15 },
          },
        ],
      },
      {
        label: 'Have the crew sign a giant thank-you card',
        requires: { crew: 3 },
        outcomes: [
          {
            weight: 2,
            lines: [
              nr("Simms organizes a card. Even Adams signs it, though her message is just 'Fine. Thanks.'"),
              sk("A card! With signatures! I'm framing it. In a frame. Made of Elder alloy."),
            ],
            effects: { mood: 20, scrap: -5 },
          },
          {
            weight: 1,
            lines: [
              nr("The card is signed, but someone draws a beer can with a mustache on it."),
              sk("I'm going to find out who did this. And I'm going to make them listen to opera."),
            ],
            effects: { mood: 5, scrap: -5 },
          },
        ],
      },
    ],
  },
];
