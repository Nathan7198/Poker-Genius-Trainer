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

    // Split by whether hero folded the hand (covers both preflop and postflop folds)
    const foldHands    = history.filter(h => h.folded);
    const nonFoldHands = history.filter(h => !h.folded);

    // Helper: was the fold itself a GTO mistake?
    const foldWasMistake = (h: HandHistoryEntry) =>
      h.foldedStreet === 'preflop' ? !h.preflopGTO : h.totalMistakes > 0;

    // ── Non-fold patterns (call / check / raise) ──────────────────────────────

    // Overvalue made hands
    const valuePlays = nonFoldHands.filter(h => h.reasoning === 'value');
    const valueMistakes = valuePlays.filter(h => h.totalMistakes > 0);
    if (valuePlays.length >= 3 && valueMistakes.length / valuePlays.length > 0.5) {
      patterns.push({
        id: 'overvalue',
        headline: 'Overvalue top pair',
        detail: 'You bet/call for value when your hand strength doesn\'t justify it vs. the range you face.',
        evidence: `${valueMistakes.length} of ${valuePlays.length} value bet/call decisions had GTO mistakes`,
        severity: valueMistakes.length / valuePlays.length > 0.7 ? 'high' : 'medium',
      });
    }

    // Bluff wrong spots
    const bluffPlays = nonFoldHands.filter(h => h.reasoning === 'bluff');
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
          evidence: `${bluffMistakes.length} of ${bluffPlays.length} bluffs / semi-bluffs had GTO mistakes`,
          severity: bluffMistakes.length / bluffPlays.length > 0.7 ? 'high' : 'medium',
        });
      }
    }

    // BB defending too tight (uses full history, not just tagged)
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
    const protectMistakes = nonFoldHands.filter(h => h.reasoning === 'protect' && h.totalMistakes > 0);
    if ((riverMistakes.length >= 3 || protectMistakes.length >= 3) && all.length >= 8) {
      patterns.push({
        id: 'thin_value',
        headline: 'Miss river thin value',
        detail: 'One pair or two pair can be a value bet on the river when villain calls with worse. Checking leaves chips on the table.',
        evidence: `${riverMistakes.length} river spots checked/folded when GTO says bet`,
        severity: riverMistakes.length >= 5 ? 'high' : 'medium',
      });
    }

    // Plays too passively due to board (board_fear on non-fold hands)
    const boardFearPassive = nonFoldHands.filter(h => h.reasoning === 'board_fear');
    const boardFearPassiveMistakes = boardFearPassive.filter(h => h.totalMistakes > 0);
    if (boardFearPassive.length >= 3 && boardFearPassiveMistakes.length / boardFearPassive.length > 0.5) {
      patterns.push({
        id: 'scare_cards',
        headline: 'Plays too passively on scary boards',
        detail: 'Representing scare cards is often the highest-EV play. Checking down when an ace or flush card arrives is exploitable.',
        evidence: `${boardFearPassiveMistakes.length} of ${boardFearPassive.length} "tough spot" plays had GTO mistakes`,
        severity: 'medium',
      });
    }

    // Fail to attack capped ranges
    const foldEquityPlays = nonFoldHands.filter(h => h.reasoning === 'fold_equity');
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

    // Knowledge gaps (non-fold)
    const unknownPlays = nonFoldHands.filter(h => h.reasoning === 'unknown');
    if (nonFoldHands.length >= 8 && unknownPlays.length / nonFoldHands.length > 0.4) {
      patterns.push({
        id: 'knowledge_gap',
        headline: 'Knowledge gaps driving decisions',
        detail: 'You often act without a clear mental model. Use the GTO Library to study the spots you keep facing — ranges, pot odds, board textures.',
        evidence: `"Didn\'t know what to do" in ${unknownPlays.length} of ${nonFoldHands.length} played hands`,
        severity: unknownPlays.length / nonFoldHands.length > 0.6 ? 'high' : 'medium',
      });
    }

    // ── Fold patterns ─────────────────────────────────────────────────────────

    // Range too tight (thought it was outside range but GTO says play)
    const rangeMissFolds = foldHands.filter(h => h.reasoning === 'range_miss');
    const rangeMissMistakes = rangeMissFolds.filter(foldWasMistake);
    if (rangeMissFolds.length >= 3 && rangeMissMistakes.length / rangeMissFolds.length > 0.4) {
      patterns.push({
        id: 'range_too_tight',
        headline: 'Range is too tight',
        detail: 'You\'re folding hands that are profitable for your position and situation. Study GTO opening and continuing ranges for each seat.',
        evidence: `${rangeMissMistakes.length} of ${rangeMissFolds.length} "outside range" folds were GTO mistakes`,
        severity: rangeMissMistakes.length / rangeMissFolds.length > 0.6 ? 'high' : 'medium',
      });
    }

    // Misreading pot odds
    const potOddsFolds = foldHands.filter(h => h.reasoning === 'pot_odds');
    const potOddsMistakes = potOddsFolds.filter(foldWasMistake);
    if (potOddsFolds.length >= 3 && potOddsMistakes.length / potOddsFolds.length > 0.5) {
      patterns.push({
        id: 'pot_odds',
        headline: 'Misreading pot odds',
        detail: 'You cite pot odds to justify folds but the math often says call. Practice calculating pot odds and implied odds quickly — it\'s a core skill.',
        evidence: `${potOddsMistakes.length} of ${potOddsFolds.length} "pot odds" folds were GTO mistakes`,
        severity: 'medium',
      });
    }

    // Too tight vs aggression
    const aggrFolds = foldHands.filter(h => h.reasoning === 'vs_aggression');
    const aggrMistakes = aggrFolds.filter(foldWasMistake);
    if (aggrFolds.length >= 3 && aggrMistakes.length / aggrFolds.length > 0.5) {
      patterns.push({
        id: 'tight_vs_aggression',
        headline: 'Folds too tight facing aggression',
        detail: 'Many hands remain profitable calls or 3-bets against a standard raise. Check your defend and 3-bet frequencies by position.',
        evidence: `${aggrMistakes.length} of ${aggrFolds.length} folds vs aggression were GTO mistakes`,
        severity: 'medium',
      });
    }

    // Folds too often to board texture
    const boardFearFolds = foldHands.filter(h => h.reasoning === 'board_fear');
    const boardFearFoldMistakes = boardFearFolds.filter(foldWasMistake);
    if (boardFearFolds.length >= 3 && boardFearFoldMistakes.length / boardFearFolds.length > 0.5) {
      patterns.push({
        id: 'scared_by_board',
        headline: 'Folds too often to board texture',
        detail: 'Villain\'s range doesn\'t always connect with scary runouts. Evaluate carefully before giving up — those are bluffing opportunities.',
        evidence: `${boardFearFoldMistakes.length} of ${boardFearFolds.length} board-fear folds were GTO mistakes`,
        severity: 'medium',
      });
    }

    // Underplaying marginal hands
    const specFolds = foldHands.filter(h => h.reasoning === 'speculative');
    const specMistakes = specFolds.filter(foldWasMistake);
    if (specFolds.length >= 3 && specMistakes.length / specFolds.length > 0.5) {
      patterns.push({
        id: 'underplay_marginal',
        headline: 'Underplays marginal hands',
        detail: 'Suited connectors and small pairs have strong implied odds. These hands are often profitable to open or continue with.',
        evidence: `${specMistakes.length} of ${specFolds.length} "too marginal" folds were GTO mistakes`,
        severity: 'low',
      });
    }

    // Fold knowledge gap
    const unknownFolds = foldHands.filter(h => h.reasoning === 'range_unknown');
    if (foldHands.length >= 5 && unknownFolds.length / foldHands.length > 0.4) {
      patterns.push({
        id: 'fold_knowledge_gap',
        headline: 'Unsure when to fold',
        detail: 'You often fold without a clear reason. Study GTO ranges and pot odds to build confidence in when to continue vs. give up.',
        evidence: `"Didn\'t know if I should fold" in ${unknownFolds.length} of ${foldHands.length} folded hands`,
        severity: unknownFolds.length / foldHands.length > 0.6 ? 'high' : 'medium',
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
