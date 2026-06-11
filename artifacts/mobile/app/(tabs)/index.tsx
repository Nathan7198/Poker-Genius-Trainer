import React from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { useStats } from '@/context/StatsContext';
import { useColors } from '@/hooks/useColors';
import PokerTable from '@/components/PokerTable';
import ActionPanel from '@/components/ActionPanel';
import CoachModal from '@/components/CoachModal';
import { DIFFICULTIES, DIFFICULTY_DESCRIPTIONS } from '@/constants/pokerData';
import type { Difficulty } from '@/constants/pokerData';

export default function PlayScreen() {
  const { state, startNewHand, setDifficulty, advancePhase, dismissAnalysis } = useGame();
  const { stats } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);

  const isIdle = state.phase === 'idle';
  const isShowdown = state.phase === 'showdown';
  const canAdvance = ['flop','turn','river'].includes(state.phase) && !state.showAnalysis;

  function handleNewHand() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    startNewHand();
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 10 : 0 }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { paddingTop: Platform.OS !== 'web' ? insets.top + 4 : 4, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.appTitle, { color: colors.gold }]}>POKER TRAINER</Text>
          {stats.handsPlayed > 0 && (
            <Text style={[styles.sessionStats, { color: colors.mutedForeground }]}>
              {stats.handsPlayed} hands · {stats.totalProfitBB >= 0 ? '+' : ''}{stats.totalProfitBB}BB
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.diffBtn, { backgroundColor: diffColors[state.difficulty] + '22', borderColor: diffColors[state.difficulty] + '66' }]}
          onPress={() => setShowDifficultyPicker(!showDifficultyPicker)}
        >
          <Text style={[styles.diffBtnText, { color: diffColors[state.difficulty] }]}>
            {state.difficulty.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Difficulty picker */}
      {showDifficultyPicker && (
        <View style={[styles.diffPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffOption, state.difficulty === d && { backgroundColor: diffColors[d] + '22' }]}
              onPress={() => handleDifficulty(d)}
            >
              <View style={styles.diffOptionRow}>
                <Text style={[styles.diffOptionName, { color: state.difficulty === d ? diffColors[d] : colors.foreground }]}>{d}</Text>
                {state.difficulty === d && (
                  <Text style={[styles.diffCheck, { color: diffColors[d] }]}>✓</Text>
                )}
              </View>
              <Text style={[styles.diffOptionDesc, { color: colors.mutedForeground }]}>
                {DIFFICULTY_DESCRIPTIONS[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Main content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Poker table */}
        <PokerTable />

        {/* Opponent action context banner */}
        {state.phase === 'preflop' && state.actionCtx.facingRaise && !state.showAnalysis && (
          <View style={[styles.actionBanner, { backgroundColor: '#8A6D2820' }]}>
            <Text style={[styles.actionBannerText, { color: '#E5C76B' }]}>
              {state.actionCtx.raisedByPosition} raised to {state.actionCtx.raiseAmount}BB
              {state.actionCtx.calledByCount > 0 ? ` · ${state.actionCtx.calledByCount} caller(s)` : ''}
              {' · '}Pot: {state.pot.toFixed(1)}BB
            </Text>
          </View>
        )}

        {/* Phase advance button for post-flop */}
        {canAdvance && (
          <View style={styles.centerActions}>
            <TouchableOpacity
              style={[styles.advanceBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={advancePhase}
            >
              <Text style={[styles.advanceBtnText, { color: colors.foreground }]}>
                {state.phase === 'flop' ? 'TURN →' : state.phase === 'turn' ? 'RIVER →' : 'SHOWDOWN →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Idle / Showdown state */}
        {(isIdle || isShowdown) && !state.showAnalysis && (
          <View style={styles.centerActions}>
            {isShowdown && state.analysis && (
              <View style={[styles.resultBanner, { backgroundColor: state.analysis.isGTO ? '#27AE6020' : '#E74C3C20', borderColor: state.analysis.isGTO ? '#27AE6060' : '#E74C3C60' }]}>
                <Text style={[styles.resultText, { color: state.analysis.isGTO ? '#27AE60' : '#E74C3C' }]}>
                  {state.analysis.isGTO ? '✓ Good play!' : `✗ ${state.analysis.mistakes.length} mistake(s) detected`}
                </Text>
                <Text style={[styles.resultHand, { color: colors.mutedForeground }]}>
                  {state.analysis.handNotation} · {state.analysis.handStrength}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.dealBtn, { backgroundColor: colors.gold }]}
              onPress={handleNewHand}
            >
              <Text style={[styles.dealBtnText, { color: '#0D1B0F' }]}>
                {isIdle ? 'DEAL CARDS' : 'NEXT HAND'}
              </Text>
            </TouchableOpacity>

            {isIdle && (
              <Text style={[styles.idleSubtext, { color: colors.mutedForeground }]}>
                Hero is always bottom center · Positions rotate each hand
              </Text>
            )}
          </View>
        )}

        {/* Showdown re-open analysis */}
        {isShowdown && !state.showAnalysis && state.analysis && (
          <TouchableOpacity
            style={[styles.reviewBtn, { borderColor: colors.border }]}
            onPress={() => dismissAnalysis()}
          >
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Action panel — preflop only */}
      <ActionPanel />

      {/* Coach modal */}
      <CoachModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sessionStats: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  diffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diffPicker: {
    position: 'absolute',
    right: 12,
    top: 60,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  diffOption: {
    padding: 12,
    borderRadius: 8,
  },
  diffOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffOptionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  diffCheck: {
    fontSize: 14,
    fontWeight: '700',
  },
  diffOptionDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  actionBanner: {
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBannerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerActions: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  dealBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: 'center',
  },
  dealBtnText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  idleSubtext: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  advanceBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1,
  },
  advanceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    width: '100%',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultHand: {
    fontSize: 12,
    marginTop: 3,
  },
  reviewBtn: {
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
