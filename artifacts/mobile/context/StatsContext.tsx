import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MistakeType, MISTAKE_LABELS, MISTAKE_TIPS, Position, ReasoningTag } from '@/constants/pokerData';

export interface MistakeEntry {
  id: string;
  type: MistakeType;
  description: string;
  handNumber: number;
  timestamp: number;
}

export interface Alert {
  type: MistakeType;
  count: number;
  tip: string;
  severity: 'high'|'medium'|'low';
}

export interface HandStreetSummary {
  street: string;
  action: string;
  isGTO: boolean;
  madeHand: string;
}

export interface HandHistoryEntry {
  handNumber: number;
  timestamp: number;
  heroNotation: string;
  heroPosition: Position;
  preflopAction: string;
  preflopGTO: boolean;
  flopCards: string;
  turnCard: string;
  riverCard: string;
  boardTexture: string;
  boardTextureColor: string;
  streets: HandStreetSummary[];
  folded: boolean;
  foldedStreet: string;
  totalMistakes: number;
  reasoning?: ReasoningTag;
}

export interface PlayerPattern {
  id: string;
  headline: string;
  detail: string;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
}

interface StatsState {
  handsPlayed: number;
  handsWon: number;
  totalProfitBB: number;
  mistakes: MistakeEntry[];
  handHistory: HandHistoryEntry[];
}

interface StatsContextType {
  stats: StatsState;
  logMistake: (type: MistakeType, description: string, handNum: number) => void;
  logHandHistory: (entry: HandHistoryEntry) => void;
  attachReasoning: (handNumber: number, reasoning: ReasoningTag) => void;
  recordHandResult: (won: boolean, profitBB: number) => void;
  clearMistakes: () => void;
  getAlerts: () => Alert[];
  getMistakeCount: (type: MistakeType) => number;
  getProfile: () => PlayerPattern[];
}

const defaultStats: StatsState = {
  handsPlayed: 0,
  handsWon: 0,
  totalProfitBB: 0,
  mistakes: [],
  handHistory: [],
};

const StatsContext = createContext<StatsContextType | null>(null);
const STORAGE_KEY = '@poker_stats_v3';
const PREFLOP_TAGS = new Set(['range_miss', 'range_unknown', 'vs_aggression', 'speculative', 'oop_concern', 'stack_mismatch']);
const MAX_HISTORY = 20;

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<StatsState>(defaultStats);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setStats({ ...defaultStats, ...parsed });
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: StatsState) => {
    setStats(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const logMistake = useCallback((type: MistakeType, description: string, handNum: number) => {
    setStats(prev => {
      const next: StatsState = {
        ...prev,
        mistakes: [
          ...prev.mistakes,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type, description, handNumber: handNum, timestamp: Date.now(),
          },
        ],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const logHandHistory = useCallback((entry: HandHistoryEntry) => {
    setStats(prev => {
      // Prevent duplicate entries for the same hand number
      if (prev.handHistory.some(h => h.handNumber === entry.handNumber)) return prev;
      const trimmed = [...prev.handHistory, entry].slice(-MAX_HISTORY);
      const next: StatsState = {
        ...prev,
        handsPlayed: prev.handsPlayed + 1,
        handHistory: trimmed,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const attachReasoning = useCallback((handNumber: number, reasoning: ReasoningTag) => {
    setStats(prev => {
      const idx = prev.handHistory.findIndex(h => h.handNumber === handNumber);
      if (idx === -1) return prev;
      const updated = [...prev.handHistory];
      updated[idx] = { ...updated[idx], reasoning };
      const next: StatsState = { ...prev, handHistory: updated };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const getProfile = useCallback((): PlayerPattern[] => {
    const history = stats.handHistory.filter(h => h.reasoning !== undefined);
    if (history.length < 5) return [];
    const all = stats.handHistory;
    const patterns: PlayerPattern[] = [];

    const postflopHistory = history.filter(h => !PREFLOP_TAGS.has(h.reasoning!));
    const preflopHistory  = history.filter(h =>  PREFLOP_TAGS.has(h.reasoning!));

    // Overvalue made hands
    const valuePlays = postflopHistory.filter(h => h.reasoning === 'value');
    const valueMistakes = valuePlays.filter(h => h.totalMistakes > 0);
    if (valuePlays.length >= 3 && valueMistakes.length / valuePlays.length > 0.5) {
      patterns.push({
        id: 'overvalue',
        headline: 'Overvalue top pair',
        detail: 'You bet/call for value when the strength of your hand doesn\'t justify it vs. the range you face.',
        evidence: `${valueMistakes.length} of ${valuePlays.length} "value" decisions had GTO mistakes`,
        severity: valueMistakes.length / valuePlays.length > 0.7 ? 'high' : 'medium',
      });
    }

    // Bluff wrong spots
    const bluffPlays = postflopHistory.filter(h => h.reasoning === 'bluff');
    const bluffMistakes = bluffPlays.filter(h => h.totalMistakes > 0);
    if (bluffPlays.length >= 3 && bluffMistakes.length / bluffPlays.length > 0.5) {
      const pairedBluffs = bluffMistakes.filter(h => h.boardTexture.toLowerCase().includes('pair'));
      if (pairedBluffs.length >= 2) {
        patterns.push({
          id: 'paired_bluff',
          headline: 'Bluff too often on paired boards',
          detail: 'Villain\'s calling range heavily hits pair boards. Bluff frequency here should be near zero unless you have a strong blocker.',
          evidence: `${pairedBluffs.length} failed bluffs on paired board textures`,
          severity: 'high',
        });
      } else {
        patterns.push({
          id: 'overbluff',
          headline: 'Bluff too often',
          detail: 'Your bluffs aren\'t finding enough folds. Check board texture, villain type, and your bluff-to-value ratio.',
          evidence: `${bluffMistakes.length} of ${bluffPlays.length} bluffs had GTO mistakes`,
          severity: bluffMistakes.length / bluffPlays.length > 0.7 ? 'high' : 'medium',
        });
      }
    }

    // BB defending too tight
    const bbHands = all.filter(h => h.heroPosition === 'BB');
    const bbFoldMistakes = bbHands.filter(h => !h.preflopGTO && h.preflopAction === 'fold');
    if (bbHands.length >= 5 && bbFoldMistakes.length / bbHands.length > 0.2) {
      patterns.push({
        id: 'bb_tight',
        headline: 'Defend the BB too tightly',
        detail: 'Pot odds mean you should defend ~65% of hands from the BB. Folding too often is a direct chip leak vs. any aggressor.',
        evidence: `Folded incorrectly in ${bbFoldMistakes.length} of ${bbHands.length} BB spots`,
        severity: bbFoldMistakes.length / bbHands.length > 0.35 ? 'high' : 'medium',
      });
    }

    // Miss river thin value
    const riverMistakes = all.flatMap(h => h.streets.filter(s => s.street === 'river' && !s.isGTO && (s.action === 'check' || s.action === 'fold')));
    const protectMistakes = postflopHistory.filter(h => h.reasoning === 'protect' && h.totalMistakes > 0);
    if ((riverMistakes.length >= 3 || protectMistakes.length >= 3) && all.length >= 8) {
      patterns.push({
        id: 'thin_value',
        headline: 'Miss river thin value',
        detail: 'One pair or two pair can be a value bet on the river when villain calls with worse. Checking leaves chips on the table.',
        evidence: `${riverMistakes.length} river spots checked/folded when GTO says bet`,
        severity: riverMistakes.length >= 5 ? 'high' : 'medium',
      });
    }

    // Under-bluff scare cards / give up too much
    const boardFear = postflopHistory.filter(h => h.reasoning === 'board_fear');
    const boardFearMistakes = boardFear.filter(h => h.totalMistakes > 0);
    if (boardFear.length >= 3 && boardFearMistakes.length / boardFear.length > 0.5) {
      patterns.push({
        id: 'scare_cards',
        headline: 'Under-bluff scare cards',
        detail: 'Representing scare cards is often the highest-EV play. Giving up when an ace or flush card appears is exploitable.',
        evidence: `${boardFearMistakes.length} of ${boardFear.length} "board favoured him" decisions were GTO mistakes`,
        severity: 'medium',
      });
    }

    // Fail to attack capped ranges
    const foldEquityPlays = postflopHistory.filter(h => h.reasoning === 'fold_equity');
    const foldEquityMistakes = foldEquityPlays.filter(h => h.totalMistakes > 0);
    if (foldEquityPlays.length >= 3 && foldEquityMistakes.length / foldEquityPlays.length > 0.5) {
      patterns.push({
        id: 'fold_equity',
        headline: 'Fail to attack capped ranges',
        detail: 'You\'re right to look for fold equity but picking the wrong spots. Target opponents who check back the flop — their range is capped.',
        evidence: `${foldEquityMistakes.length} of ${foldEquityPlays.length} fold-equity plays had GTO mistakes`,
        severity: 'medium',
      });
    }

    // Knowledge gaps (postflop)
    const unknownPlays = postflopHistory.filter(h => h.reasoning === 'unknown');
    if (postflopHistory.length >= 8 && unknownPlays.length / postflopHistory.length > 0.4) {
      patterns.push({
        id: 'knowledge_gap',
        headline: 'Knowledge gaps driving decisions',
        detail: 'You often act without a clear mental model. Use the GTO Library to study the spots you keep facing — ranges, pot odds, board textures.',
        evidence: `"Didn\'t know" in ${unknownPlays.length} of ${postflopHistory.length} hands`,
        severity: unknownPlays.length / postflopHistory.length > 0.6 ? 'high' : 'medium',
      });
    }

    // --- Preflop patterns ---

    // Preflop range too tight (folded hands that were GTO opens)
    const rangeMissFolds = preflopHistory.filter(h => h.reasoning === 'range_miss');
    const rangeMissMistakes = rangeMissFolds.filter(h => !h.preflopGTO);
    if (rangeMissFolds.length >= 3 && rangeMissMistakes.length / rangeMissFolds.length > 0.4) {
      patterns.push({
        id: 'range_too_tight',
        headline: 'Preflop range is too tight',
        detail: 'You\'re folding hands that are profitable opens for your position. Study GTO opening ranges for each seat.',
        evidence: `${rangeMissMistakes.length} of ${rangeMissFolds.length} "outside range" folds were actually GTO opens`,
        severity: rangeMissMistakes.length / rangeMissFolds.length > 0.6 ? 'high' : 'medium',
      });
    }

    // Folds too tight vs aggression
    const aggrFolds = preflopHistory.filter(h => h.reasoning === 'vs_aggression');
    const aggrMistakes = aggrFolds.filter(h => !h.preflopGTO);
    if (aggrFolds.length >= 3 && aggrMistakes.length / aggrFolds.length > 0.5) {
      patterns.push({
        id: 'tight_vs_aggression',
        headline: 'Folds too tight facing raises',
        detail: 'Many hands remain profitable calls or 3-bets against a standard open. Check your defend/3-bet frequencies by position.',
        evidence: `${aggrMistakes.length} of ${aggrFolds.length} folds vs aggression were GTO mistakes`,
        severity: 'medium',
      });
    }

    // Underplaying speculative hands
    const specFolds = preflopHistory.filter(h => h.reasoning === 'speculative');
    const specMistakes = specFolds.filter(h => !h.preflopGTO);
    if (specFolds.length >= 3 && specMistakes.length / specFolds.length > 0.5) {
      patterns.push({
        id: 'underplay_speculative',
        headline: 'Underplays speculative hands',
        detail: 'Suited connectors and small pairs have strong implied odds. These hands are often profitable opens at the right position and stack depth.',
        evidence: `${specMistakes.length} of ${specFolds.length} "too speculative" folds were GTO opens`,
        severity: 'low',
      });
    }

    // Preflop knowledge gap
    const preflopUnknown = preflopHistory.filter(h => h.reasoning === 'range_unknown');
    if (preflopHistory.length >= 5 && preflopUnknown.length / preflopHistory.length > 0.4) {
      patterns.push({
        id: 'preflop_knowledge_gap',
        headline: 'Preflop range knowledge gap',
        detail: 'You often fold without knowing whether the hand was in your range. Use the GTO Library to drill opening ranges by position until they are automatic.',
        evidence: `"Didn\'t know my range" in ${preflopUnknown.length} of ${preflopHistory.length} preflop folds`,
        severity: preflopUnknown.length / preflopHistory.length > 0.6 ? 'high' : 'medium',
      });
    }

    return patterns.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - ({ high: 0, medium: 1, low: 2 }[b.severity])));
  }, [stats.handHistory]);

  const recordHandResult = useCallback((won: boolean, profitBB: number) => {
    setStats(prev => {
      const next: StatsState = {
        ...prev,
        handsWon: prev.handsWon + (won ? 1 : 0),
        totalProfitBB: Math.round((prev.totalProfitBB + profitBB) * 100) / 100,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearMistakes = useCallback(() => {
    persist({ ...defaultStats });
  }, [persist]);

  const getMistakeCount = useCallback((type: MistakeType) => {
    return stats.mistakes.filter(m => m.type === type).length;
  }, [stats.mistakes]);

  const getAlerts = useCallback((): Alert[] => {
    if (stats.mistakes.length === 0) return [];
    const counts: Partial<Record<MistakeType, number>> = {};
    for (const m of stats.mistakes) {
      counts[m.type] = (counts[m.type] ?? 0) + 1;
    }
    return (Object.entries(counts) as [MistakeType, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type, count, tip: MISTAKE_TIPS[type],
        severity: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
      }));
  }, [stats.mistakes]);

  return (
    <StatsContext.Provider value={{ stats, logMistake, logHandHistory, attachReasoning, recordHandResult, clearMistakes, getAlerts, getMistakeCount, getProfile }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be inside StatsProvider');
  return ctx;
}
