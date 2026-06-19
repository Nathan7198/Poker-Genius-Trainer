export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'] as const;
export const SUITS = ['s','h','d','c'] as const;
export type Rank = typeof RANKS[number];
export type Suit = typeof SUITS[number];

export interface Card {
  rank: Rank;
  suit: Suit;
  faceUp?: boolean;
}

export const RANK_VALUES: Record<Rank, number> = {
  'A':14,'K':13,'Q':12,'J':11,'T':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2,
};

export type Position = 'UTG'|'HJ'|'CO'|'BTN'|'SB'|'BB';
export const POSITIONS: Position[] = ['UTG','HJ','CO','BTN','SB','BB'];
export const POSITION_LABELS: Record<Position, string> = {
  UTG:'Under the Gun', HJ:'Hijack', CO:'Cut-Off', BTN:'Button', SB:'Small Blind', BB:'Big Blind',
};
export const POSITION_COLORS: Record<Position, string> = {
  UTG:'#E74C3C', HJ:'#E67E22', CO:'#F1C40F', BTN:'#2ECC71', SB:'#3498DB', BB:'#9B59B6',
};
export const POSITION_DESCRIPTIONS: Record<Position, string> = {
  UTG: 'First to act preflop. The tightest position — you have no positional info. Open only strong hands.',
  HJ: 'Hijack — two left of the button. Slightly wider than UTG. You act before CO, BTN, SB, BB.',
  CO: 'Cut-Off — one left of the button. Great spot to steal. Wide open range is profitable here.',
  BTN: 'The Button — best position in poker. You act last postflop every street. Open very wide.',
  SB: 'Small Blind — acts first postflop. Prefer 3-betting over calling. Defend vs BTN with wide range.',
  BB: 'Big Blind — last preflop, first postflop (except SB). Wide defense range given your pot odds.',
};

export type PlayerType = 'TAG'|'LAG'|'Nit'|'Fish'|'Maniac';

export const PLAYER_TYPE_INFO: Record<PlayerType, {
  label: string; shortLabel: string; description: string;
  vpip: number; pfr: number; exploit: string; color: string;
}> = {
  TAG: {
    label:'Tight-Aggressive', shortLabel:'TAG',
    description:'Plays a tight range but bets and raises aggressively with strong hands. The most common winning player type. VPIP ~22%, PFR ~18%.',
    vpip:22, pfr:18,
    exploit:'Respect their bets — they rarely bluff rivers. Fold marginal hands to aggression. 3-bet them light from position.',
    color:'#27AE60',
  },
  LAG: {
    label:'Loose-Aggressive', shortLabel:'LAG',
    description:'Plays many hands and applies constant pressure. High variance but dangerous. VPIP ~35%, PFR ~28%.',
    vpip:35, pfr:28,
    exploit:'Call down lighter — they bluff a lot. Let them bet into you. Trap with strong hands. Avoid marginal bluffs.',
    color:'#E67E22',
  },
  Nit: {
    label:'Nit', shortLabel:'Nit',
    description:'Extremely tight. Only plays premium holdings. Predictable and easy to exploit. VPIP ~10%, PFR ~8%.',
    vpip:10, pfr:8,
    exploit:'Steal blinds relentlessly — they fold too much. Fold to their big bets unless you hold a monster. Never bluff them off top pair.',
    color:'#95A5A6',
  },
  Fish: {
    label:'Calling Station', shortLabel:'Fish',
    description:'Calls too wide and rarely raises. Will call down with bottom pair. Never bluff them. VPIP ~50%, PFR ~8%.',
    vpip:50, pfr:8,
    exploit:'Value bet relentlessly — thin value is very profitable. Size up with strong hands. Zero bluffs.',
    color:'#3498DB',
  },
  Maniac: {
    label:'Maniac', shortLabel: 'Maniac',
    description:'Bets and raises constantly with almost any holding. Extremely high variance. VPIP ~60%, PFR ~50%.',
    vpip:60, pfr:50,
    exploit:'Trap with strong hands — let them hang themselves. Wide call-down range. Cold 4-bet only premium.',
    color:'#E74C3C',
  },
};

export type Difficulty = 'Beginner'|'Intermediate'|'Advanced'|'Expert';
export const DIFFICULTIES: Difficulty[] = ['Beginner','Intermediate','Advanced','Expert'];
export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  Beginner: 'Hand strength + pot odds + equity shown. Optimal action suggested.',
  Intermediate: 'Pot odds and equity shown. You decide the action.',
  Advanced: 'Pot odds only. Estimate your equity.',
  Expert: 'No hints during play. Full GTO debrief after each hand.',
};

// ── GTO Preflop Opening Ranges ─────────────────────────────────────────────

const UTG_SET = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s',
  'QJs','QTs','Q9s',
  'JTs','J9s','J8s',
  'T9s','T8s',
  '98s','87s','76s','65s','54s',
  'AKo','AQo','AJo','ATo',
  'KQo','KJo',
]);

const HJ_EXTRA = ['66','55','K8s','K7s','Q8s','J7s','T7s','97s','86s','A9o','A8o','KTo','QJo'];
const HJ_SET = new Set([...UTG_SET, ...HJ_EXTRA]);

const CO_EXTRA = ['44','33','22','K6s','K5s','K4s','K3s','K2s','Q7s','Q6s','J6s','J5s','T6s','T5s','96s','95s','85s','75s','64s','53s','43s','A7o','A6o','Q9o','QTo','JTo'];
const CO_SET = new Set([...HJ_SET, ...CO_EXTRA]);

const BTN_EXTRA = ['Q5s','Q4s','Q3s','Q2s','J4s','J3s','J2s','T4s','T3s','T2s','94s','84s','74s','63s','52s','42s','32s','A5o','A4o','A3o','A2o','K9o','K8o','Q8o','J9o','J8o','T9o','T8o','98o','97o'];
const BTN_SET = new Set([...CO_SET, ...BTN_EXTRA]);

const SB_EXTRA = ['87o','76o','65o'];
const SB_SET = new Set([...BTN_SET, ...SB_EXTRA]);

export const GTO_RANGES: Record<Position, Set<string>> = {
  UTG: UTG_SET,
  HJ: HJ_SET,
  CO: CO_SET,
  BTN: BTN_SET,
  SB: SB_SET,
  BB: new Set(),
};

// BB defending range vs a raise (~65% of hands, averaged across raise positions).
// BB gets discounted pot odds (already has 1BB invested) so defends very wide.
export const BB_DEFENSE = new Set([
  // All pairs
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // All suited aces (A2s–AKs)
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // All suited kings (K2s–KQs)
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  // All suited queens (Q2s–QJs)
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
  // Suited jacks J4s–JTs
  'JTs','J9s','J8s','J7s','J6s','J5s','J4s',
  // Suited tens T4s–T9s
  'T9s','T8s','T7s','T6s','T5s','T4s',
  // Suited nines 94s–98s
  '98s','97s','96s','95s','94s',
  // Suited eights 84s–87s
  '87s','86s','85s','84s',
  // Suited sevens 73s–76s
  '76s','75s','74s','73s',
  // Suited sixes 63s–65s
  '65s','64s','63s',
  // Suited fives 53s–54s
  '54s','53s',
  // Suited fours–threes
  '43s','42s','32s',
  // All offsuit aces (A2o–AKo)
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
  // Offsuit kings K7o–KQo
  'KQo','KJo','KTo','K9o','K8o','K7o',
  // Offsuit queens Q8o–QJo
  'QJo','QTo','Q9o','Q8o',
  // Offsuit jacks J8o–JTo
  'JTo','J9o','J8o',
  // Offsuit tens T8o–T9o
  'T9o','T8o',
  // Connected offsuit hands
  '98o','97o','87o','76o',
]);

export const THREEBET_VALUE = new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs']);
export const THREEBET_BLUFF = new Set(['A5s','A4s','A3s','A2s','K5s','Q5s','J5s','87s','76s']);

// ── GTO Mode Data ───────────────────────────────────────────────────────────

export const GTO_POSITION_INFO: Record<Position, {
  rangeSize: number;  // % of all combos opened
  openSize: number;   // GTO open size in BB (0 = doesn't open, defends)
  advantage: string;  // 'EP' | 'MP' | 'LP' | 'SB' | 'BB'
  positionTip: string;
}> = {
  UTG: {
    rangeSize: 14,
    openSize: 3,
    advantage: 'EP',
    positionTip: 'Earliest position — you act first on every post-flop street. Play tight: your range signals strength so opponents will respect your bets.',
  },
  HJ: {
    rangeSize: 18,
    openSize: 2.5,
    advantage: 'MP',
    positionTip: 'Hijack — slightly later position, open a few more hands. You still have CO, BTN, and blinds left to act, so stay disciplined.',
  },
  CO: {
    rangeSize: 25,
    openSize: 2.5,
    advantage: 'LP',
    positionTip: 'Cutoff — one off the button. Good steal position with position on the blinds. Open wide and attack when folded to.',
  },
  BTN: {
    rangeSize: 42,
    openSize: 2.5,
    advantage: 'LP',
    positionTip: 'Button — the best seat in poker. You always act last post-flop. Open very wide (~42%) and apply maximum pressure on the blinds.',
  },
  SB: {
    rangeSize: 35,
    openSize: 3,
    advantage: 'SB',
    positionTip: 'Small Blind — you are out of position post-flop against everyone. Open strong hands, 3-bet or fold vs raises. Limping is often a leak here.',
  },
  BB: {
    rangeSize: 65,
    openSize: 0,
    advantage: 'BB',
    positionTip: 'Big Blind — you already have 1BB invested and get the best pot odds to defend. Defend wide (65%) but remember you are OOP post-flop against everyone except SB.',
  },
};

// Equity estimate vs a standard villain range by made hand rank
export function getPostFlopEquity(handRank: number): { pct: number; label: string; color: string } {
  if (handRank >= 6) return { pct: 90, label: 'Monster — nearly always ahead', color: '#27AE60' };
  if (handRank >= 5) return { pct: 82, label: 'Very strong — value bet always', color: '#27AE60' };
  if (handRank >= 4) return { pct: 72, label: 'Strong — build the pot', color: '#2ECC71' };
  if (handRank >= 3) return { pct: 62, label: 'Good — usually ahead', color: '#F39C12' };
  if (handRank === 2) return { pct: 50, label: 'Medium — pot control often best', color: '#E67E22' };
  if (handRank === 1) return { pct: 35, label: 'Marginal — bluff-catcher territory', color: '#E74C3C' };
  return { pct: 18, label: 'Weak — check/fold vs aggression', color: '#C0392B' };
}

// GTO concept explanation for preflop decision
export function getPreflopGTOVerdict(
  notation: string,
  position: Position,
  facingRaise: boolean,
  potOdds: number,
  equity: number,
  is3BetPot: boolean,
): { action: 'raise' | 'call' | 'fold'; reason: string } {
  const inRange = GTO_RANGES[position].has(notation);
  const is3BetValue = THREEBET_VALUE.has(notation);
  const is3BetBluff = THREEBET_BLUFF.has(notation);

  if (!facingRaise) {
    if (inRange) return { action: 'raise', reason: `${notation} is in your GTO opening range from ${position}. Open to ${GTO_POSITION_INFO[position].openSize}BB.` };
    return { action: 'fold', reason: `${notation} is outside your GTO ${position} range (${GTO_POSITION_INFO[position].rangeSize}%). Folding avoids playing OOP with a weak range.` };
  }

  if (is3BetValue) return { action: 'raise', reason: `${notation} is a GTO 3-bet value hand. Raise to deny equity and build the pot with a strong holding.` };
  if (is3BetBluff) return { action: 'raise', reason: `${notation} is a GTO 3-bet bluff (ace blocker). Polarise your 3-bet range by mixing value and bluffs like this.` };
  if (equity >= potOdds + 5) return { action: 'call', reason: `Your equity (~${equity}%) exceeds the pot odds (${potOdds}%) by enough to call profitably. Calling keeps villain's bluffs in their range.` };
  if (position === 'BB' && equity >= potOdds - 2) return { action: 'call', reason: `BB defense: you already have 1BB invested. Pot odds of ${potOdds}% justify a call with ~${equity}% equity.` };
  return { action: 'fold', reason: `Facing a raise with ~${equity}% equity and ${potOdds}% pot odds — not enough equity to continue. Fold and preserve your stack.` };
}

// ── Deck Utils ─────────────────────────────────────────────────────────────

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function getHandNotation(card1: Card, card2: Card): string {
  const v1 = RANK_VALUES[card1.rank];
  const v2 = RANK_VALUES[card2.rank];
  const high = v1 >= v2 ? card1 : card2;
  const low = v1 >= v2 ? card2 : card1;
  if (high.rank === low.rank) return `${high.rank}${low.rank}`;
  return `${high.rank}${low.rank}${high.suit === low.suit ? 's' : 'o'}`;
}

// ── Equity ─────────────────────────────────────────────────────────────────

export const PREFLOP_EQUITY: Record<string,number> = {
  'AA':85,'KK':82,'QQ':79,'JJ':77,'TT':75,'99':72,'88':69,'77':66,'66':63,'55':60,'44':57,'33':54,'22':51,
  'AKs':67,'AQs':66,'AJs':65,'ATs':64,'A9s':63,'A8s':62,'A7s':61,'A6s':60,'A5s':60,'A4s':59,'A3s':58,'A2s':57,
  'AKo':65,'AQo':64,'AJo':63,'ATo':62,'A9o':60,'A8o':59,'A7o':58,'A6o':57,'A5o':57,'A4o':56,'A3o':55,'A2o':54,
  'KQs':63,'KJs':62,'KTs':61,'K9s':60,'K8s':58,'K7s':57,'K6s':56,'K5s':55,'K4s':54,'K3s':53,'K2s':52,
  'KQo':61,'KJo':60,'KTo':59,'K9o':57,'K8o':56,'K7o':55,
  'QJs':60,'QTs':59,'Q9s':58,'Q8s':56,'Q7s':55,'Q6s':54,'Q5s':53,
  'QJo':58,'QTo':57,'Q9o':56,
  'JTs':58,'J9s':57,'J8s':55,'J7s':54,'J6s':53,
  'JTo':56,'J9o':55,
  'T9s':56,'T8s':55,'T7s':53,'T6s':52,'T5s':51,
  'T9o':54,'T8o':53,
  '98s':54,'97s':53,'96s':52,'95s':51,
  '98o':52,'97o':51,
  '87s':53,'86s':51,'85s':50,'87o':51,
  '76s':52,'75s':50,'74s':49,'76o':50,
  '65s':51,'64s':49,'63s':48,'65o':49,
  '54s':50,'53s':48,'52s':47,
  '43s':49,'42s':47,'32s':48,
};

export function getEquity(hand: string): number {
  return PREFLOP_EQUITY[hand] ?? 48;
}

export function calcPotOdds(callAmt: number, potBeforeCall: number): number {
  if (callAmt <= 0) return 0;
  return Math.round((callAmt / (potBeforeCall + callAmt)) * 100);
}

// ── Hand Strength ──────────────────────────────────────────────────────────

export type HandStrength = 'Premium'|'Strong'|'Playable'|'Marginal'|'Weak';
const PREMIUM_SET = new Set(['AA','KK','QQ','AKs','AKo']);
const STRONG_SET = new Set(['JJ','TT','AQs','AQo','AJs','KQs','KQo']);
const PLAYABLE_SET = new Set(['99','88','77','ATs','AJo','KJs','KTs','QJs','QTs','JTs','T9s']);

export function getHandStrength(hand: string): HandStrength {
  if (PREMIUM_SET.has(hand)) return 'Premium';
  if (STRONG_SET.has(hand)) return 'Strong';
  if (PLAYABLE_SET.has(hand)) return 'Playable';
  if ((getEquity(hand) ?? 0) >= 55) return 'Marginal';
  return 'Weak';
}

export const STRENGTH_COLORS: Record<HandStrength, string> = {
  Premium:'#FFD700', Strong:'#2ECC71', Playable:'#27AE60',
  Marginal:'#E67E22', Weak:'#95A5A6',
};

// ── Mistakes ───────────────────────────────────────────────────────────────

export type MistakeType = 'folded_too_tight'|'called_too_loose'|'bad_sizing'|'ignored_pot_odds'|'bad_bluff'|'missed_value'|'limp_utg';

export const MISTAKE_LABELS: Record<MistakeType, string> = {
  folded_too_tight: 'Folding Too Tight',
  called_too_loose: 'Calling Too Loose',
  bad_sizing: 'Bad Bet Sizing',
  ignored_pot_odds: 'Ignored Pot Odds',
  bad_bluff: 'Bad Bluff Spot',
  missed_value: 'Missed Value',
  limp_utg: 'Limping Preflop',
};

export const MISTAKE_TIPS: Record<MistakeType, string> = {
  folded_too_tight: 'This hand is in the GTO opening or calling range for your position. Folding forfeits expected value.',
  called_too_loose: 'GTO dictates folding here. Calling out of range bleeds chips over hundreds of hands.',
  bad_sizing: 'Standard open is 2.5–3x BB. 3-bets are typically 3x the open (9–11x BB total). Correct sizing denies opponents proper odds.',
  ignored_pot_odds: 'Pot odds justify a call. You only need to win a fraction of the time to break even — and your hand has more equity than you think.',
  bad_bluff: 'This spot lacks bluffing equity. Prefer bluffing boards you can represent, with hands that block villain\'s calling range.',
  missed_value: 'With this hand strength, betting for value is more profitable than checking. Don\'t leave money on the table.',
  limp_utg: 'Limping in early position is exploitable. Either raise to build the pot and apply pressure, or fold if your hand isn\'t raise-worthy.',
};

// ── Range Grid ─────────────────────────────────────────────────────────────

export const GRID_RANKS: Rank[] = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
export function getGridCell(row: number, col: number): { hand: string; type: 'pair'|'suited'|'offsuit' } {
  const r1 = GRID_RANKS[row];
  const r2 = GRID_RANKS[col];
  if (row === col) return { hand:`${r1}${r2}`, type:'pair' };
  if (row < col) return { hand:`${r1}${r2}s`, type:'suited' };
  return { hand:`${r2}${r1}o`, type:'offsuit' };
}

// ── Board Texture & Post-Flop Logic ────────────────────────────────────────

export type BoardTexture = 'dry' | 'semiWet' | 'wet' | 'monotone' | 'paired';
export type MadeHand =
  | 'High Card' | 'One Pair' | 'Two Pair' | 'Three of a Kind'
  | 'Straight' | 'Flush' | 'Full House' | 'Four of a Kind' | 'Straight Flush';

export const BOARD_TEXTURE_INFO: Record<BoardTexture, { label: string; description: string; color: string }> = {
  dry: {
    label: 'Dry / Rainbow',
    color: '#27AE60',
    description: 'Low connectivity, no flush draw. C-bet frequently at ~25-33% pot — you have a range advantage and opponents will fold often.',
  },
  semiWet: {
    label: 'Semi-Wet',
    color: '#E67E22',
    description: 'One draw present (flush OR straight). Mix c-bets and checks. Size up with value; check your total misses.',
  },
  wet: {
    label: 'Very Wet',
    color: '#E74C3C',
    description: 'Heavy draw board — flush AND straight draws. Bet large with strong hands to deny equity. Check misses — you can be raised off bluffs.',
  },
  monotone: {
    label: 'Monotone',
    color: '#9B59B6',
    description: 'All one suit. Check frequently unless you hold the flush. Villain can easily represent a flush against your bets.',
  },
  paired: {
    label: 'Paired Board',
    color: '#95A5A6',
    description: 'One rank appears twice. Slight PF-raiser advantage on low pairs. Value bet trips or better; check marginal pairs.',
  },
};

export const MADE_HAND_COLORS: Record<MadeHand, string> = {
  'High Card': '#95A5A6',
  'One Pair': '#E67E22',
  'Two Pair': '#F1C40F',
  'Three of a Kind': '#2ECC71',
  'Straight': '#1ABC9C',
  'Flush': '#3498DB',
  'Full House': '#9B59B6',
  'Four of a Kind': '#E74C3C',
  'Straight Flush': '#FFD700',
};

export interface CbetRecommendation {
  action: 'bet' | 'check';
  sizingPct: number;
  reason: string;
}

export type DrawType = 'combo' | 'flush' | 'oesd' | 'gutshot' | 'overcard' | 'none';

export interface DrawInfo {
  drawType: DrawType;
  outs: number;
  equity: number;   // % via rule of 4/2
  label: string;   // e.g. "Flush Draw (9 outs, ~36%)"
}

/**
 * Count draw outs for hero's hole cards + board using rule-of-4/rule-of-2.
 * Returns the strongest draw found.
 */
export function countDrawOuts(
  holeCards: Card[],
  board: Card[],
  street: 'flop' | 'turn' | 'river',
): DrawInfo {
  const none: DrawInfo = { drawType: 'none', outs: 0, equity: 0, label: '' };
  if (board.length < 3 || holeCards.length < 2) return none;
  const cardsToRiver = street === 'flop' ? 2 : street === 'turn' ? 1 : 0;
  if (cardsToRiver === 0) return none;

  // ── Flush draw: any suit with exactly 4 cards total, hero has ≥1 ─────────
  const suitCounts: Record<string, number> = {};
  const holeSuitCounts: Record<string, number> = {};
  for (const c of [...holeCards, ...board]) suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  for (const c of holeCards) holeSuitCounts[c.suit] = (holeSuitCounts[c.suit] ?? 0) + 1;
  let hasFlushDraw = false;
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 4 && (holeSuitCounts[suit] ?? 0) >= 1) { hasFlushDraw = true; break; }
  }

  // ── Straight draw: work with rank values, ace is both 1 and 14 ───────────
  const allRankVals: number[] = [];
  for (const c of [...holeCards, ...board]) {
    const v = RANK_VALUES[c.rank];
    allRankVals.push(v);
    if (v === 14) allRankVals.push(1);
  }
  const uniqueRanks = [...new Set(allRankVals)].sort((a, b) => a - b);

  const holeRankSet = new Set<number>();
  for (const c of holeCards) {
    const v = RANK_VALUES[c.rank];
    holeRankSet.add(v);
    if (v === 14) holeRankSet.add(1);
  }

  // OESD: 4 strictly consecutive ranks, at least one from hole cards
  let hasOESD = false;
  for (let i = 0; i + 3 < uniqueRanks.length; i++) {
    const w = uniqueRanks.slice(i, i + 4);
    if (w[3] - w[0] === 3 && w.some(r => holeRankSet.has(r))) { hasOESD = true; break; }
  }

  // Gutshot: any window of 5 ranks where exactly 4 are present, at least one from hole
  let hasGutshot = false;
  if (!hasOESD) {
    for (let low = 1; low <= 10; low++) {
      const window = [low, low+1, low+2, low+3, low+4];
      const hits = window.filter(r => uniqueRanks.includes(r));
      if (hits.length === 4 && hits.some(r => holeRankSet.has(r))) { hasGutshot = true; break; }
    }
  }

  // ── Overcards (no pair or better on board) ────────────────────────────────
  const boardRankVals = board.map(c => RANK_VALUES[c.rank]);
  const maxBoardRank = Math.max(...boardRankVals);
  const holeRankArr = holeCards.map(c => RANK_VALUES[c.rank]);
  const overcardCount = new Set(holeRankArr.filter(r => r > maxBoardRank)).size;

  // ── Combine draws ─────────────────────────────────────────────────────────
  const m = cardsToRiver === 2 ? 4 : 2;
  const eq = (outs: number) => Math.min(outs * m, 90);

  if (hasFlushDraw && hasOESD) {
    const outs = 15; return { drawType: 'combo', outs, equity: eq(outs), label: `Combo Draw (${outs} outs, ~${eq(outs)}%)` };
  }
  if (hasFlushDraw && hasGutshot) {
    const outs = 12; return { drawType: 'combo', outs, equity: eq(outs), label: `Flush + Gutshot (${outs} outs, ~${eq(outs)}%)` };
  }
  if (hasFlushDraw) {
    const outs = 9; return { drawType: 'flush', outs, equity: eq(outs), label: `Flush Draw (${outs} outs, ~${eq(outs)}%)` };
  }
  if (hasOESD) {
    const outs = 8; return { drawType: 'oesd', outs, equity: eq(outs), label: `Straight Draw (${outs} outs, ~${eq(outs)}%)` };
  }
  if (hasGutshot) {
    const outs = 4; return { drawType: 'gutshot', outs, equity: eq(outs), label: `Gutshot (${outs} outs, ~${eq(outs)}%)` };
  }
  if (overcardCount >= 2) {
    const outs = 6; return { drawType: 'overcard', outs, equity: eq(outs), label: `Two Overcards (${outs} outs, ~${eq(outs)}%)` };
  }
  if (overcardCount === 1) {
    const outs = 3; return { drawType: 'overcard', outs, equity: eq(outs), label: `Overcard (${outs} outs, ~${eq(outs)}%)` };
  }

  return none;
}

export interface BoardTextureResult {
  texture: BoardTexture;
  label: string;
  description: string;
  color: string;
  hasPair: boolean;
  isMonotone: boolean;
  hasFlushDraw: boolean;
  boardRankLabels: string;
}

function _checkStraight(vals: number[]): boolean {
  const unique = [...new Set(vals)];
  if (unique.includes(14)) unique.push(1);
  unique.sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    run = unique[i] === unique[i - 1] + 1 ? run + 1 : 1;
    if (run >= 5) return true;
  }
  return false;
}

export function evaluateMadeHand(holeCards: Card[], board: Card[]): { hand: MadeHand; rank: number } {
  const all = [...holeCards, ...board];
  const rankCounts: Record<string, number> = {};
  const suitCounts: Record<string, number> = {};
  for (const c of all) {
    rankCounts[c.rank] = (rankCounts[c.rank] ?? 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const hasFlush = Object.values(suitCounts).some(v => v >= 5);
  const hasStraight = _checkStraight(all.map(c => RANK_VALUES[c.rank]));

  if (hasFlush && hasStraight) return { hand: 'Straight Flush', rank: 9 };
  if (counts[0] === 4) return { hand: 'Four of a Kind', rank: 8 };
  if (counts[0] === 3 && counts[1] >= 2) return { hand: 'Full House', rank: 7 };
  if (hasFlush) return { hand: 'Flush', rank: 6 };
  if (hasStraight) return { hand: 'Straight', rank: 5 };
  if (counts[0] === 3) return { hand: 'Three of a Kind', rank: 4 };
  if (counts[0] === 2 && counts[1] === 2) return { hand: 'Two Pair', rank: 3 };
  if (counts[0] === 2) return { hand: 'One Pair', rank: 2 };
  return { hand: 'High Card', rank: 1 };
}

export function analyzeBoardTexture(board: Card[]): BoardTextureResult {
  const fallback: BoardTextureResult = {
    texture: 'dry', label: 'Dry', description: BOARD_TEXTURE_INFO.dry.description,
    color: '#27AE60', hasPair: false, isMonotone: false, hasFlushDraw: false, boardRankLabels: '',
  };
  if (board.length < 3) return fallback;

  const suits = board.map(c => c.suit);
  const ranks = board.map(c => c.rank);
  const uniqueSuits = new Set(suits);
  const uniqueRanks = new Set(ranks);
  const isMonotone = uniqueSuits.size === 1;
  const hasPair = uniqueRanks.size < board.length;

  let hasFlushDraw = false;
  if (!isMonotone) {
    for (const s of Array.from(uniqueSuits)) {
      if (suits.filter(x => x === s).length >= 2) { hasFlushDraw = true; break; }
    }
  }

  const rankVals = board.slice(0, 3).map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  const spread = rankVals[rankVals.length - 1] - rankVals[0];
  const isConnected = spread <= 4;

  let texture: BoardTexture;
  if (isMonotone) texture = 'monotone';
  else if (hasPair) texture = 'paired';
  else if (isConnected && hasFlushDraw) texture = 'wet';
  else if (isConnected || hasFlushDraw) texture = 'semiWet';
  else texture = 'dry';

  const info = BOARD_TEXTURE_INFO[texture];
  const boardRankLabels = board.map(c => c.rank + c.suit).join(' ');
  return { texture, label: info.label, description: info.description, color: info.color, hasPair, isMonotone, hasFlushDraw, boardRankLabels };
}

export function getCbetRecommendation(
  texture: BoardTexture,
  madeHandRank: number,
  isAggressor: boolean,
  facingVillainBet: boolean,
  drawInfo?: DrawInfo,
): CbetRecommendation {
  const hasStrongDraw = drawInfo &&
    (drawInfo.drawType === 'combo' || drawInfo.drawType === 'flush' || drawInfo.drawType === 'oesd');

  if (facingVillainBet) {
    if (madeHandRank >= 5) return { action: 'bet', sizingPct: 0, reason: 'Very strong hand facing a bet — raise to build the pot.' };
    if (madeHandRank >= 3) return { action: 'bet', sizingPct: 0, reason: 'Strong made hand — call or raise depending on sizing.' };
    if (madeHandRank === 2) return { action: 'bet', sizingPct: 0, reason: 'One pair: call if pot odds justify, fold to oversized bets.' };
    if (hasStrongDraw) return { action: 'bet', sizingPct: 0, reason: `Call with your ${drawInfo!.label} — you have ~${drawInfo!.equity}% equity. If pot odds are satisfied, calling is +EV. Strong draws can also raise as semi-bluffs.` };
    return { action: 'check', sizingPct: 0, reason: 'Weak holding facing aggression — fold unless you have a strong draw.' };
  }

  if (!isAggressor) {
    if (madeHandRank >= 4) return { action: 'bet', sizingPct: 50, reason: 'Donk-bet strong value hands for protection and to build the pot.' };
    if (hasStrongDraw) return { action: 'bet', sizingPct: 50, reason: `Semi-bluff donk-bet with your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — you can win the pot now or improve to the best hand.` };
    return { action: 'check', sizingPct: 0, reason: 'Check to the PF aggressor — they have the range advantage and will often c-bet.' };
  }

  switch (texture) {
    case 'dry':
      if (hasStrongDraw) return { action: 'bet', sizingPct: 50, reason: `Semi-bluff c-bet with your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — on a dry board your fold equity stacks on top of strong draw equity.` };
      return { action: 'bet', sizingPct: 33, reason: 'Dry board is perfect for a small, high-frequency c-bet. You have a range advantage and opponents fold a lot.' };
    case 'semiWet':
      if (madeHandRank >= 3) return { action: 'bet', sizingPct: 60, reason: 'Two pair+ on semi-wet board: size up to deny draw equity.' };
      if (madeHandRank === 2) return { action: 'bet', sizingPct: 50, reason: 'One pair: medium c-bet for value + protection vs draws.' };
      if (hasStrongDraw) return { action: 'bet', sizingPct: 55, reason: `Semi-bluff c-bet with your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — size up slightly to deny opponent's counter-draws.` };
      return { action: 'check', sizingPct: 0, reason: 'Semi-wet miss: check to balance your range and avoid getting raised off your hand.' };
    case 'wet':
      if (madeHandRank >= 4) return { action: 'bet', sizingPct: 75, reason: 'Very strong hand on a wet board — size up to charge all the draws.' };
      if (madeHandRank === 3) return { action: 'bet', sizingPct: 66, reason: 'Trips on wet board: charge the flush and straight draws.' };
      if (hasStrongDraw) return { action: 'bet', sizingPct: 60, reason: `Semi-bluff c-bet with your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — your draw equity is real here; bet to put pressure on weaker made hands.` };
      return { action: 'check', sizingPct: 0, reason: 'Wet board miss: checking is better — bluffs are easy to raise here.' };
    case 'monotone':
      if (madeHandRank >= 6) return { action: 'bet', sizingPct: 50, reason: 'You have the flush — bet for value on a monotone board.' };
      if (hasStrongDraw && drawInfo!.drawType === 'flush') return { action: 'bet', sizingPct: 50, reason: `Bet your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — on a monotone board you have the same suit represented.` };
      return { action: 'check', sizingPct: 0, reason: 'Check monotone without a flush. Villain can always represent a flush against your bets.' };
    case 'paired':
      if (madeHandRank >= 4) return { action: 'bet', sizingPct: 50, reason: 'Trips or better on paired board — solid value bet.' };
      if (madeHandRank >= 2) return { action: 'bet', sizingPct: 33, reason: 'Small bet on paired board exploits your range advantage as the PF raiser.' };
      if (hasStrongDraw) return { action: 'bet', sizingPct: 40, reason: `Semi-bluff c-bet with your ${drawInfo!.label} (~${drawInfo!.equity}% equity) — your draw equity is independent of the paired board.` };
      return { action: 'check', sizingPct: 0, reason: 'Check misses on paired boards — hard to credibly represent a big hand.' };
  }
}

// ── Villain Post-Flop Simulation (hand-aware) ──────────────────────────────

/**
 * Simulate villain's post-flop action.
 *
 * heroAction:
 *   'none'  — villain acts first (no hero action yet)
 *   'check' — hero checked, villain can bet or check
 *   'bet'   — hero bet, villain can fold/call/raise
 *   'raise' — hero raised villain's bet, villain can fold/call
 */
export function simulateVillainPostFlop(
  playerType: PlayerType,
  texture: BoardTexture,
  potBB: number,
  heroAction: 'none' | 'check' | 'bet' | 'raise',
  villainCards: Card[],
  board: Card[],
): { action: 'fold'|'check'|'call'|'bet'|'raise'; betPct: number; betBB: number } {
  const rand = Math.random();
  const handRank = board.length >= 3 ? evaluateMadeHand(villainCards, board).rank : 0;
  const aggrMod = texture === 'wet' ? 1.2 : texture === 'dry' ? 0.75 : 1.0;

  // ── Villain opens or responds to a check ───────────────────────────────
  if (heroAction === 'none' || heroAction === 'check') {
    const baseFreq: Record<PlayerType, number> = {
      TAG: 0.40, LAG: 0.62, Nit: 0.20, Fish: 0.30, Maniac: 0.82,
    };
    const handBonus = handRank >= 4 ? 0.22 : handRank >= 3 ? 0.12 : handRank >= 2 ? 0.04 : -0.06;
    const freq = Math.min((baseFreq[playerType] + handBonus) * aggrMod, 0.95);

    if (rand < freq) {
      const betPct =
        playerType === 'Maniac' ? (
          handRank >= 4 ? 115 + Math.floor(Math.random() * 40) : // monster: overbet 115-155%
          handRank >= 2 ? 80  + Math.floor(Math.random() * 35) : // pair+:   large 80-115%
                          45  + Math.floor(Math.random() * 40)   // air:     bluff 45-85%
        ) :
        playerType === 'Fish'   ? 50 + Math.floor(Math.random() * 30) :
        playerType === 'Nit'    ? 55 + Math.floor(Math.random() * 20) :
        35 + Math.floor(Math.random() * 40);
      const betBB = Math.max(0.5, Math.round((betPct / 100) * potBB * 10) / 10);
      return { action: 'bet', betPct, betBB };
    }
    return { action: 'check', betPct: 0, betBB: 0 };
  }

  // ── Villain responds to hero bet or raise ───────────────────────────────
  const rankBucket: 0|1|2|3 = handRank <= 1 ? 0 : handRank === 2 ? 1 : handRank === 3 ? 2 : 3;

  const foldTable: Record<PlayerType, [number, number, number, number]> = {
    Fish:   [0.00, 0.00, 0.00, 0.00],
    Maniac: [0.06, 0.03, 0.01, 0.00],
    Nit:    [0.82, 0.55, 0.22, 0.04],
    TAG:    [0.72, 0.40, 0.12, 0.02],
    LAG:    [0.52, 0.22, 0.06, 0.00],
  };
  const raiseTable: Record<PlayerType, [number, number, number, number]> = {
    Fish:   [0.02, 0.03, 0.06, 0.10],
    Maniac: [0.28, 0.40, 0.55, 0.70],
    Nit:    [0.00, 0.00, 0.08, 0.30],
    TAG:    [0.00, 0.05, 0.18, 0.40],
    LAG:    [0.05, 0.12, 0.28, 0.52],
  };

  let foldProb = foldTable[playerType][rankBucket];
  let raiseProb = raiseTable[playerType][rankBucket];

  // Facing a re-raise: fold more, almost never 3-bet
  if (heroAction === 'raise') {
    foldProb = Math.min(foldProb * 1.5, 0.95);
    raiseProb = 0; // no 3-bet for simplicity
  }

  if (rand < foldProb) {
    return { action: 'fold', betPct: 0, betBB: 0 };
  }

  if (heroAction === 'bet' && rand < foldProb + raiseProb) {
    const raisePct =
      playerType === 'Maniac' ? (
        handRank >= 4 ? 150 + Math.floor(Math.random() * 50) : // monster: massive 150-200%
        handRank >= 2 ? 100 + Math.floor(Math.random() * 40) : // pair+:   big 100-140%
                        65  + Math.floor(Math.random() * 55)   // air:     bluff-raise 65-120%
      ) :
      playerType === 'LAG'    ? 90  + Math.floor(Math.random() * 30) :
      75 + Math.floor(Math.random() * 25);
    const raiseBB = Math.max(1, Math.round((raisePct / 100) * potBB * 10) / 10);
    return { action: 'raise', betPct: raisePct, betBB: raiseBB };
  }

  return { action: 'call', betPct: 0, betBB: 0 };
}

// ── Showdown Hand Comparison ───────────────────────────────────────────────

/**
 * Compute a numeric score array for lexicographic hand comparison.
 * Index 0 = hand rank (1-9), subsequent values break ties within that rank.
 */
function _handScore(holeCards: Card[], board: Card[]): number[] {
  const all = [...holeCards, ...board];
  const { rank } = evaluateMadeHand(holeCards, board);

  // Build [(cardValue, count)] sorted by count desc then value desc
  const cnts: Record<string, number> = {};
  for (const c of all) cnts[c.rank] = (cnts[c.rank] ?? 0) + 1;
  const ranked = Object.entries(cnts)
    .map(([r, n]) => [RANK_VALUES[r as Rank], n] as [number, number])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  switch (rank) {
    case 9: { // Straight Flush — highest straight within flush suit
      const suitCts: Record<string, number> = {};
      for (const c of all) suitCts[c.suit] = (suitCts[c.suit] ?? 0) + 1;
      const fs = Object.entries(suitCts).find(([, n]) => n >= 5)?.[0] ?? '';
      const sfVals = [...new Set(all.filter(c => c.suit === fs).map(c => RANK_VALUES[c.rank]))];
      if (sfVals.includes(14)) sfVals.push(1);
      sfVals.sort((a, b) => b - a);
      for (let i = 0; i <= sfVals.length - 5; i++) {
        let ok = true;
        for (let j = 0; j < 4; j++) if (sfVals[i + j] - sfVals[i + j + 1] !== 1) { ok = false; break; }
        if (ok) return [rank, sfVals[i]];
      }
      return [rank, 0];
    }
    case 8: { // Four of a Kind: [8, quad, best-kicker]
      const quad = ranked[0][0];
      const kicker = ranked.find(([, n]) => n < 4)?.[0] ?? 0;
      return [rank, quad, kicker];
    }
    case 7: { // Full House: [7, trips-rank, pair-rank]
      return [rank, ranked[0][0], ranked[1][0]];
    }
    case 6: { // Flush: [6, c1, c2, c3, c4, c5] — top 5 of flush suit
      const suitCts: Record<string, number> = {};
      for (const c of all) suitCts[c.suit] = (suitCts[c.suit] ?? 0) + 1;
      const fs = Object.entries(suitCts).find(([, n]) => n >= 5)?.[0] ?? '';
      const fv = all.filter(c => c.suit === fs).map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
      return [rank, ...fv.slice(0, 5)];
    }
    case 5: { // Straight: [5, high-card]
      const uv = [...new Set(all.map(c => RANK_VALUES[c.rank]))];
      if (uv.includes(14)) uv.push(1);
      uv.sort((a, b) => b - a);
      for (let i = 0; i <= uv.length - 5; i++) {
        let ok = true;
        for (let j = 0; j < 4; j++) if (uv[i + j] - uv[i + j + 1] !== 1) { ok = false; break; }
        if (ok) return [rank, uv[i]];
      }
      return [rank, 0];
    }
    case 4: { // Three of a Kind: [4, trips, k1, k2]
      const trips = ranked[0][0];
      const kickers = ranked.filter(([, n]) => n < 3).map(([v]) => v).slice(0, 2);
      return [rank, trips, ...kickers];
    }
    case 3: { // Two Pair: [3, high-pair, low-pair, kicker]
      // With 7 cards there can be 3 pairs; pick highest two, kicker from the rest
      const pairs = ranked.filter(([, n]) => n >= 2).map(([v]) => v).slice(0, 2);
      const used = new Set(pairs);
      const kicker = ranked.filter(([v]) => !used.has(v)).map(([v]) => v)[0] ?? 0;
      return [rank, ...pairs, kicker];
    }
    case 2: { // One Pair: [2, pair, k1, k2, k3]
      const pair = ranked[0][0];
      const kickers = ranked.filter(([, n]) => n === 1).map(([v]) => v).slice(0, 3);
      return [rank, pair, ...kickers];
    }
    default: { // High Card: [1, c1..c5]
      return [rank, ...ranked.map(([v]) => v).slice(0, 5)];
    }
  }
}

export function evaluateHandWinner(
  heroCards: Card[],
  villainCards: Card[],
  board: Card[],
): 'hero' | 'villain' | 'tie' {
  const heroScore = _handScore(heroCards, board);
  const villainScore = _handScore(villainCards, board);
  const len = Math.max(heroScore.length, villainScore.length);
  for (let i = 0; i < len; i++) {
    const h = heroScore[i] ?? 0;
    const v = villainScore[i] ?? 0;
    if (h > v) return 'hero';
    if (v > h) return 'villain';
  }
  return 'tie';
}

// ── Preflop Action Simulation for Bots ────────────────────────────────────

export function simulateBotAction(
  playerType: PlayerType,
  position: Position,
  facingRaise: boolean,
  raiseAmount: number,
  potSize: number,
): 'fold'|'call'|'raise' {
  const info = PLAYER_TYPE_INFO[playerType];
  const rand = Math.random() * 100;
  if (!facingRaise) {
    if (rand < info.pfr) return 'raise';
    if (rand < info.vpip) return 'call';
    return 'fold';
  } else {
    const odds = calcPotOdds(raiseAmount, potSize);
    const callThresh = info.vpip * 0.6;
    const reraise = info.pfr * 0.3;
    if (rand < reraise) return 'raise';
    if (rand < callThresh || odds < 25) return 'call';
    return 'fold';
  }
}

// GTO-correct preflop action: uses the bot's actual cards vs position ranges.
// No limping, no random variance — pure range adherence.
export function simulateBotGTOAction(
  cards: Card[],
  position: Position,
  facingRaise: boolean,
  raiseAmount: number,
  potSize: number,
): 'fold'|'call'|'raise' {
  if (cards.length < 2) return 'fold';
  const notation = getHandNotation(cards[0], cards[1]);

  if (!facingRaise) {
    // GTO opening: raise if in range, fold otherwise — no limping ever
    return GTO_RANGES[position].has(notation) ? 'raise' : 'fold';
  }

  // Facing a raise — BB defends the widest (already has 1BB invested)
  if (position === 'BB') {
    if (THREEBET_VALUE.has(notation)) return 'raise';
    if (BB_DEFENSE.has(notation)) return 'call';
    return 'fold';
  }

  // All other positions: 3-bet premium value, 3-bet bluff some, cold-call in-range
  // hands that have the equity to justify it, fold everything else
  if (THREEBET_VALUE.has(notation)) return 'raise';
  if (THREEBET_BLUFF.has(notation) && GTO_RANGES[position].has(notation)) return 'raise';

  if (GTO_RANGES[position].has(notation)) {
    const equity = getEquity(notation);
    const odds = calcPotOdds(raiseAmount, potSize);
    // Only cold-call when we have a meaningful equity edge over the pot odds
    if (equity > odds + 5) return 'call';
  }

  return 'fold';
}
