import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MistakeType, MISTAKE_LABELS, MISTAKE_TIPS } from '@/constants/pokerData';

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

interface StatsState {
  handsPlayed: number;
  handsWon: number;
  totalProfitBB: number;
  mistakes: MistakeEntry[];
}

interface StatsContextType {
  stats: StatsState;
  logMistake: (type: MistakeType, description: string, handNum: number) => void;
  recordHandResult: (won: boolean, profitBB: number) => void;
  clearMistakes: () => void;
  getAlerts: () => Alert[];
  getMistakeCount: (type: MistakeType) => number;
}

const defaultStats: StatsState = {
  handsPlayed: 0,
  handsWon: 0,
  totalProfitBB: 0,
  mistakes: [],
};

const StatsContext = createContext<StatsContextType | null>(null);
const STORAGE_KEY = '@poker_stats_v2';

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<StatsState>(defaultStats);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setStats(JSON.parse(raw));
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
            id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
            type,
            description,
            handNumber: handNum,
            timestamp: Date.now(),
          },
        ],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const recordHandResult = useCallback((won: boolean, profitBB: number) => {
    setStats(prev => {
      const next: StatsState = {
        ...prev,
        handsPlayed: prev.handsPlayed + 1,
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
    const total = stats.mistakes.length;
    if (total === 0) return [];
    const counts: Partial<Record<MistakeType, number>> = {};
    for (const m of stats.mistakes) {
      counts[m.type] = (counts[m.type] ?? 0) + 1;
    }
    return (Object.entries(counts) as [MistakeType, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        tip: MISTAKE_TIPS[type],
        severity: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
      }));
  }, [stats.mistakes]);

  return (
    <StatsContext.Provider value={{ stats, logMistake, recordHandResult, clearMistakes, getAlerts, getMistakeCount }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be inside StatsProvider');
  return ctx;
}
