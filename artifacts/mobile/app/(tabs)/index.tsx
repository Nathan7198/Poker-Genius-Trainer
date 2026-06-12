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
import HandReportModal from '@/components/HandReportModal';
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
  const { logHandHistory, recordHandResult } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);
  const [showHandReport, setShowHandReport] = React.useState(false);

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

    const won = state.showdownResult === 'hero';
    const profitBB = won
      ? Math.round((state.pot - state.heroTotalInvestedBB) * 100) / 100
      : Math.round(-state.heroTotalInvestedBB * 100) / 100;
    recordHandResult(won, profitBB);
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Table — visible during play AND at showdown (villain cards auto-revealed in seat) */}
        {!isIdle && <PokerTable />}

        {/* Preflop action trail — shows each player's action in position order */}
        {state.phase === 'preflop' && !state.showAnalysis && (() => {
          const PF_ORDER = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
          type PFPos = typeof PF_ORDER[number];
          const heroIdx = PF_ORDER.indexOf(state.heroPosition as PFPos);
          const preHeroBots = state.players
            .filter(p => PF_ORDER.indexOf(p.position as PFPos) < heroIdx && p.action !== null)
            .sort((a, b) => PF_ORDER.indexOf(a.position as PFPos) - PF_ORDER.indexOf(b.position as PFPos));
          if (preHeroBots.length === 0) return null;

          const chipColor = (act: string | null) =>
            act === 'raise' ? '#E5C76B' :
            act === 'call' || act === 'limp' ? '#3498DB' : '#666';

          const chipLabel = (act: string | null, bet: number) =>
            act === 'raise' ? `RAISED ${bet}BB` :
            act === 'call'  ? `CALLED ${bet}BB` :
            act === 'limp'  ? 'LIMPED' : 'FOLDED';

          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionTrail}
              contentContainerStyle={styles.actionTrailContent}
            >
              {preHeroBots.map(p => {
                const col = chipColor(p.action);
                return (
                  <View key={p.position} style={[styles.actionChip, { borderColor: col + '60', backgroundColor: col + '15' }]}>
                    <Text style={[styles.chipPos, { color: colors.mutedForeground }]}>{p.position}</Text>
                    <Text style={[styles.chipAction, { color: col }]}>{chipLabel(p.action, p.currentBet)}</Text>
                  </View>
                );
              })}
              <View style={[styles.actionChip, { borderColor: '#27AE6060', backgroundColor: '#27AE6015' }]}>
                <Text style={[styles.chipPos, { color: colors.mutedForeground }]}>YOU</Text>
                <Text style={[styles.chipAction, { color: '#27AE60' }]}>YOUR TURN</Text>
              </View>
            </ScrollView>
          );
        })()}

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

      </ScrollView>

      {/* Showdown footer — always fully visible, no scrolling needed */}
      {isShowdown && (
        <View style={[styles.sdFooter, { borderTopColor: colors.border }]}>
          {/* Winner badge + hand names */}
          <View style={styles.sdResultSection}>
            {resultConfig && (
              <View style={[styles.sdWinBadge, { backgroundColor: resultConfig.bg, borderColor: resultConfig.color + '60' }]}>
                <Text style={[styles.sdWinLabel, { color: resultConfig.color }]}>{resultConfig.label}</Text>
                <Text style={[styles.sdWinSub, { color: colors.mutedForeground }]}>{resultConfig.sublabel}</Text>
              </View>
            )}
            {state.heroCards.length === 2 && (
              <View style={[styles.sdHandRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sdHandItem}>
                  <Text style={[styles.sdHandWho, { color: state.showdownResult === 'hero' ? '#27AE60' : colors.mutedForeground }]}>YOU</Text>
                  <Text style={[styles.sdHandName, { color: heroHandResult ? MADE_HAND_COLORS[heroHandResult.hand] : colors.foreground }]}>
                    {heroHandResult?.hand ?? 'High Card'}
                  </Text>
                </View>
                {villainFaceUpCards.length === 2 ? (
                  <>
                    <Text style={[styles.sdVs, { color: colors.mutedForeground }]}>vs</Text>
                    <View style={[styles.sdHandItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.sdHandWho, { color: state.showdownResult === 'villain' ? '#E74C3C' : colors.mutedForeground }]}>
                        {mainVillainPlayer?.name ?? 'VILLAIN'}
                      </Text>
                      <Text style={[styles.sdHandName, { color: villainHandResult ? MADE_HAND_COLORS[villainHandResult.hand] : colors.foreground }]}>
                        {villainHandResult?.hand ?? 'High Card'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sdVs, { color: colors.mutedForeground }]}>vs</Text>
                    <View style={[styles.sdHandItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.sdHandWho, { color: colors.mutedForeground }]}>
                        {mainVillainPlayer?.name ?? 'VILLAIN'}
                      </Text>
                      <Text style={[styles.sdHandName, { color: '#E74C3C' }]}>Folded</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Report + Next hand buttons */}
          <View style={styles.nextHandBar}>
            {state.analysis && (
              <TouchableOpacity
                style={[styles.reportBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                onPress={() => setShowHandReport(true)}
                activeOpacity={0.8}
              >
                <Feather name="clipboard" size={14} color={colors.foreground} />
                <Text style={[styles.reportBtnText, { color: colors.foreground }]}>HAND REPORT</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextHandFixed, { backgroundColor: colors.gold, flex: 1 }]}
              onPress={handleNewHand}
              activeOpacity={0.85}
            >
              <Text style={styles.nextHandFixedText}>NEXT HAND →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ActionPanel />
      <CoachModal />
      <HandReportModal visible={showHandReport} onClose={() => setShowHandReport(false)} />
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
  actionTrail: { marginHorizontal: 12, marginTop: 6 },
  actionTrailContent: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 2 },
  actionChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, alignItems: 'center', minWidth: 70 },
  chipPos: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  chipAction: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  centerActions: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  dealBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  dealBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  idleSubtext: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

  // Showdown footer (outside ScrollView — always fully visible)
  sdFooter: { borderTopWidth: 1, paddingTop: 2 },
  sdResultSection: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 8 },
  sdWinBadge: {
    borderRadius: 12, borderWidth: 1.5,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', gap: 2,
  },
  sdWinLabel: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  sdWinSub: { fontSize: 12, fontWeight: '600' },
  sdHandRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  sdHandItem: { flex: 1, gap: 2 },
  sdHandWho: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sdHandName: { fontSize: 14, fontWeight: '800' },
  sdVs: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10 },

  // NEXT HAND bar (inside the showdown footer)
  nextHandBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  reportBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  nextHandFixed: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  nextHandFixedText: { fontSize: 17, fontWeight: '900', letterSpacing: 1.5, color: '#0D1B0F' },
});
