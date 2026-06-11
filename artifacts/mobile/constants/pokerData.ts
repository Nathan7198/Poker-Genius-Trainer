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
): CbetRecommendation {
  if (facingVillainBet) {
    if (madeHandRank >= 5) return { action: 'bet', sizingPct: 0, reason: 'Very strong hand facing a bet — raise to build the pot.' };
    if (madeHandRank >= 3) return { action: 'bet', sizingPct: 0, reason: 'Strong made hand — call or raise depending on sizing.' };
    if (madeHandRank === 2) return { action: 'bet', sizingPct: 0, reason: 'One pair: call if pot odds justify, fold to oversized bets.' };
    return { action: 'check', sizingPct: 0, reason: 'Weak holding facing aggression — fold unless you have a strong draw.' };
  }
  if (!isAggressor) {
    if (madeHandRank >= 4) return { action: 'bet', sizingPct: 50, reason: 'Donk-bet strong value hands for protection and to build the pot.' };
    return { action: 'check', sizingPct: 0, reason: 'Check to the PF aggressor — they have the range advantage and will often c-bet.' };
  }
  switch (texture) {
    case 'dry':
      return { action: 'bet', sizingPct: 33, reason: 'Dry board is perfect for a small, high-frequency c-bet. You have a range advantage and opponents fold a lot.' };
    case 'semiWet':
      if (madeHandRank >= 3) return { action: 'bet', sizingPct: 60, reason: 'Two pair+ on semi-wet board: size up to deny draw equity.' };
      if (madeHandRank === 2) return { action: 'bet', sizingPct: 50, reason: 'One pair: medium c-bet for value + protection vs draws.' };
      return { action: 'check', sizingPct: 0, reason: 'Semi-wet miss: check to balance your range and avoid getting raised off your hand.' };
    case 'wet':
      if (madeHandRank >= 4) return { action: 'bet', sizingPct: 75, reason: 'Very strong hand on a wet board — size up to charge all the draws.' };
      if (madeHandRank === 3) return { action: 'bet', sizingPct: 66, reason: 'Trips on wet board: charge the flush and straight draws.' };
      return { action: 'check', sizingPct: 0, reason: 'Wet board miss: checking is better — bluffs are easy to raise here.' };
    case 'monotone':
      if (madeHandRank >= 6) return { action: 'bet', sizingPct: 50, reason: 'You have the flush — bet for value on a monotone board.' };
      return { action: 'check', sizingPct: 0, reason: 'Check monotone without a flush. Villain can always represent a flush against your bets.' };
    case 'paired':
      if (madeHandRank >= 4) return { action: 'bet', sizingPct: 50, reason: 'Trips or better on paired board — solid value bet.' };
      if (madeHandRank >= 2) return { action: 'bet', sizingPct: 33, reason: 'Small bet on paired board exploits your range advantage as the PF raiser.' };
      return { action: 'check', sizingPct: 0, reason: 'Check misses on paired boards — hard to credibly represent a big hand.' };
  }
}

export function simulateVillainPostFlop(
  playerType: PlayerType,
  texture: BoardTexture,
  potBB: number,
): { action: 'bet' | 'check'; betPct: number; betBB: number } {
  const rand = Math.random();
  const aggrMod = texture === 'wet' ? 1.25 : texture === 'dry' ? 0.7 : 1.0;
  const freqs: Record<PlayerType, number> = { TAG: 0.38, LAG: 0.62, Nit: 0.18, Fish: 0.28, Maniac: 0.82 };
  const freq = Math.min(freqs[playerType] * aggrMod, 0.95);
  if (rand < freq) {
    const betPct = playerType === 'Maniac' ? 90 + Math.floor(Math.random() * 40) :
                   playerType === 'Fish'   ? 50 + Math.floor(Math.random() * 30) :
                   35 + Math.floor(Math.random() * 35);
    const betBB = Math.round((betPct / 100) * potBB * 10) / 10;
    return { action: 'bet', betPct, betBB };
  }
  return { action: 'check', betPct: 0, betBB: 0 };
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
