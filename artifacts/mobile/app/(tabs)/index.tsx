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
import {
  DIFFICULTIES, DIFFICULTY_DESCRIPTIONS, getHandNotation,
  evaluateMadeHand, MADE_HAND_COLORS,
} from '@/constants/pokerData';
import type { Difficulty } from '@/constants/pokerData';

const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_COLORS: Record<string, string> = { s: '#94A3B8', h: '#EF4444', d: '#EF4444', c: '#94A3B8' };

function cardLabel(rank: string, suit: string) {
  return `${rank}${SUIT_SYMBOLS[suit] ?? suit}`;
}

export default function PlayScreen() {
  const { state, startNewHand, setDifficulty } = useGame();
  const { logHandHistory } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);

  const lastLoggedHand = React.useRef<number>(-1);

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

  const TAB_BAR_H = Platform.OS === 'web' ? 84 : 60;

  // ── Showdown display helpers ────────────────────────────────────────────
  const board = state.communityCards.filter(c => c.faceUp);
  const mainVillainPlayer = state.players.find(p => p.position === state.mainVillainPosition)
    ?? state.players[0];
  const villainFaceUpCards = mainVillainPlayer?.cards.filter(c => c.faceUp) ?? [];

  const heroHandResult = board.length >= 3 && state.heroCards.length === 2
    ? evaluateMadeHand(state.heroCards, board)
    : null;
  const villainHandResult = board.length >= 3 && villainFaceUpCards.length === 2
    ? evaluateMadeHand(villainFaceUpCards, board)
    : null;

  const resultConfig = isShowdown && state.showdownResult
    ? {
        hero: { label: '🏆 YOU WIN', sublabel: `Pot: ${state.pot.toFixed(1)}BB`, color: '#27AE60', bg: '#27AE6020' },
        villain: state.villainFolded
          ? { label: '✓ VILLAIN FOLDED', sublabel: `You win ${state.pot.toFixed(1)}BB`, color: '#27AE60', bg: '#27AE6020' }
          : { label: '✗ VILLAIN WINS', sublabel: `Pot: ${state.pot.toFixed(1)}BB`, color: '#E74C3C', bg: '#E74C3C20' },
        tie: { label: '= TIE', sublabel: `Chop: ${(state.pot / 2).toFixed(1)}BB each`, color: '#E5C76B', bg: '#E5C76B20' },
      }[state.showdownResult]
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 10 : 0, paddingBottom: TAB_BAR_H + insets.bottom }]}>
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
            {/* Winner banner */}
            {resultConfig && (
              <View style={[styles.resultBanner, { backgroundColor: resultConfig.bg, borderColor: resultConfig.color + '50' }]}>
                <Text style={[styles.resultBannerLabel, { color: resultConfig.color }]}>{resultConfig.label}</Text>
                <Text style={[styles.resultBannerSub, { color: colors.mutedForeground }]}>{resultConfig.sublabel}</Text>
              </View>
            )}

            {/* Showdown card reveal (when villain didn't fold) */}
            {!state.villainFolded && villainFaceUpCards.length === 2 && heroHandResult && villainHandResult && (
              <View style={[styles.showdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.showdownTitle, { color: colors.mutedForeground }]}>SHOWDOWN</Text>
                <View style={styles.showdownRow}>
                  {/* Hero hand */}
                  <View style={styles.showdownHand}>
                    <Text style={[styles.showdownPlayer, { color: state.showdownResult === 'hero' ? '#27AE60' : colors.mutedForeground }]}>YOU</Text>
                    <View style={styles.showdownCards}>
                      {state.heroCards.map((c, i) => (
                        <View key={i} style={[styles.sdCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Text style={[styles.sdCardText, { color: SUIT_COLORS[c.suit] ?? colors.foreground }]}>
                            {c.rank}{SUIT_SYMBOLS[c.suit] ?? c.suit}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.showdownHandName, { color: MADE_HAND_COLORS[heroHandResult.hand] }]}>
                      {heroHandResult.hand}
                    </Text>
                  </View>

                  <Text style={[styles.showdownVs, { color: colors.mutedForeground }]}>vs</Text>

                  {/* Villain hand */}
                  <View style={styles.showdownHand}>
                    <Text style={[styles.showdownPlayer, { color: state.showdownResult === 'villain' ? '#E74C3C' : colors.mutedForeground }]}>
                      {mainVillainPlayer?.name ?? 'VILLAIN'}
                    </Text>
                    <View style={styles.showdownCards}>
                      {villainFaceUpCards.map((c, i) => (
                        <View key={i} style={[styles.sdCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Text style={[styles.sdCardText, { color: SUIT_COLORS[c.suit] ?? colors.foreground }]}>
                            {c.rank}{SUIT_SYMBOLS[c.suit] ?? c.suit}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.showdownHandName, { color: MADE_HAND_COLORS[villainHandResult.hand] }]}>
                      {villainHandResult.hand}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Streets played */}
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
  scrollContent: { paddingBottom: 8, paddingTop: 8 },
  actionBanner: { marginHorizontal: 12, marginTop: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  actionBannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  centerActions: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  dealBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  dealBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  idleSubtext: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

  resultBanner: {
    width: '100%', borderRadius: 14, borderWidth: 1.5,
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', gap: 4,
  },
  resultBannerLabel: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  resultBannerSub: { fontSize: 13, fontWeight: '600' },

  showdownCard: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    padding: 16, alignItems: 'center', gap: 14,
  },
  showdownTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  showdownRow: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' },
  showdownHand: { alignItems: 'center', gap: 8, flex: 1 },
  showdownPlayer: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  showdownCards: { flexDirection: 'row', gap: 6 },
  sdCard: {
    width: 44, height: 58, borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sdCardText: { fontSize: 16, fontWeight: '900' },
  showdownHandName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  showdownVs: { fontSize: 12, fontWeight: '600' },

  resultCard: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', width: '100%' },
  resultCardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  streetsRow: { flexDirection: 'row', gap: 10 },
  streetPip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  streetPipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
