import React from 'react';
import {
  Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { useStats } from '@/context/StatsContext';
import { useColors } from '@/hooks/useColors';
import { MISTAKE_LABELS, MISTAKE_TIPS, STRENGTH_COLORS, POSITION_DESCRIPTIONS } from '@/constants/pokerData';

export default function CoachModal() {
  const { state, advancePhase, dismissAnalysis } = useGame();
  const { logMistake } = useStats();
  const colors = useColors();
  const { analysis, showAnalysis, phase } = state;

  React.useEffect(() => {
    if (showAnalysis && analysis) {
      analysis.mistakes.forEach(m => {
        logMistake(m, MISTAKE_TIPS[m], state.handNumber);
      });
    }
  }, [showAnalysis]);

  if (!showAnalysis || !analysis) return null;

  const isShowdown = phase === 'showdown';
  const gtoColor = analysis.isGTO ? '#27AE60' : '#E74C3C';

  function handleNext() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (isShowdown) {
      dismissAnalysis();
    } else {
      advancePhase();
    }
  }

  return (
    <Modal transparent animationType="slide" visible={showAnalysis}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.gtoIndicator, { backgroundColor: gtoColor }]}>
                <Feather
                  name={analysis.isGTO ? 'check' : 'alert-triangle'}
                  size={12}
                  color="#FFF"
                />
                <Text style={styles.gtoLabel}>{analysis.isGTO ? 'GTO' : 'NOT GTO'}</Text>
              </View>
              <Text style={[styles.handLabel, { color: colors.foreground }]}>{analysis.handNotation}</Text>
              <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[analysis.handStrength] }]}>
                {analysis.handStrength}
              </Text>
            </View>
            <TouchableOpacity onPress={() => dismissAnalysis()}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Main advice */}
            <View style={[styles.adviceBox, { backgroundColor: gtoColor + '22', borderColor: gtoColor + '44' }]}>
              <Text style={[styles.adviceText, { color: colors.foreground }]}>{analysis.advice}</Text>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatCell label="Your Action" value={analysis.heroAction.toUpperCase()} color={colors.primary} />
              <StatCell label="GTO Action" value={analysis.gtoAction.toUpperCase()} color={gtoColor} />
              <StatCell label="Equity" value={`${analysis.equity}%`} color={colors.foreground} />
              {analysis.potOdds > 0 && (
                <StatCell
                  label="Pot Odds"
                  value={`${analysis.potOdds}%`}
                  color={analysis.equity >= analysis.potOdds ? '#27AE60' : '#E74C3C'}
                />
              )}
              <StatCell label="Position" value={analysis.heroPosition} color={colors.foreground} />
              {analysis.heroAction === 'raise' && (
                <StatCell label="Raise Size" value={`${analysis.raiseAmountBB}BB`} color={colors.foreground} />
              )}
            </View>

            {/* Position tip */}
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                POSITION: {analysis.heroPosition}
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground }]}>
                {POSITION_DESCRIPTIONS[analysis.heroPosition]}
              </Text>
            </View>

            {/* Mistakes */}
            {analysis.mistakes.length > 0 && (
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: '#E74C3C' }]}>
                  LEAKS DETECTED
                </Text>
                {analysis.mistakes.map(m => (
                  <View key={m} style={[styles.mistakeItem, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C30' }]}>
                    <Text style={[styles.mistakeLabel, { color: '#E74C3C' }]}>{MISTAKE_LABELS[m]}</Text>
                    <Text style={[styles.mistakeTip, { color: colors.foreground }]}>{MISTAKE_TIPS[m]}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* GTO raise sizing tip */}
            {!analysis.isGTO && analysis.gtoAction === 'raise' && (
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  STANDARD SIZING
                </Text>
                <Text style={[styles.sectionText, { color: colors.foreground }]}>
                  Open raise: 2.5–3x BB{'\n'}
                  3-bet: ~3x the open (9–11x total){'\n'}
                  4-bet: ~2.2x the 3-bet{'\n'}
                  Raise sizes in BB (not chips) help opponents calculate odds precisely.
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={[styles.nextText, { color: colors.primaryForeground }]}>
              {isShowdown ? 'NEW HAND' : 'NEXT STREET'}
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCell, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gtoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gtoLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  handLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
  },
  adviceBox: {
    marginTop: 14,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  statCell: {
    flex: 1,
    minWidth: 80,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  mistakeItem: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  mistakeLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  mistakeTip: {
    fontSize: 12,
    lineHeight: 18,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
