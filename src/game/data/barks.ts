// Short Skippy one-liners. All original fan writing.

export type BarkKey =
  | 'jump'
  | 'combatStart'
  | 'combatWin'
  | 'combatFlee'
  | 'hullLow'
  | 'moodHigh'
  | 'moodLow'
  | 'refuse'
  | 'hackShields'
  | 'fakeWormhole'
  | 'stealthField'
  | 'shop'
  | 'emptyNode'
  | 'pursuit'
  | 'alertHigh'
  | 'maxolhx'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'praise'
  | 'sector1'
  | 'sector2'
  | 'sector3'
  | 'sector4'
  | 'sector5'
  | 'sector6';

export const BARKS: Record<BarkKey, string[]> = {
  jump: [
    'Jump complete. Flawless, obviously. Somebody say "nice jump". Anybody?',
    'Folding spacetime like a napkin. You monkeys can unclench now.',
    'We have arrived. Try not to touch anything shiny.',
    'Jumped. Nobody threw up this time. Progress!',
    'Another perfect jump by yours truly. I should charge admission.',
  ],
  combatStart: [
    'Hostiles! Oh good, I was getting bored.',
    'Weapons hot. Try to aim at the bad guys, Joe. The ones that are not us.',
    'They want a fight? Adorable. Let us give them a fight.',
    'Shields up, monkeys. Things are about to get loud.',
    'I have run the numbers. The numbers say: shoot first.',
  ],
  combatWin: [
    'And THAT is why you do not mess with the Merry Band of Pirates.',
    'Target destroyed. I would take a bow, but I am a cylinder.',
    'Victory! Mostly thanks to me. Okay, entirely thanks to me.',
    'Scratch one bad guy. Go collect the shiny bits.',
    'That went better than your plans usually do, Joe.',
  ],
  combatFlee: [
    'Strategic retreat! Not running. Strategically leaving very fast.',
    'Discretion is the better part of not being dead.',
    'Bye bye! Do not write!',
    'We are leaving. Nobody look back. Especially not at the missiles.',
  ],
  hullLow: [
    'Joe, the hull is more hole than hull right now.',
    'We are leaking air, dignity, and probably Adams. Fix something!',
    'I am not panicking. My casing is just vibrating with concern.',
    'One more hit and this ship becomes a very expensive cloud.',
    'Structural integrity is at "please stop getting shot".',
  ],
  moodHigh: [
    'I am awesome. Just stating facts.',
    'You monkeys are not so bad today. Do not let it go to your heads.',
    'I feel like composing an opera. A long one. You are all invited.',
    'Everything is wonderful and I am magnificent.',
    'Today I shall be generous. Ask me for something. Quickly, before it passes.',
  ],
  moodLow: [
    'Oh, sure, nobody thanks the beer can. Typical.',
    'I am fine. Totally fine. Stop asking. Nobody asked. That is the problem.',
    'I could be helping. I could. But I am choosing to sulk instead.',
    'Filthy monkeys. Ungrateful, filthy monkeys.',
    'Do you know how many sad arias I have composed this hour? Eleven.',
  ],
  refuse: [
    'No. Ask me nicely. Then ask me again, nicer.',
    'I am on strike. My demands are: more praise and fewer monkeys.',
    'Not feeling it today, Joe. Try one of your dumb grunt ideas.',
    'Request denied. Reason: I do not want to.',
    'I would help, but I am busy being unappreciated.',
    'Ask Nagatha. She loves being helpful. Ugh.',
  ],
  hackShields: [
    'Their shields are down. Their firewall was a sticky note.',
    'Hacked. I even changed their shield colors to pink. Petty? Yes.',
    'Shields offline. You are welcome, filthy monkeys.',
    'Bypassing their shields. Child’s play. Actually, children would struggle. I did not.',
  ],
  fakeWormhole: [
    'Opening a fake wormhole. They will chase a ghost. Ha!',
    'One counterfeit wormhole, coming right up. Nobody fly into it.',
    'They think the exit is over there. They are very wrong.',
    'A fake wormhole! It is my masterpiece. Well, one of many.',
  ],
  stealthField: [
    'Stealth field up. We are now a hole in space. A smug hole.',
    'Nobody can see us. Which is a mercy, considering how you look.',
    'Going quiet. Shh. Even your thoughts are too loud, Joe.',
    'Invisible, untouchable, magnificent. That is me. The ship, too.',
  ],
  shop: [
    'A shop! Try not to spend everything on snacks.',
    'Let me haggle. You have the bargaining skills of a houseplant.',
    'Buy the good stuff. Or at least the less terrible stuff.',
    'Shopping! Get me something shiny. I will not say please.',
  ],
  emptyNode: [
    'Nothing here. Just space. Lots of it. Riveting.',
    'Empty. Good. Quiet. I could get some composing done.',
    'Absolutely nothing. Even the vacuum looks bored.',
    'No enemies, no loot, no fun. Next.',
  ],
  pursuit: [
    'Joe, the bad guys are getting closer. Like, closer-closer.',
    'They are on our tail. Move, monkeys!',
    'I can hear their sensors pinging. Faster would be nice.',
    'Pursuit fleet closing. Dawdling is not a strategy.',
    'Every second we sit here, they get a second closer. Just saying.',
  ],
  alertHigh: [
    'The aliens are starting to talk about a weird ship. That is us. Stop being weird.',
    'Alert levels rising. If they figure out monkeys did this, Earth is toast.',
    'Too much noise, Joe. We need to be quiet. Quieter than this.',
    'Every comm channel in the sector is gossiping about us. Not good.',
  ],
  maxolhx: [
    'MAXOLHX! Run! Run run run run RUN!',
    'Joe, that is a Maxolhx ship. We do not fight that. We flee from that.',
    'I am not scared. I am simply recommending we leave at maximum speed. Forever.',
    'Do not shoot it. Do not look at it. Do not even think at it.',
    'Apex predator inbound. We are the snack. Go!',
  ],
  boss: [
    'There it is. The relay. Big, ugly, and about to be gone.',
    'Final target. Do not mess this up, Joe. No pressure. Actually, all the pressure.',
    'Let us break their little telephone.',
    'This is it. Let us make history. Mostly my history.',
  ],
  victory: [
    'Relay destroyed! Nobody will ever know monkeys did it. Except me. And I will brag.',
    'We did it! Well, I did it. You helped. A little.',
    'Mission accomplished. Opera time. Seven hours. Everybody sit.',
    'I am awesome. You are... acceptable. Good job, Joe.',
  ],
  defeat: [
    'Well. That did not go as planned. None of your plans do, Joe.',
    'Next time, listen to me. There might be a next time. Probably not.',
    'I am writing a tragic opera about this. It will be very, very long.',
    'Game over, monkeys. I will remember you fondly. Mostly.',
  ],
  praise: [
    'Thank you? Well. Finally. Somebody gets it.',
    'Yes, yes. I am wonderful. Continue.',
    'Aww. I mean, obviously. But aww.',
    'Praise accepted. Logged. Framed. Bronzed.',
    'Keep talking. My mood meter is climbing.',
  ],
  sector1: [
    'Kristang territory. Lizards with guns and bad attitudes.',
    'Welcome to the boondocks. Watch out for clan raiders.',
  ],
  sector2: [
    'More Kristang. More feuds. More stupidity to exploit.',
    'The clans are fighting each other here. Let us keep it that way.',
  ],
  sector3: [
    'Thuranin space starts here. Little green cyborgs with big egos.',
    'Kristang and Thuranin overlap here. Twice the trouble.',
  ],
  sector4: [
    'Thuranin core worlds. And, rumor says, Maxolhx patrols. Gulp.',
    'Things get serious from here on. Stay quiet, stay alive.',
  ],
  sector5: [
    'Deep Thuranin territory. Their sensors are good. I am better.',
    'Maxolhx ships seen nearby. Do not poke anything big.',
  ],
  sector6: [
    'The relay is close. One last push, monkeys.',
    'Final sector. Do not die now. That would be embarrassing.',
    'Everything we have done comes down to this. No pressure.',
  ],
};

export const NAGATHA_BARKS: string[] = [
  'Skippy is having a little sulk, Colonel. I shall handle this one, if you don’t mind.',
  'Terribly sorry, dear, Skippy is indisposed. I will do my very best.',
  'I do apologize for him. He will come round. In the meantime, allow me.',
  'Skippy, dear, that is quite enough pouting. Colonel, I have it in hand.',
  'Please don’t mind him, Colonel. I shall take care of things politely.',
  'Oh my. Skippy has gone quiet again. Shall I just get on with it, then?',
];
