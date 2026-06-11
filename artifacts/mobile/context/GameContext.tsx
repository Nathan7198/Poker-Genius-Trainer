import React, {
  createContext, useCallback, useContext, useReducer, useRef,
} from 'react';
import {
  Card, MistakeType, Position, POSITIONS, PlayerType, Difficulty,
  createDeck, shuffleDeck, getHandNotation, getEquity, calcPotOdds,
  getHandStrength, GTO_RANGES, BB_DEFENSE, simulateBotAction,
  THREEBET_VALUE, PLAYER_TYPE_INFO, RANK_VALUES,
} from '@/constants/pokerData';

export type GamePhase = 'idle'|'preflop'|'flop'|'turn'|'river'|'showdown';

export type HeroAction = 'fold'|'check'|'call'|'raise'|'limp';

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
  raiseAmount: number; // in BB
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
  showAnalysis: boolean;
  lastHeroAction: HeroAction|null;
}

type GameAction =
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'START_HAND' }
  | { type: 'PROCESS_BOT_PREFLOP' }
  | { type: 'HERO_ACT'; action: HeroAction; raiseBB?: number }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'DISMISS_ANALYSIS' }
  | { type: 'RESET' };

const PLAYER_NAMES = ['Alex','Jordan','Morgan','Riley','Casey','Taylor','Drew','Quinn'];
const PLAYER_TYPE_LIST: PlayerType[] = ['TAG','LAG','Nit','Fish','Maniac','TAG','LAG','Nit'];

function buildInitialState(): GameState {
  return {
    phase:'idle',
    deck:[],
    heroCards:[],
    communityCards:[],
    heroPosition:'BTN',
    heroStack:100,
    heroBet:0,
    pot:0,
    currentBet:0,
    players:[],
    difficulty:'Beginner',
    handNumber:0,
    actionCtx:{ facingRaise:false, raiseAmount:0, potSize:1.5, calledByCount:0, raisedByPosition:null },
    analysis:null,
    showAnalysis:false,
    lastHeroAction:null,
  };
}

function assignPositions(heroIdx: number, count: number): Position[] {
  const all = POSITIONS.slice();
  // rotate so heroIdx maps to a specific position
  const offset = heroIdx % all.length;
  const result: Position[] = [];
  for (let i = 0; i < count; i++) {
    result.push(all[(offset + i) % all.length]);
  }
  return result;
}

function dealCards(deck: Card[], count: number): [Card[], Card[]] {
  const hand = deck.slice(0, count).map(c => ({ ...c, faceUp: true }));
  return [hand, deck.slice(count)];
}

function buildAnalysis(
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
      if (equity < potOdds) mistakes.push('ignored_pot_odds');
      else mistakes.push('called_too_loose');
    }
  }

  const isGTO = mistakes.length === 0;
  let advice = '';
  if (isGTO) {
    advice = `Correct! Your ${notation} is ${strength.toLowerCase()} and ${gtoAction === 'fold' ? 'outside your range here — folding preserves your equity' : `in your opening range from ${heroPosition}`}.`;
  } else {
    if (mistakes.includes('folded_too_tight')) {
      advice = `${notation} is in your GTO range from ${heroPosition}. ${inRange ? `Open to ~3x BB` : `Defend vs the raise`}.`;
    } else if (mistakes.includes('called_too_loose')) {
      advice = `${notation} falls outside your profitable ${heroPosition} range. Folding protects you from dominated situations.`;
    } else if (mistakes.includes('limp_utg')) {
      advice = `Limping is exploitable. Open ${notation} to ~3BB or fold. Never limp from early position.`;
    } else if (mistakes.includes('ignored_pot_odds')) {
      advice = `You need ${potOdds}% equity to call but have ~${equity}%. Calling is breakeven or better here.`;
    } else {
      advice = `Correct sizing: open 2.5–3x BB, 3-bet to ~9–11x BB total.`;
    }
  }

  return {
    handNotation: notation,
    heroPosition,
    heroAction: action,
    raiseAmountBB: raiseBB,
    isGTO,
    gtoAction,
    gtoRaiseSize: gtoAction === 'raise' ? 3 : undefined,
    equity,
    potOdds,
    mistakes,
    advice,
    handStrength: strength,
  };
}

function simulateBotPreflop(players: BotPlayer[], heroPosition: Position, deck: Card[]): {
  players: BotPlayer[];
  actionCtx: ActionContext;
  pot: number;
  deck: Card[];
} {
  const pfOrder: Position[] = ['UTG','HJ','CO','BTN','SB','BB'];
  const heroIdx = pfOrder.indexOf(heroPosition);
  let pot = 1.5; // SB + BB blinds
  let facingRaise = false;
  let raiseAmount = 0;
  let raisedByPosition: Position|null = null;
  let calledByCount = 0;
  let currentDeck = deck;

  const updated = players.map(p => {
    const posIdx = pfOrder.indexOf(p.position);
    if (posIdx < 0 || posIdx >= heroIdx) return p; // acts after hero or is hero
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
    deck: currentDeck,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };

    case 'START_HAND': {
      let deck = shuffleDeck(createDeck());
      const heroPositionIdx = state.handNumber % POSITIONS.length;
      const heroPosition = POSITIONS[heroPositionIdx];

      // Deal hero cards
      const [heroCards, deckAfterHero] = dealCards(deck, 2);
      deck = deckAfterHero;

      // Create bot players with positions
      const otherPositions = POSITIONS.filter(p => p !== heroPosition);
      const botCount = Math.min(5, otherPositions.length);
      const players: BotPlayer[] = [];

      for (let i = 0; i < botCount; i++) {
        const [botCards, nextDeck] = dealCards(deck, 2);
        deck = nextDeck;
        players.push({
          id: i,
          name: PLAYER_NAMES[i % PLAYER_NAMES.length],
          type: PLAYER_TYPE_LIST[i % PLAYER_TYPE_LIST.length],
          position: otherPositions[i],
          cards: botCards.map(c => ({ ...c, faceUp: false })),
          stack: 80 + Math.floor(Math.random() * 60),
          currentBet: 0,
          action: null,
          isActive: true,
          isDealer: otherPositions[i] === 'BTN',
        });
      }

      // Deal community cards (face down, revealed later)
      const [communityCards, finalDeck] = dealCards(deck, 5);
      const faceDownCommunity = communityCards.map(c => ({ ...c, faceUp: false }));

      // Simulate bot actions before hero
      const { players: updatedPlayers, actionCtx, pot } = simulateBotPreflop(
        players, heroPosition, finalDeck,
      );

      return {
        ...state,
        phase: 'preflop',
        deck: finalDeck,
        heroCards,
        communityCards: faceDownCommunity,
        heroPosition,
        heroStack: 100,
        heroBet: 0,
        pot,
        currentBet: actionCtx.facingRaise ? actionCtx.raiseAmount : 0,
        players: updatedPlayers,
        handNumber: state.handNumber + 1,
        actionCtx,
        analysis: null,
        showAnalysis: false,
        lastHeroAction: null,
      };
    }

    case 'HERO_ACT': {
      const { action: heroAction, raiseBB = 3 } = action;
      const analysis = buildAnalysis(
        state.heroCards,
        state.heroPosition,
        heroAction,
        raiseBB,
        state.actionCtx,
      );
      let heroBet = 0;
      if (heroAction === 'raise') heroBet = raiseBB;
      else if (heroAction === 'call') heroBet = state.actionCtx.raiseAmount || 0;

      return {
        ...state,
        heroBet,
        pot: state.pot + heroBet,
        analysis,
        showAnalysis: true,
        lastHeroAction: heroAction,
        phase: heroAction === 'fold' ? 'showdown' : 'flop',
        communityCards: heroAction === 'fold'
          ? state.communityCards
          : state.communityCards.map((c, i) => i < 3 ? { ...c, faceUp: true } : c),
      };
    }

    case 'ADVANCE_PHASE': {
      if (state.phase === 'flop') {
        return {
          ...state,
          phase: 'turn',
          showAnalysis: false,
          communityCards: state.communityCards.map((c, i) => i < 4 ? { ...c, faceUp: true } : c),
        };
      }
      if (state.phase === 'turn') {
        return {
          ...state,
          phase: 'river',
          communityCards: state.communityCards.map(c => ({ ...c, faceUp: true })),
        };
      }
      if (state.phase === 'river') {
        return { ...state, phase: 'showdown', showAnalysis: true };
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
  advancePhase: () => void;
  dismissAnalysis: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, buildInitialState());

  const setDifficulty = useCallback((d: Difficulty) => dispatch({ type:'SET_DIFFICULTY', difficulty:d }), []);
  const startNewHand = useCallback(() => dispatch({ type:'START_HAND' }), []);
  const heroAct = useCallback((a: HeroAction, raiseBB?: number) => dispatch({ type:'HERO_ACT', action:a, raiseBB }), []);
  const advancePhase = useCallback(() => dispatch({ type:'ADVANCE_PHASE' }), []);
  const dismissAnalysis = useCallback(() => dispatch({ type:'DISMISS_ANALYSIS' }), []);

  return (
    <GameContext.Provider value={{ state, setDifficulty, startNewHand, heroAct, advancePhase, dismissAnalysis }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
