import React from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStats } from '@/context/StatsContext';
import { MISTAKE_LABELS, MistakeType } from '@/constants/pokerData';

const ALL_MISTAKES: MistakeType[] = [
  'folded_too_tight','called_too_loose','bad_sizing',
  'ignored_pot_odds','bad_bluff','missed_value','limp_utg',
];

const MISTAKE_ICONS: Record<MistakeType, string> = {
  folded_too_tight: 'minus-circle',
  called_too_loose: 'plus-circle',
  bad_sizing: 'sliders',
  ignored_pot_odds: 'percent',
  bad_bluff: 'eye-off',
  missed_value: 'dollar-sign',
  limp_utg: 'chevrons-right',
};

const MISTAKE_COLORS: Record<MistakeType, string> = {
  folded_too_tight: '#3498DB',
  called_too_loose: '#E74C3C',
  bad_sizing: '#E67E22',
  ignored_pot_odds: '#9B59B6',
  bad_bluff: '#E74C3C',
  missed_value: '#C9A84C',
  limp_utg: '#95A5A6',
};

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, getAlerts, getMistakeCount, clearMistakes } = useStats();
  const alerts = getAlerts();
  const totalMistakes = stats.mistakes.length;
  const winRate = stats.handsPlayed > 0 ? Math.round((stats.handsWon / stats.handsPlayed) * 100) : 0;
  const topPad = Platform.OS === 'web' ? insets.top + 10 : insets.top + 4;
  const maxCount = Math.max(...ALL_MISTAKES.map(m => getMistakeCount(m)), 1);

  function handleClear() {
    Alert.alert('Reset Stats', 'This will clear all hands and mistakes. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
          clearMistakes();
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.gold }]}>YOUR STATS</Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard label="Hands Played" value={String(stats.handsPlayed)} colors={colors} />
          <SummaryCard
            label="Profit"
            value={`${stats.totalProfitBB >= 0 ? '+' : ''}${stats.totalProfitBB}BB`}
            valueColor={stats.totalProfitBB >= 0 ? '#27AE60' : '#E74C3C'}
            colors={colors}
          />
          <SummaryCard label="Mistakes" value={String(totalMistakes)} valueColor={totalMistakes > 0 ? '#E74C3C' : '#27AE60'} colors={colors} />
          <SummaryCard
            label="Accuracy"
            value={stats.handsPlayed > 0 ? `${Math.round(((stats.handsPlayed - Math.min(totalMistakes, stats.handsPlayed)) / stats.handsPlayed) * 100)}%` : '—'}
            colors={colors}
          />
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Leaks to Fix</Text>
            {alerts.map((alert, i) => (
              <View
                key={i}
                style={[styles.alertCard, {
                  backgroundColor: alert.severity === 'high' ? '#E74C3C12' : '#E67E2212',
                  borderColor: alert.severity === 'high' ? '#E74C3C40' : '#E67E2240',
                }]}
              >
                <View style={styles.alertHeader}>
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={alert.severity === 'high' ? '#E74C3C' : '#E67E22'}
                  />
                  <Text style={[styles.alertTitle, { color: alert.severity === 'high' ? '#E74C3C' : '#E67E22' }]}>
                    {MISTAKE_LABELS[alert.type]}
                  </Text>
                  <View style={[styles.alertCountBadge, { backgroundColor: alert.severity === 'high' ? '#E74C3C' : '#E67E22' }]}>
                    <Text style={styles.alertCount}>{alert.count}×</Text>
                  </View>
                </View>
                <Text style={[styles.alertTip, { color: colors.foreground }]}>{alert.tip}</Text>
              </View>
            ))}
          </View>
        )}

        {stats.handsPlayed === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No hands played yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Play some hands to see your stats and leak analysis here
            </Text>
          </View>
        )}

        {/* Mistake breakdown */}
        {totalMistakes > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mistake Breakdown</Text>
            {ALL_MISTAKES.map(m => {
              const count = getMistakeCount(m);
              const barWidth = (count / maxCount) * 100;
              return (
                <View key={m} style={[styles.mistakeRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.mistakeLeft}>
                    <Feather
                      name={MISTAKE_ICONS[m] as any}
                      size={14}
                      color={count > 0 ? MISTAKE_COLORS[m] : colors.mutedForeground}
                    />
                    <Text style={[styles.mistakeLabel, { color: count > 0 ? colors.foreground : colors.mutedForeground }]}>
                      {MISTAKE_LABELS[m]}
                    </Text>
                  </View>
                  <View style={styles.mistakeRight}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: MISTAKE_COLORS[m] }]} />
                    </View>
                    <Text style={[styles.mistakeCount, { color: count > 0 ? MISTAKE_COLORS[m] : colors.mutedForeground }]}>
                      {count}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent mistakes list */}
        {stats.mistakes.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Mistakes</Text>
            {[...stats.mistakes].reverse().slice(0, 10).map(m => (
              <View key={m.id} style={[styles.recentMistake, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.recentMistakeHeader}>
                  <Text style={[styles.recentMistakeType, { color: MISTAKE_COLORS[m.type] }]}>
                    {MISTAKE_LABELS[m.type]}
                  </Text>
                  <Text style={[styles.recentMistakeHand, { color: colors.mutedForeground }]}>
                    Hand #{m.handNumber}
                  </Text>
                </View>
                <Text style={[styles.recentMistakeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {m.description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  label, value, valueColor, colors
}: { label: string; value: string; valueColor?: string; colors: any }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clearBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 20 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  alertCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  alertCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertCount: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  alertTip: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  mistakeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mistakeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  mistakeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1B3A1E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  mistakeCount: {
    fontSize: 13,
    fontWeight: '800',
    width: 20,
    textAlign: 'right',
  },
  recentMistake: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  recentMistakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  recentMistakeType: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentMistakeHand: {
    fontSize: 11,
  },
  recentMistakeDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
