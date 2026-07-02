import React, { useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStats } from '@/context/StatsContext';
import type { HandHistoryEntry, PlayerPattern } from '@/context/StatsContext';
import { MISTAKE_LABELS, MistakeType, POSITION_COLORS } from '@/constants/pokerData';

const ALL_MISTAKES: MistakeType[] = [
  'folded_too_tight','called_too_loose','bad_sizing',
  'ignored_pot_odds','bad_bluff','missed_value','limp_utg',
];

const MISTAKE_ICONS: Record<MistakeType, string> = {
  folded_too_tight: 'minus-circle', called_too_loose: 'plus-circle',
  bad_sizing: 'sliders', ignored_pot_odds: 'percent',
  bad_bluff: 'eye-off', missed_value: 'dollar-sign', limp_utg: 'chevrons-right',
};
const MISTAKE_COLORS: Record<MistakeType, string> = {
  folded_too_tight: '#3498DB', called_too_loose: '#E74C3C', bad_sizing: '#E67E22',
  ignored_pot_odds: '#9B59B6', bad_bluff: '#E74C3C', missed_value: '#C9A84C', limp_utg: '#95A5A6',
};

const SUIT_COLORS: Record<string, string> = { '♥': '#E74C3C', '♦': '#E74C3C', '♠': '#BDC3C7', '♣': '#BDC3C7' };

function CardChip({ label }: { label: string }) {
  const colors = useColors();
  const parts = label.match(/^([^♠♥♦♣]*)([♠♥♦♣]?)$/) ?? [label, label, ''];
  const rank = parts[1] ?? label;
  const suit = parts[2] ?? '';
  const suitColor = SUIT_COLORS[suit] ?? '#BDC3C7';

  return (
    <View style={[chipStyles.card, { backgroundColor: '#1A2B1C', borderColor: '#2D4A2F' }]}>
      <Text style={[chipStyles.rank, { color: suitColor }]}>{rank}</Text>
      <Text style={[chipStyles.suit, { color: suitColor }]}>{suit}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  card: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 2, alignItems: 'center', minWidth: 22 },
  rank: { fontSize: 11, fontWeight: '800', lineHeight: 14 },
  suit: { fontSize: 8, lineHeight: 10 },
});

function HandHistoryRow({ entry, colors }: { entry: HandHistoryEntry; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  const posColor = POSITION_COLORS[entry.heroPosition] ?? '#7A9E7A';
  const preflopColor = entry.preflopGTO ? '#27AE60' : '#E74C3C';
  const date = new Date(entry.timestamp);
  const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  // Parse flop/turn/river into individual card labels
  const flopParts = entry.flopCards ? entry.flopCards.split(' ') : [];

  return (
    <TouchableOpacity
      style={[styles.histRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
    >
      {/* Main row */}
      <View style={styles.histMain}>
        {/* Left: hand# + position + hero cards */}
        <View style={styles.histLeft}>
          <Text style={[styles.histHandNum, { color: colors.mutedForeground }]}>#{entry.handNumber}</Text>
          <View style={[styles.posBadge, { backgroundColor: posColor + '25', borderColor: posColor + '60' }]}>
            <Text style={[styles.posBadgeText, { color: posColor }]}>{entry.heroPosition}</Text>
          </View>
          <View style={[styles.notationBadge, { backgroundColor: preflopColor + '20', borderColor: preflopColor + '50' }]}>
            <Text style={[styles.notationText, { color: preflopColor }]}>{entry.heroNotation}</Text>
          </View>
        </View>

        {/* Right: board texture dot + street results + expand */}
        <View style={styles.histRight}>
          <View style={[styles.textureDot, { backgroundColor: entry.boardTextureColor }]} />
          {['flop', 'turn', 'river'].map(s => {
            const streetEntry = entry.streets.find(st => st.street === s);
            const isFolded = entry.foldedStreet === s;
            if (!streetEntry && !isFolded) {
              return (
                <View key={s} style={[styles.streetPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.streetPillText, { color: colors.mutedForeground }]}>{s[0].toUpperCase()}</Text>
                </View>
              );
            }
            const isGTO = streetEntry?.isGTO ?? false;
            return (
              <View key={s} style={[styles.streetPill, { backgroundColor: (isFolded ? '#E74C3C' : isGTO ? '#27AE60' : '#E74C3C') + '25', borderColor: (isFolded ? '#E74C3C' : isGTO ? '#27AE60' : '#E74C3C') + '55' }]}>
                <Text style={[styles.streetPillText, { color: isFolded ? '#E74C3C' : isGTO ? '#27AE60' : '#E74C3C' }]}>
                  {s[0].toUpperCase()}
                </Text>
              </View>
            );
          })}
          {entry.totalMistakes > 0 && (
            <View style={[styles.mistakeBubble, { backgroundColor: '#E74C3C' }]}>
              <Text style={styles.mistakeBubbleText}>{entry.totalMistakes}</Text>
            </View>
          )}
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
        </View>
      </View>

      {/* Expanded: board cards + street detail */}
      {expanded && (
        <View style={[styles.histExpanded, { borderTopColor: colors.border }]}>
          {/* Board */}
          {entry.flopCards && (
            <View style={styles.boardRow}>
              <Text style={[styles.boardLabel, { color: colors.mutedForeground }]}>BOARD</Text>
              <View style={styles.cardsRow}>
                {flopParts.map((c, i) => <CardChip key={`f${i}`} label={c} />)}
                {entry.turnCard ? <CardChip label={entry.turnCard} /> : null}
                {entry.riverCard ? <CardChip label={entry.riverCard} /> : null}
              </View>
              <View style={[styles.texturePill, { backgroundColor: entry.boardTextureColor + '20', borderColor: entry.boardTextureColor + '50' }]}>
                <Text style={[styles.texturePillText, { color: entry.boardTextureColor }]}>{entry.boardTexture}</Text>
              </View>
            </View>
          )}

          {/* Preflop */}
          <View style={styles.streetDetail}>
            <Text style={[styles.streetDetailLabel, { color: colors.mutedForeground }]}>PREFLOP</Text>
            <Text style={[styles.streetDetailAction, { color: colors.foreground }]}>{entry.preflopAction}</Text>
            <View style={[styles.gtoTag, { backgroundColor: preflopColor + '25' }]}>
              <Text style={[styles.gtoTagText, { color: preflopColor }]}>{entry.preflopGTO ? '✓ GTO' : '✗ Not GTO'}</Text>
            </View>
          </View>

          {/* Post-flop streets */}
          {entry.streets.map(s => (
            <View key={s.street} style={styles.streetDetail}>
              <Text style={[styles.streetDetailLabel, { color: colors.mutedForeground }]}>{s.street.toUpperCase()}</Text>
              <Text style={[styles.streetDetailAction, { color: colors.foreground }]}>{s.action}</Text>
              <Text style={[styles.streetDetailHand, { color: SUIT_COLORS['♠'] }]}>{s.madeHand}</Text>
              <View style={[styles.gtoTag, { backgroundColor: (s.isGTO ? '#27AE60' : '#E74C3C') + '25' }]}>
                <Text style={[styles.gtoTagText, { color: s.isGTO ? '#27AE60' : '#E74C3C' }]}>
                  {s.isGTO ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          ))}

          {entry.folded && (
            <Text style={[styles.foldedNote, { color: '#E74C3C' }]}>
              Folded on {entry.foldedStreet}
            </Text>
          )}

          <Text style={[styles.histTime, { color: colors.mutedForeground }]}>{timeLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { stats, getAlerts, getMistakeCount, clearMistakes, getProfile } = useStats();
  const alerts = getAlerts();
  const totalMistakes = stats.mistakes.length;
  const profile = getProfile();
  const handsWithReasoning = stats.handHistory.filter(h => (h as any).reasoning !== undefined).length;
  const topPad = Platform.OS === 'web' ? insets.top + 10 : insets.top + 4;
  const maxCount = Math.max(...ALL_MISTAKES.map(m => getMistakeCount(m)), 1);

  function handleClear() {
    Alert.alert('Reset Stats', 'This will clear all hands and mistakes. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
          clearMistakes();
        },
      },
    ]);
  }

  const recentHistory = [...stats.handHistory].reverse();

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
          <SummaryCard label="Hands" value={String(stats.handsPlayed)} colors={colors} />
          <SummaryCard label="Profit" value={`${stats.totalProfitBB >= 0 ? '+' : ''}${stats.totalProfitBB}BB`}
            valueColor={stats.totalProfitBB >= 0 ? '#27AE60' : '#E74C3C'} colors={colors} />
          <SummaryCard label="Mistakes" value={String(totalMistakes)}
            valueColor={totalMistakes > 0 ? '#E74C3C' : '#27AE60'} colors={colors} />
          <SummaryCard
            label="Accuracy"
            value={stats.handsPlayed > 0
              ? `${Math.round(((stats.handsPlayed - Math.min(totalMistakes, stats.handsPlayed)) / stats.handsPlayed) * 100)}%`
              : '—'}
            colors={colors}
          />
        </View>

        {/* Player Profile */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[styles.profileHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Your Profile</Text>
            {handsWithReasoning > 0 && (
              <Text style={[styles.profileHandCount, { color: colors.mutedForeground }]}>
                {handsWithReasoning} hand{handsWithReasoning !== 1 ? 's' : ''} analysed
              </Text>
            )}
          </View>
          {profile.length === 0 ? (
            <View style={[styles.profileEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="user" size={22} color={colors.mutedForeground} />
              <Text style={[styles.profileEmptyTitle, { color: colors.foreground }]}>
                {handsWithReasoning < 5
                  ? `Play ${Math.max(0, 5 - handsWithReasoning)} more hand${5 - handsWithReasoning !== 1 ? 's' : ''} to build your profile`
                  : 'No patterns detected yet'}
              </Text>
              <Text style={[styles.profileEmptyText, { color: colors.mutedForeground }]}>
                After each hand, tell the app why you acted. It builds a profile of your thinking — not just whether you were right.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {profile.map(p => (
                <PatternCard key={p.id} pattern={p} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Leaks to Fix</Text>
            {alerts.map((alert, i) => (
              <View key={i} style={[styles.alertCard, {
                backgroundColor: alert.severity === 'high' ? '#E74C3C12' : '#E67E2212',
                borderColor: alert.severity === 'high' ? '#E74C3C40' : '#E67E2240',
              }]}>
                <View style={styles.alertHeader}>
                  <Feather name="alert-circle" size={14} color={alert.severity === 'high' ? '#E74C3C' : '#E67E22'} />
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

        {/* Empty state */}
        {stats.handsPlayed === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No hands played yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Play some hands to see your stats, leak analysis, and hand history here
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
                    <Feather name={MISTAKE_ICONS[m] as any} size={14} color={count > 0 ? MISTAKE_COLORS[m] : colors.mutedForeground} />
                    <Text style={[styles.mistakeLabel, { color: count > 0 ? colors.foreground : colors.mutedForeground }]}>
                      {MISTAKE_LABELS[m]}
                    </Text>
                  </View>
                  <View style={styles.mistakeRight}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barWidth}%` as any, backgroundColor: MISTAKE_COLORS[m] }]} />
                    </View>
                    <Text style={[styles.mistakeCount, { color: count > 0 ? MISTAKE_COLORS[m] : colors.mutedForeground }]}>{count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Hand History */}
        {recentHistory.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <View style={styles.histHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                Hand History
              </Text>
              <Text style={[styles.histCount, { color: colors.mutedForeground }]}>
                Last {recentHistory.length}
              </Text>
            </View>
            <Text style={[styles.histSubtext, { color: colors.mutedForeground }]}>
              Tap any hand to replay street-by-street
            </Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {recentHistory.map(entry => (
                <HandHistoryRow key={entry.handNumber} entry={entry} colors={colors} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value, valueColor, colors }: { label: string; value: string; valueColor?: string; colors: any }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

function PatternCard({ pattern, colors }: { pattern: PlayerPattern; colors: any }) {
  const severityColor = pattern.severity === 'high' ? '#E74C3C' : pattern.severity === 'medium' ? '#E67E22' : '#3498DB';
  return (
    <View style={[styles.patternCard, { backgroundColor: severityColor + '0E', borderColor: severityColor + '44' }]}>
      <View style={styles.patternTop}>
        <View style={[styles.patternSeverityDot, { backgroundColor: severityColor }]} />
        <Text style={[styles.patternHeadline, { color: colors.foreground }]}>{pattern.headline}</Text>
      </View>
      <Text style={[styles.patternDetail, { color: colors.foreground }]}>{pattern.detail}</Text>
      <Text style={[styles.patternEvidence, { color: severityColor }]}>{pattern.evidence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  clearBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  summaryCard: { flex: 1, minWidth: '44%', borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  alertCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  alertTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  alertCountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertCount: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  alertTip: { fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  mistakeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, gap: 8,
  },
  mistakeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  mistakeLabel: { fontSize: 12, fontWeight: '600' },
  mistakeRight: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#1B3A1E', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  mistakeCount: { fontSize: 13, fontWeight: '800', width: 20, textAlign: 'right' },

  // Hand history
  histHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  histCount: { fontSize: 12, fontWeight: '600' },
  histSubtext: { fontSize: 11, fontStyle: 'italic' },
  histRow: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  histMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  histLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  histRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  histHandNum: { fontSize: 10, fontWeight: '600', minWidth: 24 },
  posBadge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2 },
  posBadgeText: { fontSize: 10, fontWeight: '800' },
  notationBadge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  notationText: { fontSize: 12, fontWeight: '800' },
  textureDot: { width: 8, height: 8, borderRadius: 4 },
  streetPill: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2 },
  streetPillText: { fontSize: 9, fontWeight: '800' },
  mistakeBubble: { borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  mistakeBubbleText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Expanded
  histExpanded: { borderTopWidth: 1, padding: 10, gap: 8 },
  boardRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  boardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardsRow: { flexDirection: 'row', gap: 4 },
  texturePill: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  texturePillText: { fontSize: 9, fontWeight: '700' },
  streetDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streetDetailLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, width: 44 },
  streetDetailAction: { fontSize: 12, fontWeight: '600', flex: 1 },
  streetDetailHand: { fontSize: 10, fontWeight: '600' },
  gtoTag: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  gtoTagText: { fontSize: 10, fontWeight: '800' },
  foldedNote: { fontSize: 11, fontStyle: 'italic' },
  histTime: { fontSize: 10, textAlign: 'right' },

  // Profile
  profileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  profileHandCount: { fontSize: 11, fontWeight: '600' },
  profileEmpty: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  profileEmptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  profileEmptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  patternCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  patternTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  patternSeverityDot: { width: 8, height: 8, borderRadius: 4 },
  patternHeadline: { fontSize: 14, fontWeight: '800', flex: 1 },
  patternDetail: { fontSize: 12, lineHeight: 18, marginBottom: 6 },
  patternEvidence: { fontSize: 11, fontWeight: '600', fontStyle: 'italic' },
});
