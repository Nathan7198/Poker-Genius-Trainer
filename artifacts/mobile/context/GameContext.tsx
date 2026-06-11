import React, {
  createContext, useCallback, useContext, useReducer,
} from 'react';
import {
  Card, MistakeType, Position, POSITIONS, PlayerType, Difficulty,
  createDeck, shuffleDeck, getHandNotation, getEquity, calcPotOdds,
  getHandStrength, GTO_RANGES, BB_DEFENSE, simulateBotAction,
  THREEBET_VALUE, RANK_VALUES,
  BoardTextureResult, MadeHand, CbetRecommendation,
  analyzeBoardTexture, evaluateMadeHand, getCbetRecommendation, simulateVillainPostFlop,
} from '@/constants/pokerData';

export type GamePhase = 'idle'|'preflop'|'flop'|'turn'|'river'|'showdown';
export type HeroAction = 'fold'|'check'|'call'|'raise'|'limp';
export type PostFlopHeroAction = 'check'|'call'|'fold'|'bet'|'raise';
export type PostFlopStreet = 'flop'|'turn'|'river';

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
  gtoAction: 'raise'|'call'|'fold';
  gtoRaiseSize?: number;
  equity: number;
  potOdds: number;
  mistakes: MistakeType[];
  advice: string;
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
  villainAction: 'bet'|'check';
  villainBetPct: number;
  villainBetBB: number;
  cbetRecommendation: CbetRecommendation;
  isGTO: boolean;
  gtoAction: PostFlopHeroAction;
  gtoSizingPct: number;
  mistakes: MistakeType[];
  advice: string;
  heroIsAggressor: boolean;
}

export interface VillainPostFlopAction {
  action: 'bet'|'check';
  betPct: number;
  betBB: number;
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
  showAnalysis: boolean;
  lastHeroAction: HeroAction|null;
  heroIsAggressor: boolean;
  villainPostFlopAction: VillainPostFlopAction|null;
  mainVillainType: PlayerType;
  postFlopStreetsDone: PostFlopStreet[];
}

type GameAction =
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'START_HAND' }
  | { type: 'HERO_ACT'; action: HeroAction; raiseBB?: number }
  | { type: 'HERO_POSTFLOP_ACT'; action: PostFlopHeroAction; betPct?: number }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'DISMISS_ANALYSIS' }
  | { type: 'RESET' };

const PLAYER_NAMES = ['Alex','Jordan','Morgan','Riley','Casey','Taylor','Drew','Quinn'];
const PLAYER_TYPE_LIST: PlayerType[] = ['TAG','LAG','Nit','Fish','Maniac','TAG','LAG','Nit'];

function buildInitialState(): GameState {
  return {
    phase: 'idle',
    deck: [],
    heroCards: [],
    communityCards: [],
    heroPosition: 'BTN',
    heroStack: 100,
    heroBet: 0,
    pot: 0,
    currentBet: 0,
    players: [],
    difficulty: 'Beginner',
    handNumber: 0,
    actionCtx: { facingRaise: false, raiseAmount: 0, potSize: 1.5, calledByCount: 0, raisedByPosition: null },
    analysis: null,
    postFlopAnalysis: null,
    showAnalysis: false,
    lastHeroAction: null,
    heroIsAggressor: false,
    villainPostFlopAction: null,
    mainVillainType: 'TAG',
    postFlopStreetsDone: [],
  };
}

function dealCards(deck: Card[], count: number): [Card[], Card[]] {
  const hand = deck.slice(0, count).map(c => ({ ...c, faceUp: true }));
  return [hand, deck.slice(count)];
}

function buildPreflopAnalysis(
  heroCards: Card[],
  heroPosition: Position,
  action: HeroAction,
  raiseBB: number,
  actionCtx: ActionContext,
): HandAnalysis {
  const notation = getHandNotation(heroCards[0], heroCards[1]);
  const equity = getEquity(notation);
  const potOdds = calcPotOdds(actionCtx.raiseAmount, actionCtx.potSize);
  const strength = getHandStrength(notation);
  const inRange = GTO_RANGES[heroPosition].has(notation);
  const inDefense = BB_DEFENSE.has(notation);
  const inThreebet = THREEBET_VALUE.has(notation);
  const mistakes: MistakeType[] = [];
  let gtoAction: 'raise'|'call'|'fold' = 'fold';

  if (!actionCtx.facingRaise) {
    gtoAction = inRange ? 'raise' : 'fold';
    if (action === 'fold' && inRange) mistakes.push('folded_too_tight');
    if (action === 'call') mistakes.push('limp_utg');
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
    advice = `Correct! ${notation} (${strength}) is the right ${gtoAction} from ${heroPosition}.`;
  } else if (mistakes.includes('folded_too_tight')) {
    advice = `${notation} is in your GTO range from ${heroPosition}. ${inRange ? 'Open to ~3BB' : 'Defend vs the raise'}.`;
  } else if (mistakes.includes('called_too_loose')) {
    advice = `${notation} is outside your profitable ${heroPosition} range. Fold to avoid dominated situations.`;
  } else if (mistakes.includes('limp_utg')) {
    advice = `Limping is exploitable. Either open-raise to ~3BB with ${notation} or fold. Never limp.`;
  } else if (mistakes.includes('ignored_pot_odds')) {
    advice = `You need ${potOdds}% equity to call but have ~${equity}% — calling is actually breakeven or better.`;
  } else {
    advice = `Standard open: 2.5–3BB. 3-bet to ~9–11BB total. Check your sizing.`;
  }

  return {
    handNotation: notation, heroPosition, heroAction: action, raiseAmountBB: raiseBB,
    isGTO, gtoAction, gtoRaiseSize: gtoAction === 'raise' ? 3 : undefined,
    equity, potOdds, mistakes, advice, handStrength: strength,
  };
}

function buildPostFlopAnalysis(
  heroCards: Card[],
  board: Card[],
  street: PostFlopStreet,
  heroAction: PostFlopHeroAction,
  betPct: number,
  potBB: number,
  villainAction: VillainPostFlopAction,
  heroIsAggressor: boolean,
): PostFlopStreetAnalysis {
  const facingBet = villainAction.action === 'bet';
  const boardTexture = analyzeBoardTexture(board);
  const { hand: madeHand, rank: madeHandRank } = evaluateMadeHand(heroCards, board);
  const cbet = getCbetRecommendation(boardTexture.texture, madeHandRank, heroIsAggressor, facingBet);

  const potOddsPct = facingBet ? calcPotOdds(villainAction.betBB, potBB) : 0;
  const betBB = Math.round((betPct / 100) * potBB * 10) / 10;

  const mistakes: MistakeType[] = [];

  if (!facingBet) {
    // Villain checked — hero is first to act (or second action)
    if (cbet.action === 'bet' && (heroAction === 'check' || heroAction === 'fold') && madeHandRank >= 3) {
      mistakes.push('missed_value');
    }
    if ((heroAction === 'bet' || heroAction === 'raise') && madeHandRank <= 1 &&
        (boardTexture.texture === 'wet' || boardTexture.texture === 'monotone')) {
      mistakes.push('bad_bluff');
    }
  } else {
    // Villain bet — hero responds
    if (heroAction === 'fold' && madeHandRank >= 3) {
      mistakes.push('folded_too_tight');
    }
    if ((heroAction === 'call' || heroAction === 'raise') && madeHandRank <= 1 && villainAction.betPct >= 66) {
      mistakes.push('ignored_pot_odds');
    }
    if ((heroAction === 'call' || heroAction === 'raise') && madeHandRank <= 1 &&
        villainAction.betPct >= 100 && potOddsPct > 35) {
      mistakes.push('ignored_pot_odds');
    }
  }

  const isGTO = mistakes.length === 0;

  let gtoAction: PostFlopHeroAction;
  let gtoSizingPct = cbet.sizingPct;
  if (facingBet) {
    gtoAction = madeHandRank >= 5 ? 'raise' : madeHandRank >= 3 ? 'call' : madeHandRank === 2 && potOddsPct < 30 ? 'call' : 'fold';
  } else {
    gtoAction = cbet.action === 'bet' ? 'bet' : 'check';
    gtoSizingPct = cbet.sizingPct;
  }

  let advice = '';
  const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);
  if (isGTO) {
    advice = `Good ${streetLabel} decision! ${madeHand} on a ${boardTexture.label} board — ${heroAction} is solid.`;
  } else if (mistakes.includes('missed_value')) {
    advice = `You have ${madeHand} on a ${boardTexture.label} board — betting for value is more profitable than checking. ${cbet.reason}`;
  } else if (mistakes.includes('bad_bluff')) {
    advice = `Bluffing on a ${boardTexture.label} board with no made hand is risky — you're easily raised off your hand. ${cbet.reason}`;
  } else if (mistakes.includes('folded_too_tight')) {
    advice = `Folding ${madeHand} to a ${villainAction.betPct}% pot bet is too tight. This hand has enough strength to continue.`;
  } else if (mistakes.includes('ignored_pot_odds')) {
    advice = `Calling ${villainAction.betPct}% pot requires ~${potOddsPct}% equity. Without a made hand, this bet is a losing call long-term.`;
  } else {
    advice = `${cbet.reason}`;
  }

  return {
    street, boardTexture, madeHand, madeHandRank, heroAction, betPct, betBB,
    villainAction: villainAction.action, villainBetPct: villainAction.betPct, villainBetBB: villainAction.betBB,
    cbetRecommendation: cbet, isGTO, gtoAction, gtoSizingPct, mistakes, advice, heroIsAggressor,
  };
}

function simulateBotPreflop(players: BotPlayer[], heroPosition: Position): {
  players: BotPlayer[];
  actionCtx: ActionContext;
  pot: number;
} {
  const pfOrder: Position[] = ['UTG','HJ','CO','BTN','SB','BB'];
  const heroIdx = pfOrder.indexOf(heroPosition);
  let pot = 1.5;
  let facingRaise = false;
  let raiseAmount = 0;
  let raisedByPosition: Position|null = null;
  let calledByCount = 0;

  const updated = players.map(p => {
    const posIdx = pfOrder.indexOf(p.position);
    if (posIdx < 0 || posIdx >= heroIdx) return p;
    const botAction = simulateBotAction(p.type, p.position, facingRaise, raiseAmount, pot);
    let bet = 0;
    if (botAction === 'raise') {
      bet = facingRaise ? raiseAmount * 3 : 3;
      facingRaise = true;
      raiseAmount = bet;
      raisedByPosition = p.position;
    } else if (botAction === 'call') {
      bet = facingRaise ? raiseAmount : 0;
      calledByCount++;
    }
    pot += bet;
    return { ...p, action: botAction, currentBet: bet, isActive: botAction !== 'fold' };
  });

  return {
    players: updated,
    actionCtx: { facingRaise, raiseAmount, potSize: pot, calledByCount, raisedByPosition },
    pot,
  };
}

function getMainVillain(players: BotPlayer[]): BotPlayer {
  const active = players.filter(p => p.isActive);
  const maniac = active.find(p => p.type === 'Maniac');
  const lag = active.find(p => p.type === 'LAG');
  return maniac ?? lag ?? active[0] ?? players[0];
}

function revealCommunityCards(cards: Card[], count: number): Card[] {
  let revealed = 0;
  return cards.map(c => {
    if (!c.faceUp && revealed < count) { revealed++; return { ...c, faceUp: true }; }
    return c;
  });
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };

    case 'START_HAND': {
      let deck = shuffleDeck(createDeck());
      const heroPosition = POSITIONS[state.handNumber % POSITIONS.length];
      const [heroCards, deckAfterHero] = dealCards(deck, 2);
      deck = deckAfterHero;
      const otherPositions = POSITIONS.filter(p => p !== heroPosition);
      const players: BotPlayer[] = [];

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

      const [communityCards, finalDeck] = dealCards(deck, 5);
      const faceDown = communityCards.map(c => ({ ...c, faceUp: false }));
      const { players: updatedPlayers, actionCtx, pot } = simulateBotPreflop(players, heroPosition);
      const mainVillainType = getMainVillain(updatedPlayers).type;

      return {
        ...state,
        phase: 'preflop',
        deck: finalDeck,
        heroCards,
        communityCards: faceDown,
        heroPosition,
        heroStack: 100,
        heroBet: 0,
        pot,
        currentBet: actionCtx.facingRaise ? actionCtx.raiseAmount : 0,
        players: updatedPlayers,
        handNumber: state.handNumber + 1,
        actionCtx,
        analysis: null,
        postFlopAnalysis: null,
        showAnalysis: false,
        lastHeroAction: null,
        heroIsAggressor: false,
        villainPostFlopAction: null,
        mainVillainType,
        postFlopStreetsDone: [],
      };
    }

    case 'HERO_ACT': {
      const { action: heroAction, raiseBB = 3 } = action;
      const heroBet = heroAction === 'raise' ? raiseBB : heroAction === 'call' ? state.actionCtx.raiseAmount : 0;
      const newPot = state.pot + heroBet;
      const analysis = buildPreflopAnalysis(
        state.heroCards, state.heroPosition, heroAction, raiseBB, state.actionCtx,
      );

      if (heroAction === 'fold') {
        return {
          ...state,
          phase: 'showdown',
          heroBet,
          pot: newPot,
          analysis,
          showAnalysis: true,
          lastHeroAction: heroAction,
          heroIsAggressor: false,
        };
      }

      // Hero continues — deal flop and simulate villain's first post-flop action
      const flopCards = revealCommunityCards(state.communityCards, 3);
      const heroIsAggressor = heroAction === 'raise';
      const villain = simulateVillainPostFlop(state.mainVillainType, analyzeBoardTexture(flopCards.filter(c => c.faceUp)).texture, newPot);

      return {
        ...state,
        phase: 'flop',
        heroBet,
        pot: newPot,
        communityCards: flopCards,
        analysis,
        postFlopAnalysis: null,
        showAnalysis: true,
        lastHeroAction: heroAction,
        heroIsAggressor,
        villainPostFlopAction: villain,
        postFlopStreetsDone: [],
      };
    }

    case 'HERO_POSTFLOP_ACT': {
      const { action: heroAction, betPct = 0 } = action;
      const street = state.phase as PostFlopStreet;
      const board = state.communityCards.filter(c => c.faceUp);
      const potFlopAnalysis = buildPostFlopAnalysis(
        state.heroCards, board, street, heroAction, betPct,
        state.pot, state.villainPostFlopAction ?? { action: 'check', betPct: 0, betBB: 0 },
        state.heroIsAggressor,
      );

      const betBB = Math.round((betPct / 100) * state.pot * 10) / 10;
      const callBB = state.villainPostFlopAction?.betBB ?? 0;
      let newPot = state.pot;
      if (heroAction === 'bet') newPot += betBB;
      else if (heroAction === 'call') newPot += callBB;
      else if (heroAction === 'raise') newPot += betBB;

      if (heroAction === 'fold') {
        return {
          ...state, phase: 'showdown',
          pot: newPot,
          postFlopAnalysis: potFlopAnalysis,
          showAnalysis: true,
          postFlopStreetsDone: [...state.postFlopStreetsDone, street],
        };
      }

      return {
        ...state,
        pot: newPot,
        postFlopAnalysis: potFlopAnalysis,
        showAnalysis: true,
        postFlopStreetsDone: [...state.postFlopStreetsDone, street],
      };
    }

    case 'ADVANCE_PHASE': {
      if (state.phase === 'flop') {
        const turnCards = revealCommunityCards(state.communityCards, 1);
        const board = turnCards.filter(c => c.faceUp);
        const texture = analyzeBoardTexture(board).texture;
        const villain = simulateVillainPostFlop(state.mainVillainType, texture, state.pot);
        return {
          ...state, phase: 'turn',
          communityCards: turnCards,
          postFlopAnalysis: null,
          showAnalysis: false,
          villainPostFlopAction: villain,
        };
      }
      if (state.phase === 'turn') {
        const riverCards = state.communityCards.map(c => ({ ...c, faceUp: true }));
        const board = riverCards.filter(c => c.faceUp);
        const texture = analyzeBoardTexture(board).texture;
        const villain = simulateVillainPostFlop(state.mainVillainType, texture, state.pot);
        return {
          ...state, phase: 'river',
          communityCards: riverCards,
          postFlopAnalysis: null,
          showAnalysis: false,
          villainPostFlopAction: villain,
        };
      }
      if (state.phase === 'river') {
        return { ...state, phase: 'showdown', showAnalysis: false, postFlopAnalysis: null };
      }
      return state;
    }

    case 'DISMISS_ANALYSIS':
      return { ...state, showAnalysis: false };

    case 'RESET':
      return { ...buildInitialState(), difficulty: state.difficulty, handNumber: state.handNumber };

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
  const dismissAnalysis = useCallback(() => dispatch({ type: 'DISMISS_ANALYSIS' }), []);

  return (
    <GameContext.Provider value={{ state, setDifficulty, startNewHand, heroAct, heroPostFlopAct, advancePhase, dismissAnalysis }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
