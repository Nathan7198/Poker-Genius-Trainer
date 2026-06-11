import React from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { useStats } from '@/context/StatsContext';
import type { HandHistoryEntry } from '@/context/StatsContext';
import { useColors } from '@/hooks/useColors';
import PokerTable from '@/components/PokerTable';
import ActionPanel from '@/components/ActionPanel';
import CoachModal from '@/components/CoachModal';
import { DIFFICULTIES, DIFFICULTY_DESCRIPTIONS, getHandNotation } from '@/constants/pokerData';
import type { Difficulty } from '@/constants/pokerData';

const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

function cardLabel(rank: string, suit: string) {
  return `${rank}${SUIT_SYMBOLS[suit] ?? suit}`;
}

export default function PlayScreen() {
  const { state, startNewHand, setDifficulty } = useGame();
  const { logHandHistory } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);

  // Track the last hand number we logged so we never double-log
  const lastLoggedHand = React.useRef<number>(-1);

  // Log hand history when we reach showdown
  React.useEffect(() => {
    if (state.phase !== 'showdown') return;
    if (state.handNumber <= 0) return;
    if (lastLoggedHand.current === state.handNumber) return;
    lastLoggedHand.current = state.handNumber;

    const { heroCards, heroPosition, communityCards, analysis, postFlopAnalysisHistory } = state;

    const notation = heroCards.length === 2
      ? (analysis?.handNotation ?? getHandNotation(heroCards[0], heroCards[1]))
      : '??';

    const faceUp = communityCards.filter(c => c.faceUp);
    const flopCards = faceUp.slice(0, 3).map(c => cardLabel(c.rank, c.suit)).join(' ');
    const turnCard = faceUp[3] ? cardLabel(faceUp[3].rank, faceUp[3].suit) : '';
    const riverCard = faceUp[4] ? cardLabel(faceUp[4].rank, faceUp[4].suit) : '';

    const firstPostFlop = postFlopAnalysisHistory[0];
    const boardTexture = firstPostFlop?.boardTexture.label ?? 'Unknown';
    const boardTextureColor = firstPostFlop?.boardTexture.color ?? '#95A5A6';

    const folded = state.lastHeroAction === 'fold' ||
      postFlopAnalysisHistory.some(a => a.heroAction === 'fold');
    const foldedStreet = state.lastHeroAction === 'fold'
      ? 'preflop'
      : (postFlopAnalysisHistory.find(a => a.heroAction === 'fold')?.street ?? '');

    const preflopAction = analysis
      ? analysis.heroAction === 'raise'
        ? `raise ${analysis.raiseAmountBB}BB`
        : analysis.heroAction
      : 'unknown';

    const streets = postFlopAnalysisHistory.map(a => ({
      street: a.street,
      action: a.heroAction === 'bet'
        ? `bet ${a.betPct}%`
        : a.heroAction === 'raise'
          ? `raise ${a.betPct}%`
          : a.heroAction,
      isGTO: a.isGTO,
      madeHand: a.madeHand,
    }));

    const totalMistakes =
      (analysis?.mistakes.length ?? 0) +
      postFlopAnalysisHistory.reduce((n, a) => n + a.mistakes.length, 0);

    const entry: HandHistoryEntry = {
      handNumber: state.handNumber,
      timestamp: Date.now(),
      heroNotation: notation,
      heroPosition,
      preflopAction,
      preflopGTO: analysis?.isGTO ?? true,
      flopCards,
      turnCard,
      riverCard,
      boardTexture,
      boardTextureColor,
      streets,
      folded,
      foldedStreet,
      totalMistakes,
    };

    logHandHistory(entry);
  }, [state.phase, state.handNumber]);

  const isIdle = state.phase === 'idle';
  const isShowdown = state.phase === 'showdown' && !state.showAnalysis;

  function handleNewHand() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    startNewHand();
    setShowDifficultyPicker(false);
  }

  function handleDifficulty(d: Difficulty) {
    setDifficulty(d);
    setShowDifficultyPicker(false);
  }

  const diffColors: Record<Difficulty, string> = {
    Beginner: '#27AE60',
    Intermediate: '#3498DB',
    Advanced: '#E67E22',
    Expert: '#E74C3C',
  };

  const isLive = !isIdle && !isShowdown && !state.showAnalysis;
  const streetBadge = isLive ? ({ preflop: 'PREFLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER' } as Record<string,string>)[state.phase] ?? null : null;

  // Tab bar is position:absolute — reserve its height so ActionPanel isn't hidden under it
  const TAB_BAR_H = Platform.OS === 'web' ? 84 : 60;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 10 : 0, paddingBottom: TAB_BAR_H }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS !== 'web' ? insets.top + 4 : 4, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.appTitle, { color: colors.gold }]}>POKER TRAINER</Text>
        </View>

        <View style={styles.headerRight}>
          {streetBadge && (
            <View style={[styles.streetBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.streetBadgeText, { color: colors.gold }]}>{streetBadge}</Text>
            </View>
          )}
          {isLive && state.pot > 0 && (
            <View style={[styles.potBadge, { backgroundColor: '#8A6D2820', borderColor: '#8A6D2850' }]}>
              <Text style={[styles.potText, { color: '#E5C76B' }]}>POT {state.pot.toFixed(1)}BB</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.diffBtn, { backgroundColor: diffColors[state.difficulty] + '22', borderColor: diffColors[state.difficulty] + '66' }]}
            onPress={() => setShowDifficultyPicker(!showDifficultyPicker)}
          >
            <Text style={[styles.diffBtnText, { color: diffColors[state.difficulty] }]}>
              {state.difficulty.slice(0, 3).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Difficulty picker */}
      {showDifficultyPicker && (
        <View style={[styles.diffPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffOption, state.difficulty === d && { backgroundColor: diffColors[d] + '20' }]}
              onPress={() => handleDifficulty(d)}
            >
              <View style={styles.diffOptionRow}>
                <Text style={[styles.diffOptionName, { color: state.difficulty === d ? diffColors[d] : colors.foreground }]}>{d}</Text>
                {state.difficulty === d && <Feather name="check" size={14} color={diffColors[d]} />}
              </View>
              <Text style={[styles.diffOptionDesc, { color: colors.mutedForeground }]}>{DIFFICULTY_DESCRIPTIONS[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <PokerTable />

        {/* Preflop raise context banner */}
        {state.phase === 'preflop' && state.actionCtx.facingRaise && !state.showAnalysis && (
          <View style={[styles.actionBanner, { backgroundColor: '#8A6D2815' }]}>
            <Text style={[styles.actionBannerText, { color: '#E5C76B' }]}>
              {state.actionCtx.raisedByPosition} raised to {state.actionCtx.raiseAmount}BB
              {state.actionCtx.calledByCount > 0 ? ` · ${state.actionCtx.calledByCount} caller(s)` : ''}
            </Text>
          </View>
        )}

        {/* Idle */}
        {isIdle && (
          <View style={styles.centerActions}>
            <TouchableOpacity style={[styles.dealBtn, { backgroundColor: colors.gold }]} onPress={handleNewHand}>
              <Text style={[styles.dealBtnText, { color: '#0D1B0F' }]}>DEAL CARDS</Text>
            </TouchableOpacity>
            <Text style={[styles.idleSubtext, { color: colors.mutedForeground }]}>
              Hero always at bottom · Boards never repeat · Full street coaching
            </Text>
          </View>
        )}

        {/* Showdown */}
        {isShowdown && (
          <View style={styles.centerActions}>
            {state.postFlopStreetsDone.length > 0 && (
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.resultCardTitle, { color: colors.mutedForeground }]}>STREETS PLAYED</Text>
                <View style={styles.streetsRow}>
                  {(['flop','turn','river'] as const).map(s => {
                    const done = state.postFlopStreetsDone.includes(s);
                    return (
                      <View key={s} style={[styles.streetPip, { backgroundColor: done ? colors.gold + '30' : colors.secondary, borderColor: done ? colors.gold : colors.border }]}>
                        <Text style={[styles.streetPipText, { color: done ? colors.gold : colors.mutedForeground }]}>{s.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            <TouchableOpacity style={[styles.dealBtn, { backgroundColor: colors.gold }]} onPress={handleNewHand}>
              <Text style={[styles.dealBtnText, { color: '#0D1B0F' }]}>NEXT HAND</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ActionPanel />
      <CoachModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  streetBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  streetBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  potBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  potText: { fontSize: 10, fontWeight: '700' },
  diffBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  diffBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  diffPicker: {
    position: 'absolute', right: 12, top: 62, zIndex: 100,
    borderRadius: 12, borderWidth: 1, width: 280,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  diffOption: { padding: 12, borderRadius: 8 },
  diffOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffOptionName: { fontSize: 14, fontWeight: '700' },
  diffOptionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  actionBanner: { marginHorizontal: 12, marginTop: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  actionBannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  centerActions: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  dealBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  dealBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  idleSubtext: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  resultCard: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', width: '100%' },
  resultCardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  streetsRow: { flexDirection: 'row', gap: 10 },
  streetPip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  streetPipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
