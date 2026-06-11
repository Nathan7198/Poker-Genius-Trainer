import React from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
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
  const { state, startNewHand, setDifficulty } = useGame();
  const { stats } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);

  const isIdle = state.phase === 'idle';
  const isShowdown = state.phase === 'showdown' && !state.showAnalysis;
  const isLive = !isIdle && !isShowdown && !state.showAnalysis;

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

  const streetBadge = isLive ? {
    flop: 'FLOP',
    turn: 'TURN',
    river: 'RIVER',
    preflop: 'PREFLOP',
  }[state.phase] ?? null : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 10 : 0 }]}>
      {/* Header */}
      <View style={[styles.topBar, {
        paddingTop: Platform.OS !== 'web' ? insets.top + 4 : 4,
        borderBottomColor: colors.border,
      }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.appTitle, { color: colors.gold }]}>POKER TRAINER</Text>
          {stats.handsPlayed > 0 && (
            <Text style={[styles.sessionStats, { color: colors.mutedForeground }]}>
              {stats.handsPlayed} hands · {stats.totalProfitBB >= 0 ? '+' : ''}{stats.totalProfitBB}BB
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {/* Street badge */}
          {streetBadge && (
            <View style={[styles.streetBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.streetBadgeText, { color: colors.gold }]}>{streetBadge}</Text>
            </View>
          )}
          {/* Pot badge */}
          {isLive && state.pot > 0 && (
            <View style={[styles.potBadge, { backgroundColor: '#8A6D2820', borderColor: '#8A6D2850' }]}>
              <Text style={[styles.potText, { color: '#E5C76B' }]}>POT {state.pot.toFixed(1)}BB</Text>
            </View>
          )}
          {/* Difficulty selector */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <PokerTable />

        {/* Opponent raise context on preflop */}
        {state.phase === 'preflop' && state.actionCtx.facingRaise && !state.showAnalysis && (
          <View style={[styles.actionBanner, { backgroundColor: '#8A6D2815' }]}>
            <Text style={[styles.actionBannerText, { color: '#E5C76B' }]}>
              {state.actionCtx.raisedByPosition} raised to {state.actionCtx.raiseAmount}BB
              {state.actionCtx.calledByCount > 0 ? ` · ${state.actionCtx.calledByCount} caller(s)` : ''}
            </Text>
          </View>
        )}

        {/* Idle state */}
        {isIdle && (
          <View style={styles.centerActions}>
            <TouchableOpacity style={[styles.dealBtn, { backgroundColor: colors.gold }]} onPress={handleNewHand}>
              <Text style={[styles.dealBtnText, { color: '#0D1B0F' }]}>DEAL CARDS</Text>
            </TouchableOpacity>
            <Text style={[styles.idleSubtext, { color: colors.mutedForeground }]}>
              Hero always at bottom · Train preflop + post-flop decisions
            </Text>
          </View>
        )}

        {/* Showdown result */}
        {isShowdown && (
          <View style={styles.centerActions}>
            {/* Streets completed */}
            {state.postFlopStreetsDone.length > 0 && (
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.resultCardTitle, { color: colors.mutedForeground }]}>
                  STREETS PLAYED
                </Text>
                <View style={styles.streetsRow}>
                  {(['flop','turn','river'] as const).map(s => {
                    const done = state.postFlopStreetsDone.includes(s);
                    return (
                      <View key={s} style={[styles.streetPip, { backgroundColor: done ? colors.gold + '30' : colors.secondary, borderColor: done ? colors.gold : colors.border }]}>
                        <Text style={[styles.streetPipText, { color: done ? colors.gold : colors.mutedForeground }]}>
                          {s.toUpperCase()}
                        </Text>
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
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sessionStats: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  streetBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
  },
  streetBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  potBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
  },
  potText: { fontSize: 10, fontWeight: '700' },
  diffBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
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
  actionBanner: {
    marginHorizontal: 12, marginTop: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  actionBannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  centerActions: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  dealBtn: {
    paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center',
  },
  dealBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  idleSubtext: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  resultCard: {
    borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', width: '100%',
  },
  resultCardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  streetsRow: { flexDirection: 'row', gap: 10 },
  streetPip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  streetPipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
