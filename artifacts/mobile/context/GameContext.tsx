import React, {
  createContext, useCallback, useContext, useReducer,
} from 'react';
import {
  Card, MistakeType, Position, POSITIONS, PlayerType, Difficulty, Rank, Suit,
  createDeck, shuffleDeck, getHandNotation, getEquity, calcPotOdds,
  getHandStrength, GTO_RANGES, BB_DEFENSE, simulateBotAction, simulateBotGTOAction,
  THREEBET_VALUE, RANK_VALUES,
  BoardTextureResult, MadeHand, CbetRecommendation, DrawInfo,
  analyzeBoardTexture, evaluateMadeHand, getCbetRecommendation,
  simulateVillainPostFlop, simulateVillainGTOPostFlop, evaluateHandWinner, countDrawOuts,
  PREFLOP_ORDER, POSTFLOP_ORDER, getPositionsForSize,
} from '@/constants/pokerData';

export type GamePhase = 'idle'|'preflop'|'flop'|'turn'|'river'|'showdown';
export type HeroAction = 'fold'|'check'|'call'|'raise'|'limp';
export type PostFlopHeroAction = 'check'|'call'|'fold'|'bet'|'raise';
export type PostFlopStreet = 'flop'|'turn'|'river';
export type VillainActionType = 'fold'|'check'|'call'|'bet'|'raise';

export interface BotPlayer {
  id: number;
  name: string;
  type: PlayerType;
  position: Position;
  cards: Card[];
  stack: number;
  currentBet: number;
  action: string|null;
  isActive: boolean;
  isDealer: boolean;
}

export interface ActionContext {
  facingRaise: boolean;
  raiseAmount: number;
  potSize: number;
  calledByCount: number;
  raisedByPosition: Position|null;
}

export interface HandAnalysis {
  handNotation: string;
  heroPosition: Position;
  heroAction: HeroAction;
  raiseAmountBB: number;
  isGTO: boolean;
  gtoAction: 'raise'|'call'|'fold'|'check';
  gtoRaiseSize?: number;
  equity: number;
  potOdds: number;
  mistakes: MistakeType[];
  advice: string;
  exploitTip: string;
  handStrength: ReturnType<typeof getHandStrength>;
}

export interface PostFlopStreetAnalysis {
  street: PostFlopStreet;
  boardTexture: BoardTextureResult;
  madeHand: MadeHand;
  madeHandRank: number;
  drawInfo: DrawInfo;
  heroAction: PostFlopHeroAction;
  betPct: number;
  betBB: number;
  /** The villain's action that hero was facing / responding to */
  villainAction: VillainActionType;
  villainBetPct: number;
  villainBetBB: number;
  /**
   * Villain's final response AFTER hero's action.
   * e.g. hero bets → villain raises/calls/folds.
   * null when there is no further villain action (check-check, hero fold, etc.)
   */
  villainResponse: VillainActionType | null;
  villainResponseBetBB: number;
  cbetRecommendation: CbetRecommendation;
  isGTO: boolean;
  gtoAction: PostFlopHeroAction;
  gtoSizingPct: number;
  mistakes: MistakeType[];
  advice: string;
  exploitTip: string;
  heroIsAggressor: boolean;
}

export interface VillainPostFlopAction {
  action: VillainActionType;
  betPct: number;
  betBB: number;
}

export type ShowdownResult = 'hero'|'villain'|'tie';

export interface CustomHandConfig {
  heroPosition: Position | null;
  heroCard1: { rank: string; suit: string } | null;
  heroCard2: { rank: string; suit: string } | null;
  opponentType: PlayerType | null;
  startStreet: 'preflop' | 'flop' | 'turn' | 'river';
  communityCards: ({ rank: string; suit: string } | null)[];
}

export interface GameState {
  phase: GamePhase;
  deck: Card[];
  heroCards: Card[];
  communityCards: Card[];
  heroPosition: Position;
  heroStack: number;
  heroBet: number;
  pot: number;
  currentBet: number;
  players: BotPlayer[];
  difficulty: Difficulty;
  handNumber: number;
  actionCtx: ActionContext;
  analysis: HandAnalysis|null;
  postFlopAnalysis: PostFlopStreetAnalysis|null;
  postFlopAnalysisHistory: PostFlopStreetAnalysis[];
  showAnalysis: boolean;
  lastHeroAction: HeroAction|null;
  heroIsAggressor: boolean;
  villainPostFlopAction: VillainPostFlopAction|null;
  mainVillainType: PlayerType;
  mainVillainPosition: Position;
  /** True when hero is OOP (SB/BB) and acts FIRST on each post-flop street */
  heroActsFirst: boolean;
  postFlopStreetsDone: PostFlopStreet[];
  /** Rolling list of recent flop signatures (rank+suit sorted) — prevents board repeats */
  recentBoardSigs: string[];
  /** Winner of the current hand (set at showdown) */
  showdownResult: ShowdownResult | null;
  /** True when villain folded — hero wins without a showdown */
  villainFolded: boolean;
  /**
   * Set to the current street when hero (OOP) checked and villain bet in
   * response — hero still needs to fold/call/raise before the street ends.
   * Null at all other times.
   */
  heroCheckedStreet: PostFlopStreet | null;
  /** Total chips hero has put into the pot this hand (for profit tracking) */
  heroTotalInvestedBB: number;
  /** 'full' = all streets, 'preflop' = preflop drill only, 'gto' = full hand with always-on GTO coaching, 'custom' = user-configured scenario */
  trainingMode: 'full' | 'preflop' | 'gto' | 'custom';
  /** Number of players at the table (2–9). Default 6 (6-max). */
  tableSize: number;
  /** Non-hero positions still active in the hand (post-preflop) */
  handActivePlayers: Position[];
  /** Current street's action for each non-hero active player (for display + pot) */
  playerStreetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>>;
}

type GameAction =
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_TRAINING_MODE'; mode: 'full' | 'preflop' | 'gto' | 'custom' }
  | { type: 'SET_TABLE_SIZE'; tableSize: number }
  | { type: 'START_HAND' }
  | { type: 'START_CUSTOM_HAND'; config: CustomHandConfig }
  | { type: 'GO_IDLE' }
  | { type: 'HERO_ACT'; action: HeroAction; raiseBB?: number }
  | { type: 'HERO_POSTFLOP_ACT'; action: PostFlopHeroAction; betPct?: number }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'FOLD_TO_VILLAIN_BET' }
  | { type: 'DISMISS_ANALYSIS' }
  | { type: 'RESET' };

const PLAYER_NAMES = ['Alex','Jordan','Morgan','Riley','Casey','Taylor','Drew','Quinn'];
const PLAYER_TYPE_LIST: PlayerType[] = ['TAG','LAG','Nit','Fish','Maniac','TAG','LAG','Nit'];
const BOARD_SIG_WINDOW = 15;

function buildInitialState(): GameState {
  return {
    phase: 'idle', deck: [], heroCards: [], communityCards: [],
    heroPosition: 'BTN', heroStack: 100, heroBet: 0, pot: 0, currentBet: 0,
    players: [], difficulty: 'Beginner', handNumber: 0,
    actionCtx: { facingRaise: false, raiseAmount: 0, potSize: 1.5, calledByCount: 0, raisedByPosition: null },
    analysis: null, postFlopAnalysis: null, postFlopAnalysisHistory: [],
    showAnalysis: false, lastHeroAction: null, heroIsAggressor: false,
    villainPostFlopAction: null, mainVillainType: 'TAG',
    mainVillainPosition: 'BTN', heroActsFirst: false,
    postFlopStreetsDone: [], recentBoardSigs: [],
    showdownResult: null, villainFolded: false,
    heroCheckedStreet: null, heroTotalInvestedBB: 0,
    trainingMode: 'full', tableSize: 6,
    handActivePlayers: [], playerStreetActions: {},
  };
}

function dealCards(deck: Card[], count: number): [Card[], Card[]] {
  const hand = deck.slice(0, count).map(c => ({ ...c, faceUp: true }));
  return [hand, deck.slice(count)];
}

function flopSig(cards: Card[]): string {
  return cards.slice(0, 3).map(c => `${c.rank}${c.suit}`).sort().join('|');
}

function getExploitTipPreflop(villainType: PlayerType): string {
  switch (villainType) {
    case 'Fish':
      return 'vs Fish (VPIP 50%): Post-flop — size up big for value every street. They call with bottom pair. Never bluff.';
    case 'Maniac':
      return 'vs Maniac (PFR 50%): Their opening range is extremely wide. Even marginal hands have solid equity here.';
    case 'Nit':
      return 'vs Nit (VPIP 10%): Steal their blinds freely — they fold too much. When they 3-bet, fold unless you hold a premium.';
    case 'LAG':
      return 'vs LAG (VPIP 35%): 3-bet light in position to exploit their wide range. Post-flop, call down lighter — they bluff frequently.';
    default:
      return '';
  }
}

function getExploitTipPostFlop(
  villainType: PlayerType, heroAction: PostFlopHeroAction,
  madeHandRank: number, facingBet: boolean, mistakes: MistakeType[],
): string {
  switch (villainType) {
    case 'Fish':
      if (mistakes.includes('bad_bluff')) return 'vs Fish: NEVER bluff — they call with any pair or draw. Check/fold with air.';
      if (heroAction === 'bet' || heroAction === 'raise') return 'vs Fish: Good — size up bigger. Fish call too wide so maximize value every street.';
      if (heroAction === 'check' && madeHandRank >= 3) return 'vs Fish: Consider betting for thin value — Fish call down with weak hands on every street.';
      return 'vs Fish: Value bet relentlessly. Never bluff — they call everything down.';
    case 'Maniac':
      if (facingBet && heroAction === 'fold') return 'vs Maniac: Too tight! Maniac bets almost any two cards — call down much wider than GTO.';
      if (heroAction === 'check' && madeHandRank >= 4) return 'vs Maniac: Smart check-trap — they will bet their entire range. Let them hang themselves.';
      if (facingBet && (heroAction === 'call' || heroAction === 'raise')) return "vs Maniac: Good call-down. Their range is extremely wide — you're likely ahead.";
      return 'vs Maniac: Let them overbet into you. Trap with strong hands and raise for value.';
    case 'Nit':
      if (facingBet) return 'vs Nit: When a Nit bets, they have strong holdings. Fold unless you have two pair or better.';
      if (heroAction === 'bet' || heroAction === 'raise') return 'vs Nit: Good aggression — Nits fold to c-bets too often. Bet wide on dry boards.';
      return "vs Nit: Steal freely when they're passive. Respect their raises — they rarely bluff.";
    case 'LAG':
      if (facingBet && heroAction === 'fold') return 'vs LAG: Too tight! LAG bluffs at high frequency — call down with top pair or better.';
      if (heroAction === 'check' && madeHandRank >= 4) return 'vs LAG: Good check-trap. LAG will bet almost anything — let them bluff into you.';
      if (facingBet && (heroAction === 'call' || heroAction === 'raise')) return 'vs LAG: Good call-down. Their high bluff frequency makes wider calls very profitable.';
      return 'vs LAG: Call down lighter than GTO. Let them bluff into you, then raise for value.';
    default:
      return '';
  }
}

function buildPreflopAnalysis(
  heroCards: Card[], heroPosition: Position, action: HeroAction,
  raiseBB: number, actionCtx: ActionContext, villainType: PlayerType,
): HandAnalysis {
  const notation = getHandNotation(heroCards[0], heroCards[1]);
  const equity = getEquity(notation);
  const heroAlreadyIn = heroPosition === 'BB' ? 1 : heroPosition === 'SB' ? 0.5 : 0;
  const potOdds = calcPotOdds(Math.max(0, actionCtx.raiseAmount - heroAlreadyIn), actionCtx.potSize);
  const strength = getHandStrength(notation);
  const inRange = GTO_RANGES[heroPosition].has(notation);
  const inDefense = BB_DEFENSE.has(notation);
  const inThreebet = THREEBET_VALUE.has(notation);
  const mistakes: MistakeType[] = [];
  const canCheck = heroPosition === 'BB' && !actionCtx.facingRaise;
  let gtoAction: 'raise'|'call'|'fold'|'check' = 'fold';

  if (!actionCtx.facingRaise) {
    gtoAction = inRange ? 'raise' : (canCheck ? 'check' : 'fold');
    if (action === 'fold' && (inRange || canCheck)) mistakes.push('folded_too_tight');
    if (action === 'call' && !canCheck) mistakes.push('limp_utg');
    if ((action === 'raise' || action === 'call') && !inRange) mistakes.push('called_too_loose');
    if (action === 'raise' && raiseBB < 2) mistakes.push('bad_sizing');
  } else {
    const defRange = heroPosition === 'BB' ? inDefense : inThreebet;
    gtoAction = defRange ? (inThreebet ? 'raise' : 'call') : 'fold';
    if (action === 'fold' && defRange) mistakes.push('folded_too_tight');
    if ((action === 'call' || action === 'raise') && !defRange) {
      mistakes.push(equity < potOdds ? 'ignored_pot_odds' : 'called_too_loose');
    }
  }

  const isGTO = mistakes.length === 0;
  let advice = '';
  if (isGTO) {
    if (gtoAction === 'check') {
      advice = `Correct! ${notation} from BB — no raise to face, so taking the free flop is the right play.`;
    } else {
      advice = `Correct! ${notation} (${strength}) is the right ${gtoAction} from ${heroPosition}.`;
    }
  } else if (mistakes.includes('folded_too_tight')) {
    if (canCheck) {
      advice = `Never fold a free check from BB! ${notation} costs nothing to see the flop — always check when there's no raise.`;
    } else {
      advice = `${notation} is in your GTO range from ${heroPosition}. ${inRange ? 'Open to ~3BB' : 'Defend vs the raise'}.`;
    }
  } else if (mistakes.includes('called_too_loose')) {
    advice = `${notation} is outside your profitable ${heroPosition} range. Fold to avoid dominated situations.`;
  } else if (mistakes.includes('limp_utg')) {
    advice = `Limping is exploitable. Either open-raise to ~3BB with ${notation} or fold. Never limp.`;
  } else if (mistakes.includes('ignored_pot_odds')) {
    advice = `You need ${potOdds}% equity to call but have ~${equity}% — calling is actually breakeven or better.`;
  } else {
    advice = `Standard open: 2.5–3BB. 3-bet to ~9–11BB total. Check your sizing.`;
  }

  const exploitTip = getExploitTipPreflop(villainType);
  return {
    handNotation: notation, heroPosition, heroAction: action, raiseAmountBB: raiseBB,
    isGTO, gtoAction,
    gtoRaiseSize: gtoAction === 'raise'
      ? (actionCtx.facingRaise ? Math.max(9, Math.round(actionCtx.raiseAmount * 3.2)) : 3)
      : undefined,
    equity, potOdds, mistakes, advice, exploitTip, handStrength: strength,
  };
}

function buildPostFlopAnalysis(
  heroCards: Card[], board: Card[], street: PostFlopStreet,
  heroAction: PostFlopHeroAction, betPct: number, potBB: number,
  villainOpenAction: VillainPostFlopAction,
  villainResponse: VillainPostFlopAction | null,
  heroIsAggressor: boolean,
  villainType: PlayerType,
): PostFlopStreetAnalysis {
  const facingBet = villainOpenAction.action === 'bet' || villainOpenAction.action === 'raise';
  const boardTexture = analyzeBoardTexture(board);
  const { hand: madeHand, rank: madeHandRank } = evaluateMadeHand(heroCards, board);

  // Compute draw outs — only meaningful when hero hasn't already made a strong hand
  const drawInfo = madeHandRank <= 2
    ? countDrawOuts(heroCards, board, street)
    : { drawType: 'none' as const, outs: 0, equity: 0, label: '' };

  const cbet = getCbetRecommendation(boardTexture.texture, madeHandRank, heroIsAggressor, facingBet, drawInfo);
  // potBB already includes villain's bet, so it IS the pot before hero's call
  const potOddsPct = facingBet ? calcPotOdds(villainOpenAction.betBB, potBB) : 0;
  const betBB = Math.round((betPct / 100) * potBB * 10) / 10;

  // Total effective equity = made hand baseline + draw equity
  // High Card ~15%, One Pair ~50% vs range. Draw equity is additive on top.
  const madeHandEquity = madeHandRank >= 2 ? 50 : 15;
  const totalEquity = madeHandRank >= 2 ? madeHandEquity : Math.max(madeHandEquity, drawInfo.equity);
  const hasStrongDraw = drawInfo.drawType === 'combo' || drawInfo.drawType === 'flush' || drawInfo.drawType === 'oesd';
  const drawIsProfit = drawInfo.equity >= potOddsPct;

  const mistakes: MistakeType[] = [];

  if (!facingBet) {
    // Missed value: had a strong made hand and didn't bet
    if (cbet.action === 'bet' && (heroAction === 'check' || heroAction === 'fold') && madeHandRank >= 3) {
      mistakes.push('missed_value');
    }
    // Also flag: strong draw that should have semi-bluffed but checked/folded
    if (cbet.action === 'bet' && (heroAction === 'check' || heroAction === 'fold') && hasStrongDraw && madeHandRank < 3) {
      mistakes.push('missed_value');
    }
    // Bad bluff: no made hand AND no strong draw, betting against unfavourable spot
    const bluffBadBoard = boardTexture.texture === 'wet' || boardTexture.texture === 'monotone';
    if ((heroAction === 'bet' || heroAction === 'raise') && madeHandRank <= 1 && !hasStrongDraw &&
        (villainType === 'Fish' || bluffBadBoard)) {
      mistakes.push('bad_bluff');
    }
  } else {
    const foldTooTightThreshold = villainType === 'Maniac' ? 2 : 3;
    // Folded too tight: either had a strong enough made hand OR a profitable draw
    if (heroAction === 'fold' && (madeHandRank >= foldTooTightThreshold || (hasStrongDraw && drawIsProfit))) {
      mistakes.push('folded_too_tight');
    }
    // Ignored pot odds: called without sufficient equity (draw equity now counted)
    if ((heroAction === 'call' || heroAction === 'raise') && totalEquity < potOddsPct && madeHandRank <= 1 && !hasStrongDraw) {
      mistakes.push('ignored_pot_odds');
    }
  }

  const isGTO = mistakes.length === 0;
  let gtoAction: PostFlopHeroAction;
  let gtoSizingPct = cbet.sizingPct;
  if (facingBet) {
    if (madeHandRank >= 5) gtoAction = 'raise';
    else if (madeHandRank >= 3) gtoAction = 'call';
    else if (madeHandRank === 2 && potOddsPct < 30) gtoAction = 'call';
    else if (hasStrongDraw && drawIsProfit) gtoAction = 'call'; // draw equity justifies the call
    else gtoAction = 'fold';
  } else {
    gtoAction = cbet.action === 'bet' ? 'bet' : 'check';
    gtoSizingPct = cbet.sizingPct;
  }

  const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);
  const drawNote = drawInfo.outs > 0 ? ` You hold a ${drawInfo.label}.` : '';

  // Build advice considering villain's response
  const vr = villainResponse;
  let villainResponseNote = '';
  if (vr && heroAction !== 'fold') {
    if (vr.action === 'fold') villainResponseNote = ` Villain folded — your bet had fold equity.`;
    else if (vr.action === 'raise') villainResponseNote = ` Villain raised to ${vr.betBB}BB — they had a strong hand here.`;
    else if (vr.action === 'call') villainResponseNote = ` Villain called.`;
  }

  let advice = '';
  if (isGTO) {
    advice = `Good ${streetLabel} decision! ${madeHand} on a ${boardTexture.label} board — ${heroAction} is solid.${drawNote}${villainResponseNote}`;
  } else if (mistakes.includes('missed_value') && hasStrongDraw) {
    advice = `You had a ${drawInfo.label} — semi-bluff betting is the right move.${drawNote} ${cbet.reason}${villainResponseNote}`;
  } else if (mistakes.includes('missed_value')) {
    advice = `You have ${madeHand} on a ${boardTexture.label} board — betting for value is more profitable. ${cbet.reason}${villainResponseNote}`;
  } else if (mistakes.includes('bad_bluff')) {
    advice = `Bluffing on a ${boardTexture.label} board with no made hand or strong draw is high risk. ${cbet.reason}${villainResponseNote}`;
  } else if (mistakes.includes('folded_too_tight') && hasStrongDraw) {
    advice = `Folding with a ${drawInfo.label} facing a ${villainOpenAction.betPct}% pot bet is too tight — you had ~${drawInfo.equity}% equity and pot odds of ${potOddsPct}%. Calling was profitable.${villainResponseNote}`;
  } else if (mistakes.includes('folded_too_tight')) {
    advice = `Folding ${madeHand} to a ${villainOpenAction.betPct}% pot bet is too tight. This hand has enough strength to continue.${villainResponseNote}`;
  } else if (mistakes.includes('ignored_pot_odds')) {
    advice = `Calling ${villainOpenAction.betPct}% pot with no made hand or strong draw requires ${potOddsPct}% equity — you likely don't have it.${drawNote}${villainResponseNote}`;
  } else {
    advice = cbet.reason + drawNote + villainResponseNote;
  }

  const exploitTip = getExploitTipPostFlop(villainType, heroAction, madeHandRank, facingBet, mistakes);
  return {
    street, boardTexture, madeHand, madeHandRank, drawInfo, heroAction, betPct, betBB,
    villainAction: villainOpenAction.action,
    villainBetPct: villainOpenAction.betPct,
    villainBetBB: villainOpenAction.betBB,
    villainResponse: vr?.action ?? null,
    villainResponseBetBB: vr?.betBB ?? 0,
    cbetRecommendation: cbet, isGTO, gtoAction, gtoSizingPct, mistakes, advice, exploitTip, heroIsAggressor,
  };
}

function simulateBotPreflop(players: BotPlayer[], heroPosition: Position, isGTOMode = false): {
  players: BotPlayer[]; actionCtx: ActionContext; pot: number;
} {
  const heroIdx = PREFLOP_ORDER.indexOf(heroPosition);
  let pot = 1.5, facingRaise = false, raiseAmount = 0;
  let raisedByPosition: Position|null = null, calledByCount = 0;

  const updated = players.map(p => {
    const posIdx = PREFLOP_ORDER.indexOf(p.position);
    if (posIdx < 0 || posIdx >= heroIdx) return p;
    const botAction = isGTOMode
      ? simulateBotGTOAction(p.cards, p.position, facingRaise, raiseAmount, pot)
      : simulateBotAction(p.type, p.position, facingRaise, raiseAmount, pot);
    // alreadyPosted: blind chips already counted in the starting pot of 1.5
    const alreadyPosted = p.position === 'SB' ? 0.5 : p.position === 'BB' ? 1 : 0;
    // totalCommit: raise-to / call-to amount (used for display + section C formula)
    let totalCommit = 0;
    // extraChips: actual new chips added to pot (blind-adjusted so no double-count)
    let extraChips = 0;
    if (botAction === 'raise') {
      totalCommit = facingRaise ? raiseAmount * 3 : 3;
      extraChips = Math.min(totalCommit - alreadyPosted, p.stack); // cap at remaining stack
      totalCommit = alreadyPosted + extraChips;
      facingRaise = true; raiseAmount = totalCommit; raisedByPosition = p.position;
    } else if (botAction === 'call') {
      // facingRaise → call the raise; !facingRaise → open-limp for 1BB
      totalCommit = facingRaise ? raiseAmount : 1;
      extraChips = Math.min(Math.max(0, totalCommit - alreadyPosted), p.stack);
      totalCommit = alreadyPosted + extraChips;
      calledByCount++;
    }
    pot += extraChips;
    return { ...p, action: botAction, currentBet: totalCommit, isActive: botAction !== 'fold',
             stack: Math.round(Math.max(0, p.stack - extraChips) * 10) / 10 };
  });

  // Second pass: if a re-raise happened, earlier callers/raisers must respond.
  // e.g. UTG raises 3BB, CO 3-bets to 9BB → UTG must call or fold the extra 6BB.
  if (facingRaise && raiseAmount > 0) {
    for (let i = 0; i < updated.length; i++) {
      const p = updated[i];
      const posIdx = PREFLOP_ORDER.indexOf(p.position);
      if (posIdx < 0 || posIdx >= heroIdx || !p.isActive) continue;
      if (p.position === raisedByPosition) continue; // the raiser themselves, already settled
      if (p.currentBet > 0 && p.currentBet < raiseAmount) {
        // This player committed chips but less than the final raise — give them a chance to respond
        const resp = isGTOMode
          ? simulateBotGTOAction(p.cards, p.position, true, raiseAmount, pot)
          : simulateBotAction(p.type, p.position, true, raiseAmount, pot);
        if (resp !== 'fold') {
          const extra = Math.min(raiseAmount - p.currentBet, p.stack); // cap at remaining stack
          pot += extra;
          updated[i] = { ...p, currentBet: p.currentBet + extra, stack: Math.round(Math.max(0, p.stack - extra) * 10) / 10 };
        } else {
          updated[i] = { ...p, action: 'fold', isActive: false };
        }
      }
    }
  }

  return { players: updated, actionCtx: { facingRaise, raiseAmount, potSize: pot, calledByCount, raisedByPosition }, pot };
}

function getMainVillain(players: BotPlayer[]): BotPlayer {
  const active = players.filter(p => p.isActive);
  return active.find(p => p.type === 'Maniac') ?? active.find(p => p.type === 'LAG') ?? active[0] ?? players[0];
}

function getMainVillainPlayer(state: GameState): BotPlayer {
  return state.players.find(p => p.position === state.mainVillainPosition)
    ?? getMainVillain(state.players);
}

function simulateOtherPlayers(
  positions: Position[],
  players: BotPlayer[],
  openBet: VillainPostFlopAction | null,
  pot: number,
): {
  actions: Partial<Record<Position, { action: VillainActionType; betBB: number }>>;
  potAdded: number;
  remainingActive: Position[];
} {
  const actions: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = {};
  let potAdded = 0;
  const remainingActive: Position[] = [];
  const isBet = openBet?.action === 'bet' || openBet?.action === 'raise';
  for (const pos of positions) {
    const player = players.find(p => p.position === pos);
    if (!player) continue;
    if (isBet && openBet) {
      const resp = simulateBotAction(player.type, pos, true, openBet.betBB, pot);
      if (resp !== 'fold') {
        const callAmt = Math.min(openBet.betBB, player.stack); // cap at remaining stack
        actions[pos] = { action: 'call', betBB: callAmt };
        potAdded += callAmt;
        remainingActive.push(pos);
      } else {
        actions[pos] = { action: 'fold', betBB: 0 };
      }
    } else {
      actions[pos] = { action: 'check', betBB: 0 };
      remainingActive.push(pos);
    }
  }
  return { actions, potAdded, remainingActive };
}

function applyStackDeductions(
  players: BotPlayer[],
  streetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>>,
): BotPlayer[] {
  return players.map(p => {
    const a = streetActions[p.position as Position];
    if (!a || a.betBB <= 0) return p;
    return { ...p, stack: Math.round(Math.max(0, p.stack - a.betBB) * 10) / 10 };
  });
}

function revealCommunityCards(cards: Card[], count: number): Card[] {
  let n = 0;
  return cards.map(c => (!c.faceUp && n < count) ? (n++, { ...c, faceUp: true }) : c);
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };

    case 'SET_TRAINING_MODE':
      return { ...state, trainingMode: action.mode };

    case 'SET_TABLE_SIZE':
      return { ...state, tableSize: Math.max(2, Math.min(9, action.tableSize)) };

    case 'START_HAND': {
      const activePositions = getPositionsForSize(state.tableSize);
      const heroPosition = activePositions[state.handNumber % activePositions.length];
      const recentSigs = state.recentBoardSigs;
      let attempts = 0;
      let deck: Card[] = [];
      let heroCards: Card[] = [];
      let players: BotPlayer[] = [];
      let communityCards: Card[] = [];
      let sig = '';

      do {
        deck = shuffleDeck(createDeck());
        let [hc, d] = dealCards(deck, 2);
        heroCards = hc;
        deck = d;

        const otherPositions = activePositions.filter(p => p !== heroPosition);
        players = [];
        for (let i = 0; i < Math.min(8, otherPositions.length); i++) {
          const [botCards, nextDeck] = dealCards(deck, 2);
          deck = nextDeck;
          players.push({
            id: i, name: PLAYER_NAMES[i % PLAYER_NAMES.length],
            type: PLAYER_TYPE_LIST[i % PLAYER_TYPE_LIST.length],
            position: otherPositions[i],
            cards: botCards.map(c => ({ ...c, faceUp: false })),
            stack: otherPositions[i] === 'BB' ? 99 : otherPositions[i] === 'SB' ? 99.5 : 100,
            currentBet: 0, action: null, isActive: true,
            isDealer: otherPositions[i] === 'BTN',
          });
        }

        const [comm] = dealCards(deck, 5);
        communityCards = comm;
        sig = flopSig(communityCards);
        attempts++;
      } while (recentSigs.includes(sig) && attempts < 8);

      deck = deck.slice(5);

      const faceDown = communityCards.map(c => ({ ...c, faceUp: false }));
      const { players: updatedPlayers, actionCtx, pot } = simulateBotPreflop(players, heroPosition, state.trainingMode === 'gto');
      const mainVillain = getMainVillain(updatedPlayers);
      const mainVillainType = mainVillain.type;
      const mainVillainPosition = mainVillain.position;
      const newRecentSigs = [...recentSigs.slice(-(BOARD_SIG_WINDOW - 1)), sig];
      const heroBlind = heroPosition === 'BB' ? 1 : heroPosition === 'SB' ? 0.5 : 0;

      return {
        ...state,
        phase: 'preflop', deck, heroCards,
        communityCards: faceDown,
        heroPosition, heroStack: 100 - heroBlind, heroBet: 0, pot,
        currentBet: actionCtx.facingRaise ? actionCtx.raiseAmount : 0,
        players: updatedPlayers,
        handNumber: state.handNumber + 1,
        actionCtx, analysis: null, postFlopAnalysis: null,
        postFlopAnalysisHistory: [],
        showAnalysis: false, lastHeroAction: null,
        heroIsAggressor: false, villainPostFlopAction: null,
        mainVillainType, mainVillainPosition, heroActsFirst: false,
        postFlopStreetsDone: [],
        recentBoardSigs: newRecentSigs,
        showdownResult: null, villainFolded: false,
        heroCheckedStreet: null, heroTotalInvestedBB: heroBlind,
        handActivePlayers: [], playerStreetActions: {},
      };
    }

    case 'HERO_ACT': {
      const { action: heroAction, raiseBB = 3 } = action;
      // How much hero has already committed as a blind (pot already includes this)
      const heroAlreadyIn = state.heroPosition === 'BB' ? 1 : state.heroPosition === 'SB' ? 0.5 : 0;
      // Total amount needed to call (full BB sizing, not extra)
      const callTotal = state.actionCtx.facingRaise ? state.actionCtx.raiseAmount : 1;
      // heroBet = extra chips hero adds (total - already posted)
      const heroBet = heroAction === 'raise'
        ? Math.min(Math.max(0, raiseBB - heroAlreadyIn), state.heroStack)
        : heroAction === 'call'
          ? Math.min(Math.max(0, callTotal - heroAlreadyIn), state.heroStack)
          : 0;
      let preflopPot = state.pot + heroBet;

      // ── Simulate remaining preflop actors after hero ───────────────────
      // Track which bots fold and how many extra chips each bot commits.
      const foldedInSim = new Set<string>();
      const extraCommits = new Map<string, number>();

      if (heroAction !== 'fold') {
        const heroIdx = PREFLOP_ORDER.indexOf(state.heroPosition);

        // (A) Bots who act AFTER hero in preflop order (e.g. SB/BB when hero is BTN)
        for (const bot of state.players) {
          const posIdx = PREFLOP_ORDER.indexOf(bot.position);
          if (!bot.isActive || posIdx <= heroIdx) continue;
          const alreadyIn = bot.position === 'BB' ? 1 : bot.position === 'SB' ? 0.5 : 0;
          const heroRaised = heroAction === 'raise';
          const facingRaiseNow = heroRaised || state.actionCtx.facingRaise;
          const facingAmt = heroRaised ? raiseBB
            : (state.actionCtx.facingRaise ? state.actionCtx.raiseAmount : 1);
          if (facingAmt > alreadyIn) {
            const resp = state.trainingMode === 'gto'
              ? simulateBotGTOAction(bot.cards, bot.position, facingRaiseNow, facingAmt, preflopPot)
              : simulateBotAction(bot.type, bot.position, facingRaiseNow, facingAmt, preflopPot);
            if (resp !== 'fold') {
              const extra = Math.min(facingAmt - alreadyIn, bot.stack); // cap at remaining stack
              preflopPot += extra;
              extraCommits.set(bot.position, (extraCommits.get(bot.position) ?? 0) + extra);
            } else foldedInSim.add(bot.position);
          }
        }

        // (B) Original raiser responds to hero's 3-bet
        if (heroAction === 'raise' && state.actionCtx.facingRaise && state.actionCtx.raisedByPosition) {
          const origRaiser = state.players.find(
            p => p.position === state.actionCtx.raisedByPosition && p.isActive,
          );
          if (origRaiser) {
            const resp = state.trainingMode === 'gto'
              ? simulateBotGTOAction(origRaiser.cards, origRaiser.position, true, raiseBB, preflopPot)
              : simulateBotAction(origRaiser.type, origRaiser.position, true, raiseBB, preflopPot);
            if (resp !== 'fold') {
              const extra = Math.min(Math.max(0, raiseBB - state.actionCtx.raiseAmount), origRaiser.stack);
              preflopPot += extra;
              extraCommits.set(origRaiser.position, (extraCommits.get(origRaiser.position) ?? 0) + extra);
            } else foldedInSim.add(origRaiser.position);
          }
        }

        // (C) Bots BEFORE hero who called a previous raise now face hero's re-raise
        if (heroAction === 'raise') {
          for (const bot of state.players) {
            const posIdx = PREFLOP_ORDER.indexOf(bot.position);
            if (!bot.isActive || posIdx >= heroIdx) continue;
            if (bot.position === state.actionCtx.raisedByPosition) continue;
            if (bot.currentBet > 0) {
              const resp = state.trainingMode === 'gto'
                ? simulateBotGTOAction(bot.cards, bot.position, true, raiseBB, preflopPot)
                : simulateBotAction(bot.type, bot.position, true, raiseBB, preflopPot);
              if (resp !== 'fold') {
                const extra = Math.min(Math.max(0, raiseBB - bot.currentBet), bot.stack);
                preflopPot += extra;
                extraCommits.set(bot.position, (extraCommits.get(bot.position) ?? 0) + extra);
              } else foldedInSim.add(bot.position);
            }
          }
        }
      }

      // Apply post-hero preflop stack deductions and mark folded-after-hero bots inactive
      const postPreflopPlayers = state.players.map(p => ({
        ...p,
        stack: Math.round(Math.max(0, p.stack - (extraCommits.get(p.position) ?? 0)) * 10) / 10,
        isActive: foldedInSim.has(p.position) ? false : p.isActive,
      }));

      const analysis = buildPreflopAnalysis(state.heroCards, state.heroPosition, heroAction, raiseBB, state.actionCtx, state.mainVillainType);

      if (heroAction === 'fold') {
        return {
          ...state, players: postPreflopPlayers,
          phase: 'showdown', heroBet, pot: preflopPot,
          heroStack: Math.round(Math.max(0, state.heroStack - heroBet) * 10) / 10,
          analysis, showAnalysis: true, lastHeroAction: heroAction,
          heroIsAggressor: false, showdownResult: 'villain', villainFolded: false,
          heroTotalInvestedBB: heroAlreadyIn,
        };
      }

      // ── Everyone folded — hero wins uncontested ────────────────────────
      const stillActiveBots = postPreflopPlayers.filter(p => p.isActive && !foldedInSim.has(p.position));
      if (stillActiveBots.length === 0) {
        return {
          ...state, players: postPreflopPlayers,
          phase: 'showdown', heroBet, pot: preflopPot,
          heroStack: Math.round(Math.max(0, state.heroStack - heroBet) * 10) / 10,
          analysis, showAnalysis: true, lastHeroAction: heroAction,
          heroIsAggressor: heroAction === 'raise',
          showdownResult: 'hero', villainFolded: true,
          heroTotalInvestedBB: heroAlreadyIn + heroBet,
          heroCheckedStreet: null,
        };
      }

      // Preflop-only mode — end the hand here for rapid drilling
      if (state.trainingMode === 'preflop') {
        return {
          ...state,
          players: postPreflopPlayers.map(p => ({ ...p, action: null })),
          phase: 'showdown', heroBet, pot: preflopPot,
          heroStack: Math.round(Math.max(0, state.heroStack - heroBet) * 10) / 10,
          analysis, showAnalysis: true, lastHeroAction: heroAction,
          heroIsAggressor: heroAction === 'raise',
          showdownResult: null, villainFolded: false,
          heroTotalInvestedBB: heroAlreadyIn + heroBet,
          heroCheckedStreet: null,
        };
      }

      const flopCards = revealCommunityCards(state.communityCards, 3);
      const heroIsAggressor = heroAction === 'raise';

      // All bots still alive entering the flop
      const survivedPositions: Position[] = postPreflopPlayers
        .filter(p => p.isActive && !foldedInSim.has(p.position))
        .map(p => p.position as Position);

      // Hero acts first only when NO active bot has an earlier post-flop position than hero.
      // The "flop villain" is the earliest active bot — they open the street if before hero,
      // or respond to hero if no bot is before hero.
      const heroIdx = POSTFLOP_ORDER.indexOf(state.heroPosition);
      const firstBotBeforeHero = survivedPositions
        .filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdx)
        .sort((a, b) => POSTFLOP_ORDER.indexOf(a) - POSTFLOP_ORDER.indexOf(b))[0];
      const heroActsFirst = !firstBotBeforeHero;
      const flopVillainPos: Position = firstBotBeforeHero ?? state.mainVillainPosition;
      const flopVillainPlayer = postPreflopPlayers.find(p => p.position === flopVillainPos)
        ?? getMainVillainPlayer(state);

      const visibleBoard = flopCards.filter(c => c.faceUp);
      const _flopTexture = analyzeBoardTexture(visibleBoard).texture;
      let villain = heroActsFirst
        ? null
        : state.trainingMode === 'gto'
          ? simulateVillainGTOPostFlop(_flopTexture, preflopPot, 'none', flopVillainPlayer.cards, visibleBoard)
          : simulateVillainPostFlop(flopVillainPlayer.type, _flopTexture, preflopPot, 'none', flopVillainPlayer.cards, visibleBoard);
      if (villain && villain.betBB > flopVillainPlayer.stack) villain = { ...villain, betBB: flopVillainPlayer.stack };

      // Split background bots into those who act BEFORE hero (show their chips now)
      // and those who act AFTER hero (no chips until hero acts).
      const bgPositions = survivedPositions.filter(p => p !== flopVillainPos);
      const bgBeforeHero = heroActsFirst ? [] : bgPositions.filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdx);
      const bgAfterHero  = heroActsFirst ? bgPositions : bgPositions.filter(p => POSTFLOP_ORDER.indexOf(p) > heroIdx);

      const bgFlopBefore = bgBeforeHero.length > 0
        ? simulateOtherPlayers(bgBeforeHero, postPreflopPlayers, villain, preflopPot)
        : { actions: {} as Partial<Record<Position, { action: VillainActionType; betBB: number }>>, potAdded: 0, remainingActive: [] as Position[] };

      const flopPot = preflopPot + (villain?.betBB ?? 0) + bgFlopBefore.potAdded;

      const flopHandActive: Position[] = [
        ...(villain && villain.action !== 'fold' ? [flopVillainPos] : heroActsFirst ? [flopVillainPos] : []),
        ...bgFlopBefore.remainingActive,
        ...bgAfterHero,
      ];
      const flopStreetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = {
        ...bgFlopBefore.actions,
        ...(villain ? { [flopVillainPos]: { action: villain.action, betBB: villain.betBB } } : {}),
      };

      const flopPlayers = applyStackDeductions(postPreflopPlayers, flopStreetActions);
      return {
        ...state,
        players: flopPlayers.map(p => ({ ...p, action: null })),
        phase: 'flop', heroBet, pot: flopPot,
        heroStack: Math.round(Math.max(0, state.heroStack - heroBet) * 10) / 10,
        communityCards: flopCards, analysis, postFlopAnalysis: null,
        showAnalysis: true, lastHeroAction: heroAction,
        heroIsAggressor, villainPostFlopAction: villain, heroActsFirst,
        postFlopStreetsDone: [],
        showdownResult: null, villainFolded: false,
        heroTotalInvestedBB: heroAlreadyIn + heroBet,
        handActivePlayers: flopHandActive,
        playerStreetActions: flopStreetActions,
        mainVillainPosition: flopVillainPos,
        mainVillainType: flopVillainPlayer.type,
      };
    }

    case 'HERO_POSTFLOP_ACT': {
      const { action: heroAction, betPct = 0 } = action;
      const street = state.phase as PostFlopStreet;

      // Guard: prevent re-acting on a street that is already complete
      // (can happen if user taps X on the analysis modal instead of "Deal Turn")
      if (state.postFlopStreetsDone.includes(street)) return state;

      const board = state.communityCards.filter(c => c.faceUp);
      // betPct === -1 is the "ALL IN" sentinel — bet the entire remaining stack
      const isAllInBet = betPct === -1;
      const betBB = isAllInBet
        ? state.heroStack
        : Math.min(Math.round((betPct / 100) * state.pot * 10) / 10, state.heroStack);
      const effectiveBetPct = isAllInBet
        ? (state.pot > 0 ? Math.round((state.heroStack / state.pot) * 100) : 100)
        : betPct;

      // Get villain's cards for realistic simulation
      const villainPlayer = getMainVillainPlayer(state);
      const villainCards = villainPlayer.cards;

      // ── BRANCH A: Hero (OOP) checks for the first time this street ────────
      // Villain responds — if they bet, pause so hero can fold/call/raise.
      if (state.heroActsFirst && heroAction === 'check' && state.heroCheckedStreet !== street) {
        const _branchATexture = analyzeBoardTexture(board).texture;
        let villainResp = state.trainingMode === 'gto'
          ? simulateVillainGTOPostFlop(_branchATexture, state.pot, 'check', villainCards, board)
          : simulateVillainPostFlop(state.mainVillainType, _branchATexture, state.pot, 'check', villainCards, board);
        if (villainResp.betBB > villainPlayer.stack) villainResp = { ...villainResp, betBB: villainPlayer.stack };

        if (villainResp.action === 'bet') {
          // Simulate other active players' response to villain's bet
          const bgPosA = state.handActivePlayers.filter(p => p !== (state.mainVillainPosition as Position));
          const bgRespA = simulateOtherPlayers(bgPosA, state.players, villainResp, state.pot);
          const streetActsA: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = {
            ...bgRespA.actions,
            [state.mainVillainPosition]: { action: villainResp.action, betBB: villainResp.betBB },
          };
          return {
            ...state,
            players: applyStackDeductions(state.players, streetActsA),
            pot: state.pot + villainResp.betBB + bgRespA.potAdded,
            villainPostFlopAction: villainResp,
            heroCheckedStreet: street,
            lastHeroAction: 'check',
            showAnalysis: false,
            handActivePlayers: [state.mainVillainPosition as Position, ...bgRespA.remainingActive],
            playerStreetActions: streetActsA,
          };
        }

        // Villain checked back — street ends as check-check
        const pfaCC = buildPostFlopAnalysis(
          state.heroCards, board, street, 'check', 0, state.pot,
          { action: 'check', betPct: 0, betBB: 0 }, null,
          state.heroIsAggressor, state.mainVillainType,
        );
        return {
          ...state,
          postFlopAnalysis: pfaCC,
          postFlopAnalysisHistory: [...state.postFlopAnalysisHistory, pfaCC],
          villainPostFlopAction: villainResp,
          showAnalysis: true,
          lastHeroAction: 'check',
          heroCheckedStreet: null,
        };
      }

      // ── BRANCH B: Hero responds to villain's bet after having checked OOP ──
      // Villain's bet chips are already baked into state.pot.
      if (state.heroCheckedStreet === street) {
        const villainBet   = state.villainPostFlopAction!;
        const villainAlrIn = villainBet.betBB;

        let vFinalB: VillainPostFlopAction;
        if (heroAction === 'fold') {
          vFinalB = villainBet;
        } else if (heroAction === 'bet' || heroAction === 'raise') {
          // Check-raise — simulate villain's response to the re-raise
          const _branchBTexture = analyzeBoardTexture(board).texture;
          vFinalB = state.trainingMode === 'gto'
            ? simulateVillainGTOPostFlop(_branchBTexture, state.pot + betBB, 'raise', villainCards, board)
            : simulateVillainPostFlop(state.mainVillainType, _branchBTexture, state.pot + betBB, 'raise', villainCards, board);
          // Cap villain's re-raise at their remaining stack
          if (vFinalB.betBB > villainPlayer.stack) vFinalB = { ...vFinalB, betBB: villainPlayer.stack };
        } else {
          vFinalB = villainBet; // call — no further action
        }

        const vFoldedB = vFinalB.action === 'fold';

        // Cap each side's contribution at their remaining stack
        const heroBCallB = Math.min(villainBet.betBB, state.heroStack);
        const villainCallB = Math.min(Math.max(0, betBB - villainAlrIn), villainPlayer.stack);
        const heroCallBackB = Math.min(Math.max(0, vFinalB.betBB - betBB), Math.max(0, state.heroStack - betBB));

        let newPotB = state.pot;
        if (heroAction === 'call') {
          newPotB += heroBCallB;
        } else if (heroAction === 'bet' || heroAction === 'raise') {
          newPotB += betBB;
          if (vFinalB.action === 'call')  newPotB += villainCallB;
          if (vFinalB.action === 'raise') {
            newPotB += Math.max(0, vFinalB.betBB - villainAlrIn);
            newPotB += heroCallBackB;
          }
        }

        // Analysis: hero faced villain's bet (check-raise / call / fold)
        const pfaB = buildPostFlopAnalysis(
          state.heroCards, board, street,
          (heroAction === 'bet' ? 'raise' : heroAction) as PostFlopHeroAction,
          effectiveBetPct, state.pot,
          villainBet,
          vFinalB.action !== villainBet.action ? vFinalB : null,
          state.heroIsAggressor, state.mainVillainType,
        );
        const newHistB = [...state.postFlopAnalysisHistory, pfaB];
        const newDoneB = [...state.postFlopStreetsDone, street];

        const heroAddedB = heroAction === 'call' ? heroBCallB
          : (heroAction === 'bet' || heroAction === 'raise') ? betBB + (vFinalB.action === 'raise' ? heroCallBackB : 0) : 0;

        // Track villain's response chips so their stack stays accurate on later streets
        const villainBCommit = (() => {
          if (heroAction === 'fold' || vFoldedB) return 0;
          if (heroAction === 'bet' || heroAction === 'raise') {
            if (vFinalB.action === 'call') return villainCallB;
            if (vFinalB.action === 'raise') return Math.max(0, vFinalB.betBB - villainAlrIn);
          }
          return 0;
        })();
        const updatedPlayersB = state.players.map(p =>
          p.position === state.mainVillainPosition && villainBCommit > 0
            ? { ...p, stack: Math.round(Math.max(0, p.stack - villainBCommit) * 10) / 10 }
            : p
        );

        if (heroAction === 'fold') {
          return {
            ...state, phase: 'showdown', pot: newPotB,
            players: updatedPlayersB,
            heroStack: Math.round(Math.max(0, state.heroStack - heroAddedB) * 10) / 10,
            postFlopAnalysis: pfaB, postFlopAnalysisHistory: newHistB,
            villainPostFlopAction: villainBet, showAnalysis: true,
            postFlopStreetsDone: newDoneB,
            showdownResult: 'villain', villainFolded: false,
            heroCheckedStreet: null,
            lastHeroAction: heroAction as HeroAction,
            heroTotalInvestedBB: state.heroTotalInvestedBB + heroAddedB,
          };
        }

        if (vFoldedB) {
          return {
            ...state, phase: 'showdown', pot: newPotB,
            players: updatedPlayersB.map(p => p.position === state.mainVillainPosition ? { ...p, isActive: false } : p),
            handActivePlayers: state.handActivePlayers.filter(p => p !== (state.mainVillainPosition as Position)),
            heroStack: Math.round(Math.max(0, state.heroStack - heroAddedB) * 10) / 10,
            postFlopAnalysis: pfaB, postFlopAnalysisHistory: newHistB,
            showAnalysis: true, postFlopStreetsDone: newDoneB,
            showdownResult: 'hero', villainFolded: true,
            heroCheckedStreet: null,
            lastHeroAction: (heroAction === 'bet' ? 'raise' : heroAction) as HeroAction,
            heroTotalInvestedBB: state.heroTotalInvestedBB + heroAddedB,
          };
        }

        return {
          ...state, pot: newPotB,
          players: updatedPlayersB,
          heroStack: Math.round(Math.max(0, state.heroStack - heroAddedB) * 10) / 10,
          postFlopAnalysis: pfaB, postFlopAnalysisHistory: newHistB,
          villainPostFlopAction: vFinalB, showAnalysis: true,
          postFlopStreetsDone: newDoneB,
          heroCheckedStreet: null,
          lastHeroAction: (heroAction === 'bet' ? 'raise' : heroAction) as HeroAction,
          heroTotalInvestedBB: state.heroTotalInvestedBB + heroAddedB,
        };
      }

      // ── Determine villain actions ───────────────────────────────────────
      // villainOpenAction: what villain did BEFORE hero's current action (or check if hero acts first)
      const villainOpenAction: VillainPostFlopAction =
        state.heroActsFirst
          ? { action: 'check', betPct: 0, betBB: 0 }
          : (state.villainPostFlopAction ?? { action: 'check', betPct: 0, betBB: 0 });

      // villainFinalResponse: villain's reaction to hero's action
      let villainFinalResponse: VillainPostFlopAction;

      if (heroAction === 'fold') {
        // Hero folded — no villain response needed
        villainFinalResponse = villainOpenAction;
      } else if (state.heroActsFirst) {
        // Hero acts first → villain responds to hero's bet/raise
        const _mainTexture = analyzeBoardTexture(board).texture;
        villainFinalResponse = state.trainingMode === 'gto'
          ? simulateVillainGTOPostFlop(_mainTexture, state.pot, heroAction as 'none'|'check'|'bet'|'raise', villainCards, board)
          : simulateVillainPostFlop(state.mainVillainType, _mainTexture, state.pot, heroAction as 'none'|'check'|'bet'|'raise', villainCards, board);
      } else if (heroAction === 'bet' || heroAction === 'raise') {
        // Villain opened (or checked), hero bet/raised → simulate villain's response
        const _mainTexture2 = analyzeBoardTexture(board).texture;
        villainFinalResponse = state.trainingMode === 'gto'
          ? simulateVillainGTOPostFlop(_mainTexture2, state.pot + betBB, heroAction as 'bet'|'raise', villainCards, board)
          : simulateVillainPostFlop(state.mainVillainType, _mainTexture2, state.pot + betBB, heroAction as 'bet'|'raise', villainCards, board);
      } else {
        // Hero called / checked facing villain's action — street is over, no further response
        villainFinalResponse = villainOpenAction;
      }

      // Cap villain's bet/raise at their remaining stack
      if (villainFinalResponse.betBB > villainPlayer.stack) {
        villainFinalResponse = { ...villainFinalResponse, betBB: villainPlayer.stack };
      }
      const villainFolded = villainFinalResponse.action === 'fold';

      // ── Pot calculation ─────────────────────────────────────────────────
      // NOTE: state.pot already includes villain's opening bet (baked in when
      // villainPostFlopAction was set).  All arithmetic below must only add
      // NEW chips — never re-add the opening bet.
      const callBB = state.villainPostFlopAction?.betBB ?? 0;
      // How many chips villain already committed this street (already in pot)
      const villainAlreadyIn = !state.heroActsFirst ? villainOpenAction.betBB : 0;

      // Cap each side's contribution at their remaining stack
      const heroCallMain   = Math.min(callBB, state.heroStack);
      const villainCallMain = Math.min(Math.max(0, betBB - villainAlreadyIn), villainPlayer.stack);
      const heroCallBack   = Math.min(Math.max(0, villainFinalResponse.betBB - betBB), Math.max(0, state.heroStack - betBB));

      let newPot = state.pot;

      if (heroAction === 'bet' || heroAction === 'raise') {
        newPot += betBB; // hero's chips (already capped at heroStack)
        if (villainFinalResponse.action === 'call') {
          newPot += villainCallMain;
        } else if (villainFinalResponse.action === 'raise') {
          newPot += Math.max(0, villainFinalResponse.betBB - villainAlreadyIn);
          newPot += heroCallBack;
        }
        // fold: villain adds nothing
      } else if (heroAction === 'call') {
        newPot += heroCallMain;
      } else if (heroAction === 'check') {
        if (villainFinalResponse.betBB > 0) newPot += villainFinalResponse.betBB;
      }

      // ── Build analysis ──────────────────────────────────────────────────
      const pfa = buildPostFlopAnalysis(
        state.heroCards, board, street, heroAction, effectiveBetPct, state.pot,
        villainOpenAction,
        villainFinalResponse.action !== villainOpenAction.action ? villainFinalResponse : null,
        state.heroIsAggressor,
        state.mainVillainType,
      );

      const newHistory = [...state.postFlopAnalysisHistory, pfa];

      const heroAdded = heroAction === 'call' ? heroCallMain
        : (heroAction === 'bet' || heroAction === 'raise') ? betBB + (villainFinalResponse.action === 'raise' ? heroCallBack : 0) : 0;

      // Deduct villain's response chips so their stack stays accurate on later streets
      const villainMainCommit = (() => {
        if (heroAction === 'fold' || villainFolded) return 0;
        if (heroAction === 'bet' || heroAction === 'raise') {
          if (villainFinalResponse.action === 'call') return villainCallMain;
          if (villainFinalResponse.action === 'raise') return Math.max(0, villainFinalResponse.betBB - villainAlreadyIn);
        }
        return 0;
      })();
      const updatedPlayers = state.players.map(p =>
        p.position === state.mainVillainPosition && villainMainCommit > 0
          ? { ...p, stack: Math.round(Math.max(0, p.stack - villainMainCommit) * 10) / 10 }
          : p
      );

      // ── End-of-hand transitions ─────────────────────────────────────────
      if (heroAction === 'fold') {
        return {
          ...state, phase: 'showdown', pot: newPot,
          players: updatedPlayers,
          heroStack: Math.round(Math.max(0, state.heroStack - heroAdded) * 10) / 10,
          postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
          villainPostFlopAction: villainOpenAction,
          showAnalysis: true,
          postFlopStreetsDone: [...state.postFlopStreetsDone, street],
          showdownResult: 'villain', villainFolded: false,
          heroCheckedStreet: null,
          heroTotalInvestedBB: state.heroTotalInvestedBB + heroAdded,
        };
      }

      if (villainFolded) {
        // Hero's bet forced villain out — hero wins the pot
        return {
          ...state, phase: 'showdown', pot: newPot,
          players: updatedPlayers.map(p => p.position === state.mainVillainPosition ? { ...p, isActive: false } : p),
          handActivePlayers: state.handActivePlayers.filter(p => p !== (state.mainVillainPosition as Position)),
          heroStack: Math.round(Math.max(0, state.heroStack - heroAdded) * 10) / 10,
          postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
          villainPostFlopAction: villainFinalResponse,
          showAnalysis: true,
          postFlopStreetsDone: [...state.postFlopStreetsDone, street],
          showdownResult: 'hero', villainFolded: true,
          heroCheckedStreet: null,
          heroTotalInvestedBB: state.heroTotalInvestedBB + heroAdded,
        };
      }

      return {
        ...state, pot: newPot,
        players: updatedPlayers,
        heroStack: Math.round(Math.max(0, state.heroStack - heroAdded) * 10) / 10,
        postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
        villainPostFlopAction: villainFinalResponse,
        showAnalysis: true,
        postFlopStreetsDone: [...state.postFlopStreetsDone, street],
        heroCheckedStreet: null,
        heroTotalInvestedBB: state.heroTotalInvestedBB + heroAdded,
      };
    }

    case 'FOLD_TO_VILLAIN_BET': {
      // Villain's bet is already in state.pot — hero just folds, pot stays as-is
      return {
        ...state,
        phase: 'showdown',
        showAnalysis: false,
        showdownResult: 'villain',
        villainFolded: false,
      };
    }

    case 'ADVANCE_PHASE': {
      const villainPlayer = getMainVillainPlayer(state);
      const villainCards = villainPlayer.cards;
      const clearedPlayers = state.players.map(p => ({ ...p, action: null }));

      if (state.phase === 'flop') {
        const turnCards = revealCommunityCards(state.communityCards, 1);
        const board = turnCards.filter(c => c.faceUp);
        const heroIdxT = POSTFLOP_ORDER.indexOf(state.heroPosition);
        const firstBotBeforeHeroT = state.handActivePlayers
          .filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdxT)
          .sort((a, b) => POSTFLOP_ORDER.indexOf(a) - POSTFLOP_ORDER.indexOf(b))[0];
        const turnHeroActsFirst = !firstBotBeforeHeroT;
        const turnVillainPos: Position = firstBotBeforeHeroT ?? state.mainVillainPosition;
        const turnVillainPlayer = state.players.find(p => p.position === turnVillainPos) ?? villainPlayer;
        const _turnTexture = analyzeBoardTexture(board).texture;
        let villain = turnHeroActsFirst
          ? null
          : state.trainingMode === 'gto'
            ? simulateVillainGTOPostFlop(_turnTexture, state.pot, 'none', turnVillainPlayer.cards, board)
            : simulateVillainPostFlop(turnVillainPlayer.type, _turnTexture, state.pot, 'none', turnVillainPlayer.cards, board);
        if (villain && villain.betBB > turnVillainPlayer.stack) villain = { ...villain, betBB: turnVillainPlayer.stack };
        const bgPosTurn = state.handActivePlayers.filter(p => p !== turnVillainPos);
        const bgTurnBefore = turnHeroActsFirst ? [] : bgPosTurn.filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdxT);
        const bgTurnAfter  = turnHeroActsFirst ? bgPosTurn : bgPosTurn.filter(p => POSTFLOP_ORDER.indexOf(p) > heroIdxT);
        const bgTurn = bgTurnBefore.length > 0
          ? simulateOtherPlayers(bgTurnBefore, state.players, villain, state.pot)
          : { actions: {} as Partial<Record<Position, { action: VillainActionType; betBB: number }>>, potAdded: 0, remainingActive: [] as Position[] };
        const turnHandActive: Position[] = [
          ...(villain && villain.action !== 'fold' ? [turnVillainPos] : turnHeroActsFirst ? [turnVillainPos] : []),
          ...bgTurn.remainingActive,
          ...bgTurnAfter,
        ];
        const turnStreetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = {
          ...bgTurn.actions,
          ...(villain ? { [turnVillainPos]: { action: villain.action, betBB: villain.betBB } } : {}),
        };
        const turnPlayers = applyStackDeductions(clearedPlayers, turnStreetActions);
        return {
          ...state, players: turnPlayers, phase: 'turn',
          communityCards: turnCards, postFlopAnalysis: null,
          showAnalysis: false, villainPostFlopAction: villain,
          pot: state.pot + (villain?.betBB ?? 0) + bgTurn.potAdded,
          heroCheckedStreet: null,
          handActivePlayers: turnHandActive,
          playerStreetActions: turnStreetActions,
          heroActsFirst: turnHeroActsFirst,
          mainVillainPosition: turnVillainPos,
          mainVillainType: turnVillainPlayer.type,
        };
      }

      if (state.phase === 'turn') {
        const riverCards = state.communityCards.map(c => ({ ...c, faceUp: true }));
        const board = riverCards.filter(c => c.faceUp);
        const heroIdxR = POSTFLOP_ORDER.indexOf(state.heroPosition);
        const firstBotBeforeHeroR = state.handActivePlayers
          .filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdxR)
          .sort((a, b) => POSTFLOP_ORDER.indexOf(a) - POSTFLOP_ORDER.indexOf(b))[0];
        const riverHeroActsFirst = !firstBotBeforeHeroR;
        const riverVillainPos: Position = firstBotBeforeHeroR ?? state.mainVillainPosition;
        const riverVillainPlayer = state.players.find(p => p.position === riverVillainPos) ?? villainPlayer;
        const _riverTexture = analyzeBoardTexture(board).texture;
        let villain = riverHeroActsFirst
          ? null
          : state.trainingMode === 'gto'
            ? simulateVillainGTOPostFlop(_riverTexture, state.pot, 'none', riverVillainPlayer.cards, board)
            : simulateVillainPostFlop(riverVillainPlayer.type, _riverTexture, state.pot, 'none', riverVillainPlayer.cards, board);
        if (villain && villain.betBB > riverVillainPlayer.stack) villain = { ...villain, betBB: riverVillainPlayer.stack };
        const bgPosRiver = state.handActivePlayers.filter(p => p !== riverVillainPos);
        const bgRiverBefore = riverHeroActsFirst ? [] : bgPosRiver.filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdxR);
        const bgRiverAfter  = riverHeroActsFirst ? bgPosRiver : bgPosRiver.filter(p => POSTFLOP_ORDER.indexOf(p) > heroIdxR);
        const bgRiver = bgRiverBefore.length > 0
          ? simulateOtherPlayers(bgRiverBefore, state.players, villain, state.pot)
          : { actions: {} as Partial<Record<Position, { action: VillainActionType; betBB: number }>>, potAdded: 0, remainingActive: [] as Position[] };
        const riverHandActive: Position[] = [
          ...(villain && villain.action !== 'fold' ? [riverVillainPos] : riverHeroActsFirst ? [riverVillainPos] : []),
          ...bgRiver.remainingActive,
          ...bgRiverAfter,
        ];
        const riverStreetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = {
          ...bgRiver.actions,
          ...(villain ? { [riverVillainPos]: { action: villain.action, betBB: villain.betBB } } : {}),
        };
        const riverPlayers = applyStackDeductions(clearedPlayers, riverStreetActions);
        return {
          ...state, players: riverPlayers, phase: 'river',
          communityCards: riverCards, postFlopAnalysis: null,
          showAnalysis: false, villainPostFlopAction: villain,
          pot: state.pot + (villain?.betBB ?? 0) + bgRiver.potAdded,
          heroCheckedStreet: null,
          handActivePlayers: riverHandActive,
          playerStreetActions: riverStreetActions,
          heroActsFirst: riverHeroActsFirst,
          mainVillainPosition: riverVillainPos,
          mainVillainType: riverVillainPlayer.type,
        };
      }

      if (state.phase === 'river') {
        const board = state.communityCards.filter(c => c.faceUp);
        const activeSet = new Set(state.handActivePlayers as string[]);
        const activePlayers = state.players.filter(p => activeSet.has(p.position));

        // Find the opponent with the strongest hand via pairwise comparison.
        // evaluateHandWinner(a, b, board) returns 'hero' if a wins, 'villain' if b wins.
        let bestOpponent = activePlayers[0] ?? villainPlayer;
        for (let i = 1; i < activePlayers.length; i++) {
          const cmp = evaluateHandWinner(bestOpponent.cards, activePlayers[i].cards, board);
          if (cmp === 'villain') bestOpponent = activePlayers[i];
        }

        // Compare hero against the strongest opponent to get the final result.
        const showdownResult: 'hero' | 'villain' | 'tie' =
          activePlayers.length === 0 ? 'hero' : evaluateHandWinner(state.heroCards, bestOpponent.cards, board);

        const revealedPlayers = state.players.map(p =>
          activeSet.has(p.position)
            ? { ...p, cards: p.cards.map(c => ({ ...c, faceUp: true })) }
            : p
        );
        return {
          ...state,
          players: revealedPlayers,
          phase: 'showdown',
          showAnalysis: false,
          postFlopAnalysis: null,
          showdownResult,
          villainFolded: false,
          heroCheckedStreet: null,
          mainVillainPosition: bestOpponent.position as Position,
          mainVillainType: bestOpponent.type,
        };
      }

      return state;
    }

    case 'GO_IDLE':
      return { ...state, phase: 'idle' };

    case 'START_CUSTOM_HAND': {
      const cfg = action.config;
      const heroPosition = cfg.heroPosition ?? POSITIONS[state.handNumber % POSITIONS.length];
      const heroBlind = heroPosition === 'BB' ? 1 : heroPosition === 'SB' ? 0.5 : 0;

      let workDeck = shuffleDeck(createDeck());

      // Remove all specified cards up-front to prevent duplicates
      const specsToRemove = [
        cfg.heroCard1, cfg.heroCard2, ...cfg.communityCards,
      ].filter(Boolean) as { rank: string; suit: string }[];
      for (const spec of specsToRemove) {
        const idx = workDeck.findIndex(c => c.rank === spec.rank && c.suit === spec.suit);
        if (idx !== -1) workDeck.splice(idx, 1);
      }

      // Hero cards
      const heroCards: Card[] = [];
      if (cfg.heroCard1) {
        heroCards.push({ rank: cfg.heroCard1.rank as Rank, suit: cfg.heroCard1.suit as Suit, faceUp: true });
      } else {
        const [h, r] = dealCards(workDeck, 1); heroCards.push(h[0]); workDeck = r;
      }
      if (cfg.heroCard2) {
        heroCards.push({ rank: cfg.heroCard2.rank as Rank, suit: cfg.heroCard2.suit as Suit, faceUp: true });
      } else {
        const [h, r] = dealCards(workDeck, 1); heroCards.push(h[0]); workDeck = r;
      }

      // Opponent type (random cycles through 5 unique types)
      const UNIQUE_TYPES: PlayerType[] = ['TAG', 'LAG', 'Nit', 'Fish', 'Maniac'];
      const oppType = cfg.opponentType ?? UNIQUE_TYPES[state.handNumber % UNIQUE_TYPES.length];

      // Bot players (all same type as configured)
      const otherPositions = POSITIONS.filter(p => p !== heroPosition);
      const botPlayers: BotPlayer[] = [];
      for (let i = 0; i < Math.min(5, otherPositions.length); i++) {
        const [bc, r] = dealCards(workDeck, 2); workDeck = r;
        botPlayers.push({
          id: i, name: PLAYER_NAMES[i % PLAYER_NAMES.length],
          type: oppType, position: otherPositions[i],
          cards: bc.map(c => ({ ...c, faceUp: false })),
          stack: otherPositions[i] === 'BB' ? 99 : otherPositions[i] === 'SB' ? 99.5 : 100,
          currentBet: 0, action: null, isActive: true,
          isDealer: otherPositions[i] === 'BTN',
        });
      }

      // Community cards (specified or drawn from remaining deck)
      const allComm: Card[] = [];
      for (let i = 0; i < 5; i++) {
        const spec = cfg.communityCards[i];
        if (spec) {
          allComm.push({ rank: spec.rank as Rank, suit: spec.suit as Suit, faceUp: false });
        } else {
          const [dc, r] = dealCards(workDeck, 1); allComm.push({ ...dc[0], faceUp: false }); workDeck = r;
        }
      }

      const sig = flopSig(allComm);
      const newRecentSigs = [...state.recentBoardSigs.slice(-(BOARD_SIG_WINDOW - 1)), sig];

      if (cfg.startStreet === 'preflop') {
        const { players: updatedPlayers, actionCtx, pot } = simulateBotPreflop(botPlayers, heroPosition, state.trainingMode === 'gto');
        const mainVillain = getMainVillain(updatedPlayers);
        return {
          ...state,
          phase: 'preflop', deck: workDeck, heroCards,
          communityCards: allComm,
          heroPosition, heroStack: 100 - heroBlind, heroBet: 0, pot,
          currentBet: actionCtx.facingRaise ? actionCtx.raiseAmount : 0,
          players: updatedPlayers, handNumber: state.handNumber + 1,
          actionCtx, analysis: null, postFlopAnalysis: null,
          postFlopAnalysisHistory: [], showAnalysis: false,
          lastHeroAction: null, heroIsAggressor: false, villainPostFlopAction: null,
          mainVillainType: mainVillain.type, mainVillainPosition: mainVillain.position,
          heroActsFirst: false, postFlopStreetsDone: [],
          recentBoardSigs: newRecentSigs,
          showdownResult: null, villainFolded: false,
          heroCheckedStreet: null, heroTotalInvestedBB: heroBlind,
          handActivePlayers: [], playerStreetActions: {},
        };
      }

      // Post-flop custom start: reveal board cards, skip preflop
      const CARD_COUNTS: Record<string, number> = { flop: 3, turn: 4, river: 5 };
      const DEFAULT_POTS: Record<string, number> = { flop: 6.5, turn: 15, river: 30 };
      const APPROX_STACKS: Record<string, number> = { flop: 97, turn: 90, river: 75 };
      const visCount = CARD_COUNTS[cfg.startStreet] ?? 3;
      const startPot = DEFAULT_POTS[cfg.startStreet] ?? 6.5;
      const heroStack = APPROX_STACKS[cfg.startStreet] ?? 97;
      const revealedComm = allComm.map((c, i) => ({ ...c, faceUp: i < visCount }));

      const heroIdxC = POSTFLOP_ORDER.indexOf(heroPosition);
      const allBotPositions: Position[] = botPlayers.map(p => p.position as Position);
      const firstBotBeforeHeroC = allBotPositions
        .filter(p => POSTFLOP_ORDER.indexOf(p) < heroIdxC)
        .sort((a, b) => POSTFLOP_ORDER.indexOf(a) - POSTFLOP_ORDER.indexOf(b))[0];
      const heroActsFirst = !firstBotBeforeHeroC;
      const customVillainPos: Position = firstBotBeforeHeroC
        ?? getMainVillain(botPlayers).position;
      const customVillainPlayer = botPlayers.find(p => p.position === customVillainPos) ?? botPlayers[0];
      const visBoard = revealedComm.filter(c => c.faceUp);
      const _customTexture = analyzeBoardTexture(visBoard).texture;
      const villain = heroActsFirst
        ? null
        : state.trainingMode === 'gto'
          ? simulateVillainGTOPostFlop(_customTexture, startPot, 'none', customVillainPlayer.cards, visBoard)
          : simulateVillainPostFlop(customVillainPlayer.type, _customTexture, startPot, 'none', customVillainPlayer.cards, visBoard);
      const finalPot = startPot + (villain?.betBB ?? 0);
      const streetActions: Partial<Record<Position, { action: VillainActionType; betBB: number }>> = villain
        ? { [customVillainPos]: { action: villain.action, betBB: villain.betBB } }
        : {};

      return {
        ...state,
        phase: cfg.startStreet as GamePhase, deck: workDeck, heroCards, communityCards: revealedComm,
        heroPosition, heroStack, heroBet: 0, pot: finalPot, currentBet: 0,
        players: botPlayers, handNumber: state.handNumber + 1,
        actionCtx: { facingRaise: false, raiseAmount: 0, potSize: finalPot, calledByCount: 0, raisedByPosition: null },
        analysis: null, postFlopAnalysis: null, postFlopAnalysisHistory: [],
        showAnalysis: false, lastHeroAction: null, heroIsAggressor: false,
        villainPostFlopAction: villain,
        mainVillainType: customVillainPlayer.type, mainVillainPosition: customVillainPos,
        heroActsFirst, postFlopStreetsDone: [],
        recentBoardSigs: newRecentSigs,
        showdownResult: null, villainFolded: false, heroCheckedStreet: null,
        heroTotalInvestedBB: heroBlind + 3.25,
        handActivePlayers: allBotPositions,
        playerStreetActions: streetActions,
      };
    }

    case 'DISMISS_ANALYSIS':
      return { ...state, showAnalysis: false };

    case 'RESET':
      return {
        ...buildInitialState(),
        difficulty: state.difficulty,
        trainingMode: state.trainingMode,
        tableSize: state.tableSize,
        handNumber: state.handNumber,
        recentBoardSigs: state.recentBoardSigs,
      };

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  setDifficulty: (d: Difficulty) => void;
  setTrainingMode: (mode: 'full' | 'preflop' | 'gto' | 'custom') => void;
  setTableSize: (size: number) => void;
  startNewHand: () => void;
  startCustomHand: (config: CustomHandConfig) => void;
  goIdle: () => void;
  heroAct: (action: HeroAction, raiseBB?: number) => void;
  heroPostFlopAct: (action: PostFlopHeroAction, betPct?: number) => void;
  advancePhase: () => void;
  foldToVillainBet: () => void;
  dismissAnalysis: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, buildInitialState());
  const setDifficulty = useCallback((d: Difficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty: d }), []);
  const setTrainingMode = useCallback((mode: 'full' | 'preflop' | 'gto' | 'custom') => dispatch({ type: 'SET_TRAINING_MODE', mode }), []);
  const setTableSize = useCallback((size: number) => dispatch({ type: 'SET_TABLE_SIZE', tableSize: size }), []);
  const startNewHand = useCallback(() => dispatch({ type: 'START_HAND' }), []);
  const startCustomHand = useCallback((config: CustomHandConfig) => dispatch({ type: 'START_CUSTOM_HAND', config }), []);
  const goIdle = useCallback(() => dispatch({ type: 'GO_IDLE' }), []);
  const heroAct = useCallback((a: HeroAction, raiseBB?: number) => dispatch({ type: 'HERO_ACT', action: a, raiseBB }), []);
  const heroPostFlopAct = useCallback((a: PostFlopHeroAction, betPct?: number) => dispatch({ type: 'HERO_POSTFLOP_ACT', action: a, betPct }), []);
  const advancePhase = useCallback(() => dispatch({ type: 'ADVANCE_PHASE' }), []);
  const foldToVillainBet = useCallback(() => dispatch({ type: 'FOLD_TO_VILLAIN_BET' }), []);
  const dismissAnalysis = useCallback(() => dispatch({ type: 'DISMISS_ANALYSIS' }), []);

  return (
    <GameContext.Provider value={{ state, setDifficulty, setTrainingMode, setTableSize, startNewHand, startCustomHand, goIdle, heroAct, heroPostFlopAct, advancePhase, foldToVillainBet, dismissAnalysis }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
