import React, {
  createContext, useCallback, useContext, useReducer,
} from 'react';
import {
  Card, MistakeType, Position, POSITIONS, PlayerType, Difficulty,
  createDeck, shuffleDeck, getHandNotation, getEquity, calcPotOdds,
  getHandStrength, GTO_RANGES, BB_DEFENSE, simulateBotAction,
  THREEBET_VALUE, RANK_VALUES,
  BoardTextureResult, MadeHand, CbetRecommendation,
  analyzeBoardTexture, evaluateMadeHand, getCbetRecommendation,
  simulateVillainPostFlop, evaluateHandWinner,
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
}

type GameAction =
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'START_HAND' }
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
  const potOdds = calcPotOdds(actionCtx.raiseAmount, actionCtx.potSize);
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
  const cbet = getCbetRecommendation(boardTexture.texture, madeHandRank, heroIsAggressor, facingBet);
  // potBB already includes villain's bet — subtract it back to get pot before call
  const potOddsPct = facingBet ? calcPotOdds(villainOpenAction.betBB, potBB - villainOpenAction.betBB) : 0;
  const betBB = Math.round((betPct / 100) * potBB * 10) / 10;
  const mistakes: MistakeType[] = [];

  if (!facingBet) {
    if (cbet.action === 'bet' && (heroAction === 'check' || heroAction === 'fold') && madeHandRank >= 3) {
      mistakes.push('missed_value');
    }
    const bluffBadBoard = boardTexture.texture === 'wet' || boardTexture.texture === 'monotone';
    if ((heroAction === 'bet' || heroAction === 'raise') && madeHandRank <= 1 &&
        (villainType === 'Fish' || bluffBadBoard)) {
      mistakes.push('bad_bluff');
    }
  } else {
    const foldTooTightThreshold = villainType === 'Maniac' ? 2 : 3;
    if (heroAction === 'fold' && madeHandRank >= foldTooTightThreshold) mistakes.push('folded_too_tight');
    if ((heroAction === 'call' || heroAction === 'raise') && madeHandRank <= 1 && villainOpenAction.betPct >= 66) {
      mistakes.push('ignored_pot_odds');
    }
  }

  const isGTO = mistakes.length === 0;
  let gtoAction: PostFlopHeroAction;
  let gtoSizingPct = cbet.sizingPct;
  if (facingBet) {
    gtoAction = madeHandRank >= 5 ? 'raise' : madeHandRank >= 3 ? 'call' :
                (madeHandRank === 2 && potOddsPct < 30) ? 'call' : 'fold';
  } else {
    gtoAction = cbet.action === 'bet' ? 'bet' : 'check';
    gtoSizingPct = cbet.sizingPct;
  }

  const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);

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
    advice = `Good ${streetLabel} decision! ${madeHand} on a ${boardTexture.label} board — ${heroAction} is solid.${villainResponseNote}`;
  } else if (mistakes.includes('missed_value')) {
    advice = `You have ${madeHand} on a ${boardTexture.label} board — betting for value is more profitable. ${cbet.reason}${villainResponseNote}`;
  } else if (mistakes.includes('bad_bluff')) {
    advice = `Bluffing on a ${boardTexture.label} board with no made hand is high risk. ${cbet.reason}${villainResponseNote}`;
  } else if (mistakes.includes('folded_too_tight')) {
    advice = `Folding ${madeHand} to a ${villainOpenAction.betPct}% pot bet is too tight. This hand has enough strength to continue.${villainResponseNote}`;
  } else if (mistakes.includes('ignored_pot_odds')) {
    advice = `Calling ${villainOpenAction.betPct}% pot with no made hand requires ${potOddsPct}% equity — you likely don't have it.${villainResponseNote}`;
  } else {
    advice = cbet.reason + villainResponseNote;
  }

  const exploitTip = getExploitTipPostFlop(villainType, heroAction, madeHandRank, facingBet, mistakes);
  return {
    street, boardTexture, madeHand, madeHandRank, heroAction, betPct, betBB,
    villainAction: villainOpenAction.action,
    villainBetPct: villainOpenAction.betPct,
    villainBetBB: villainOpenAction.betBB,
    villainResponse: vr?.action ?? null,
    villainResponseBetBB: vr?.betBB ?? 0,
    cbetRecommendation: cbet, isGTO, gtoAction, gtoSizingPct, mistakes, advice, exploitTip, heroIsAggressor,
  };
}

function simulateBotPreflop(players: BotPlayer[], heroPosition: Position): {
  players: BotPlayer[]; actionCtx: ActionContext; pot: number;
} {
  const pfOrder: Position[] = ['UTG','HJ','CO','BTN','SB','BB'];
  const heroIdx = pfOrder.indexOf(heroPosition);
  let pot = 1.5, facingRaise = false, raiseAmount = 0;
  let raisedByPosition: Position|null = null, calledByCount = 0;

  const updated = players.map(p => {
    const posIdx = pfOrder.indexOf(p.position);
    if (posIdx < 0 || posIdx >= heroIdx) return p;
    const botAction = simulateBotAction(p.type, p.position, facingRaise, raiseAmount, pot);
    let bet = 0;
    if (botAction === 'raise') {
      bet = facingRaise ? raiseAmount * 3 : 3;
      facingRaise = true; raiseAmount = bet; raisedByPosition = p.position;
    } else if (botAction === 'call') {
      bet = facingRaise ? raiseAmount : 0; calledByCount++;
    }
    pot += bet;
    return { ...p, action: botAction, currentBet: bet, isActive: botAction !== 'fold' };
  });
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

function revealCommunityCards(cards: Card[], count: number): Card[] {
  let n = 0;
  return cards.map(c => (!c.faceUp && n < count) ? (n++, { ...c, faceUp: true }) : c);
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };

    case 'START_HAND': {
      const heroPosition = POSITIONS[state.handNumber % POSITIONS.length];
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

        const otherPositions = POSITIONS.filter(p => p !== heroPosition);
        players = [];
        for (let i = 0; i < Math.min(5, otherPositions.length); i++) {
          const [botCards, nextDeck] = dealCards(deck, 2);
          deck = nextDeck;
          players.push({
            id: i, name: PLAYER_NAMES[i % PLAYER_NAMES.length],
            type: PLAYER_TYPE_LIST[i % PLAYER_TYPE_LIST.length],
            position: otherPositions[i],
            cards: botCards.map(c => ({ ...c, faceUp: false })),
            stack: 80 + Math.floor(Math.random() * 60),
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
      const { players: updatedPlayers, actionCtx, pot } = simulateBotPreflop(players, heroPosition);
      const mainVillain = getMainVillain(updatedPlayers);
      const mainVillainType = mainVillain.type;
      const mainVillainPosition = mainVillain.position;
      const newRecentSigs = [...recentSigs.slice(-(BOARD_SIG_WINDOW - 1)), sig];

      return {
        ...state,
        phase: 'preflop', deck, heroCards,
        communityCards: faceDown,
        heroPosition, heroStack: 100, heroBet: 0, pot,
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
        ? Math.max(0, raiseBB - heroAlreadyIn)
        : heroAction === 'call'
          ? Math.max(0, callTotal - heroAlreadyIn)
          : 0;
      let preflopPot = state.pot + heroBet;

      // ── Simulate remaining preflop actors after hero ───────────────────
      // Any active bot who hasn't had a chance to respond to the final raise
      // gets to call or fold now, so the flop pot reflects everyone's money.
      if (heroAction !== 'fold') {
        const pfOrder: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
        const heroIdx = pfOrder.indexOf(state.heroPosition);

        // (A) Bots who act AFTER hero in preflop order (e.g. SB/BB when hero is BTN)
        for (const bot of state.players) {
          const posIdx = pfOrder.indexOf(bot.position as typeof pfOrder[number]);
          if (!bot.isActive || posIdx <= heroIdx) continue;
          // Blinds already have chips committed; raise/open amount hero put in
          const alreadyIn = bot.position === 'BB' ? 1 : bot.position === 'SB' ? 0.5 : 0;
          const heroRaised = heroAction === 'raise';
          const facingAmt = heroRaised ? raiseBB : (state.actionCtx.facingRaise ? state.actionCtx.raiseAmount : 0);
          if (facingAmt > alreadyIn) {
            const resp = simulateBotAction(bot.type, bot.position, true, facingAmt, preflopPot);
            if (resp !== 'fold') preflopPot += facingAmt - alreadyIn;
          }
        }

        // (B) Original raiser calls hero's 3-bet
        //     They already have raiseAmount in — add the difference if they call.
        if (heroAction === 'raise' && state.actionCtx.facingRaise && state.actionCtx.raisedByPosition) {
          const origRaiser = state.players.find(
            p => p.position === state.actionCtx.raisedByPosition && p.isActive,
          );
          if (origRaiser) {
            const resp = simulateBotAction(origRaiser.type, origRaiser.position, true, raiseBB, preflopPot);
            if (resp !== 'fold') preflopPot += Math.max(0, raiseBB - state.actionCtx.raiseAmount);
          }
        }
      }

      const analysis = buildPreflopAnalysis(state.heroCards, state.heroPosition, heroAction, raiseBB, state.actionCtx, state.mainVillainType);

      if (heroAction === 'fold') {
        return {
          ...state, phase: 'showdown', heroBet, pot: preflopPot,
          analysis, showAnalysis: true, lastHeroAction: heroAction,
          heroIsAggressor: false, showdownResult: 'villain', villainFolded: false,
        };
      }

      const flopCards = revealCommunityCards(state.communityCards, 3);
      const heroIsAggressor = heroAction === 'raise';

      const POSTFLOP_ORDER: Position[] = ['SB','BB','UTG','HJ','CO','BTN'];
      const heroActsFirst = POSTFLOP_ORDER.indexOf(state.heroPosition) < POSTFLOP_ORDER.indexOf(state.mainVillainPosition);

      const villainPlayer = getMainVillainPlayer(state);
      const visibleBoard = flopCards.filter(c => c.faceUp);
      const villain = heroActsFirst
        ? null
        : simulateVillainPostFlop(
            state.mainVillainType,
            analyzeBoardTexture(visibleBoard).texture,
            preflopPot, 'none',
            villainPlayer.cards, visibleBoard,
          );

      // Add villain's opening bet to pot immediately so the display updates at once
      const flopPot = preflopPot + (villain?.betBB ?? 0);

      return {
        ...state,
        players: state.players.map(p => ({ ...p, action: null })),
        phase: 'flop', heroBet, pot: flopPot,
        communityCards: flopCards, analysis, postFlopAnalysis: null,
        showAnalysis: true, lastHeroAction: heroAction,
        heroIsAggressor, villainPostFlopAction: villain, heroActsFirst,
        postFlopStreetsDone: [],
        showdownResult: null, villainFolded: false,
      };
    }

    case 'HERO_POSTFLOP_ACT': {
      const { action: heroAction, betPct = 0 } = action;
      const street = state.phase as PostFlopStreet;
      const board = state.communityCards.filter(c => c.faceUp);
      const betBB = Math.round((betPct / 100) * state.pot * 10) / 10;

      // Get villain's cards for realistic simulation
      const villainPlayer = getMainVillainPlayer(state);
      const villainCards = villainPlayer.cards;

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
        // Hero acts first → villain responds to hero's action
        villainFinalResponse = simulateVillainPostFlop(
          state.mainVillainType,
          analyzeBoardTexture(board).texture,
          state.pot,
          heroAction as 'none'|'check'|'bet'|'raise',
          villainCards, board,
        );
      } else if (heroAction === 'raise') {
        // Villain opened, hero raised → simulate villain's response to the raise
        villainFinalResponse = simulateVillainPostFlop(
          state.mainVillainType,
          analyzeBoardTexture(board).texture,
          state.pot + betBB,
          'raise',
          villainCards, board,
        );
      } else {
        // Hero called / checked facing villain's action — street is over, no further response
        villainFinalResponse = villainOpenAction;
      }

      const villainFolded = villainFinalResponse.action === 'fold';

      // ── Pot calculation ─────────────────────────────────────────────────
      // NOTE: state.pot already includes villain's opening bet (baked in when
      // villainPostFlopAction was set).  All arithmetic below must only add
      // NEW chips — never re-add the opening bet.
      const callBB = state.villainPostFlopAction?.betBB ?? 0;
      // How many chips villain already committed this street (already in pot)
      const villainAlreadyIn = !state.heroActsFirst ? villainOpenAction.betBB : 0;
      let newPot = state.pot;

      if (heroAction === 'bet' || heroAction === 'raise') {
        newPot += betBB; // hero's chips
        if (villainFinalResponse.action === 'call') {
          // Villain calls hero's total bet; they already put villainAlreadyIn in
          newPot += Math.max(0, betBB - villainAlreadyIn);
        } else if (villainFinalResponse.action === 'raise') {
          // Villain raises to a new total; subtract what they already have in
          newPot += Math.max(0, villainFinalResponse.betBB - villainAlreadyIn);
          // Hero implicitly calls back up to villain's raise
          newPot += Math.max(0, villainFinalResponse.betBB - betBB);
        }
        // fold: villain adds nothing
      } else if (heroAction === 'call') {
        // Villain's bet is already in state.pot — only add hero's matching call
        newPot += callBB;
      } else if (heroAction === 'check') {
        if (villainFinalResponse.betBB > 0) newPot += villainFinalResponse.betBB;
      }

      // ── Build analysis ──────────────────────────────────────────────────
      const pfa = buildPostFlopAnalysis(
        state.heroCards, board, street, heroAction, betPct, state.pot,
        villainOpenAction,
        villainFinalResponse.action !== villainOpenAction.action ? villainFinalResponse : null,
        state.heroIsAggressor,
        state.mainVillainType,
      );

      const newHistory = [...state.postFlopAnalysisHistory, pfa];

      // ── End-of-hand transitions ─────────────────────────────────────────
      if (heroAction === 'fold') {
        return {
          ...state, phase: 'showdown', pot: newPot,
          postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
          villainPostFlopAction: villainOpenAction,
          showAnalysis: true,
          postFlopStreetsDone: [...state.postFlopStreetsDone, street],
          showdownResult: 'villain', villainFolded: false,
        };
      }

      if (villainFolded) {
        // Hero's bet forced villain out — hero wins the pot
        return {
          ...state, phase: 'showdown', pot: newPot,
          postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
          villainPostFlopAction: villainFinalResponse,
          showAnalysis: true,
          postFlopStreetsDone: [...state.postFlopStreetsDone, street],
          showdownResult: 'hero', villainFolded: true,
        };
      }

      return {
        ...state, pot: newPot,
        postFlopAnalysis: pfa, postFlopAnalysisHistory: newHistory,
        villainPostFlopAction: villainFinalResponse,
        showAnalysis: true,
        postFlopStreetsDone: [...state.postFlopStreetsDone, street],
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
        const villain = state.heroActsFirst
          ? null
          : simulateVillainPostFlop(
              state.mainVillainType, analyzeBoardTexture(board).texture,
              state.pot, 'none', villainCards, board,
            );
        return {
          ...state, players: clearedPlayers, phase: 'turn',
          communityCards: turnCards, postFlopAnalysis: null,
          showAnalysis: false, villainPostFlopAction: villain,
          pot: state.pot + (villain?.betBB ?? 0),
        };
      }

      if (state.phase === 'turn') {
        const riverCards = state.communityCards.map(c => ({ ...c, faceUp: true }));
        const board = riverCards.filter(c => c.faceUp);
        const villain = state.heroActsFirst
          ? null
          : simulateVillainPostFlop(
              state.mainVillainType, analyzeBoardTexture(board).texture,
              state.pot, 'none', villainCards, board,
            );
        return {
          ...state, players: clearedPlayers, phase: 'river',
          communityCards: riverCards, postFlopAnalysis: null,
          showAnalysis: false, villainPostFlopAction: villain,
          pot: state.pot + (villain?.betBB ?? 0),
        };
      }

      if (state.phase === 'river') {
        // Reveal main villain's cards + evaluate the winner
        const board = state.communityCards.filter(c => c.faceUp);
        const revealedPlayers = state.players.map(p =>
          p.position === state.mainVillainPosition
            ? { ...p, cards: p.cards.map(c => ({ ...c, faceUp: true })) }
            : p
        );
        const showdownResult = evaluateHandWinner(state.heroCards, villainPlayer.cards, board);
        return {
          ...state,
          players: revealedPlayers,
          phase: 'showdown',
          showAnalysis: false,
          postFlopAnalysis: null,
          showdownResult,
          villainFolded: false,
        };
      }

      return state;
    }

    case 'DISMISS_ANALYSIS':
      return { ...state, showAnalysis: false };

    case 'RESET':
      return {
        ...buildInitialState(),
        difficulty: state.difficulty,
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
  startNewHand: () => void;
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
  const startNewHand = useCallback(() => dispatch({ type: 'START_HAND' }), []);
  const heroAct = useCallback((a: HeroAction, raiseBB?: number) => dispatch({ type: 'HERO_ACT', action: a, raiseBB }), []);
  const heroPostFlopAct = useCallback((a: PostFlopHeroAction, betPct?: number) => dispatch({ type: 'HERO_POSTFLOP_ACT', action: a, betPct }), []);
  const advancePhase = useCallback(() => dispatch({ type: 'ADVANCE_PHASE' }), []);
  const foldToVillainBet = useCallback(() => dispatch({ type: 'FOLD_TO_VILLAIN_BET' }), []);
  const dismissAnalysis = useCallback(() => dispatch({ type: 'DISMISS_ANALYSIS' }), []);

  return (
    <GameContext.Provider value={{ state, setDifficulty, startNewHand, heroAct, heroPostFlopAct, advancePhase, foldToVillainBet, dismissAnalysis }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
