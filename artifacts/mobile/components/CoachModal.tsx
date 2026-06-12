import React from 'react';
import {
  Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { useStats } from '@/context/StatsContext';
import { useColors } from '@/hooks/useColors';
import {
  MISTAKE_LABELS, MISTAKE_TIPS, STRENGTH_COLORS, POSITION_DESCRIPTIONS,
  MADE_HAND_COLORS, BOARD_TEXTURE_INFO, PLAYER_TYPE_INFO,
} from '@/constants/pokerData';
import type { VillainActionType } from '@/context/GameContext';

export default function CoachModal() {
  const { state, advancePhase, dismissAnalysis, foldToVillainBet } = useGame();
  const { logMistake } = useStats();
  const colors = useColors();
  const { analysis, postFlopAnalysis, showAnalysis, phase, lastHeroAction, mainVillainType } = state;

  const isPostFlopModal = showAnalysis && postFlopAnalysis !== null;
  const isPreflopModal = showAnalysis && analysis !== null && !isPostFlopModal;

  React.useEffect(() => {
    if (!showAnalysis) return;
    if (isPreflopModal && analysis) {
      analysis.mistakes.forEach(m => logMistake(m, MISTAKE_TIPS[m], state.handNumber));
    }
    if (isPostFlopModal && postFlopAnalysis) {
      postFlopAnalysis.mistakes.forEach(m => logMistake(m, MISTAKE_TIPS[m], state.handNumber));
    }
  }, [showAnalysis]);

  if (!showAnalysis) return null;

  function haptic() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function handleNext() {
    haptic();
    if (phase === 'showdown') {
      dismissAnalysis();
    } else if (isPreflopModal) {
      dismissAnalysis();
    } else {
      advancePhase();
    }
  }

  function handleFold() {
    haptic();
    foldToVillainBet();
  }

  function nextBtnLabel() {
    if (phase === 'showdown') return 'SEE RESULT';
    if (isPreflopModal) return 'VIEW FLOP';
    if (phase === 'flop') return 'CALL — DEAL TURN';
    if (phase === 'turn') return 'CALL — DEAL RIVER';
    if (phase === 'river') return 'CALL — SHOWDOWN';
    return 'CONTINUE';
  }

  function normalNextBtnLabel() {
    if (phase === 'showdown') return 'SEE RESULT';
    if (isPreflopModal) return 'VIEW FLOP';
    if (phase === 'flop') return 'DEAL TURN';
    if (phase === 'turn') return 'DEAL RIVER';
    if (phase === 'river') return 'SHOWDOWN';
    return 'CONTINUE';
  }

  function villainActionLabel(act: VillainActionType, betPct: number, betBB: number): string {
    switch (act) {
      case 'fold':  return 'FOLDED';
      case 'check': return 'CHECK';
      case 'call':  return 'CALLED';
      case 'bet':   return `BET ${betPct}% (${betBB}BB)`;
      case 'raise': return `RAISED ${betPct}% (${betBB}BB)`;
    }
  }

  function villainActionColor(act: VillainActionType): string {
    switch (act) {
      case 'fold':  return '#27AE60';
      case 'check': return colors.mutedForeground;
      case 'call':  return '#3498DB';
      case 'bet':   return '#E74C3C';
      case 'raise': return '#E74C3C';
    }
  }

  // ── POST-FLOP MODAL ────────────────────────────────────────────────────────
  if (isPostFlopModal && postFlopAnalysis) {
    const pf = postFlopAnalysis;
    const gtoColor = pf.isGTO ? '#27AE60' : '#E74C3C';
    const streetLabel = pf.street.charAt(0).toUpperCase() + pf.street.slice(1);
    const textureInfo = BOARD_TEXTURE_INFO[pf.boardTexture.texture];
    const madeHandColor = MADE_HAND_COLORS[pf.madeHand];

    // Determine if hero checked and villain bet → show Call or Fold buttons
    const heroCheckedVillainBet =
      pf.heroAction === 'check' &&
      (pf.villainAction === 'bet' || pf.villainAction === 'raise') &&
      phase !== 'showdown';

    // Villain response to hero's bet (if present)
    const showVillainResponse = pf.villainResponse !== null && pf.villainResponse !== pf.villainAction;

    return (
      <Modal transparent animationType="slide" visible>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.gtoIndicator, { backgroundColor: gtoColor }]}>
                  <Feather name={pf.isGTO ? 'check' : 'alert-triangle'} size={12} color="#FFF" />
                  <Text style={styles.gtoLabel}>{pf.isGTO ? 'GTO' : 'NOT GTO'}</Text>
                </View>
                <Text style={[styles.streetLabel, { color: colors.foreground }]}>{streetLabel}</Text>
                <View style={[styles.madeHandBadge, { backgroundColor: madeHandColor + '30', borderColor: madeHandColor + '60' }]}>
                  <Text style={[styles.madeHandBadgeText, { color: madeHandColor }]}>{pf.madeHand}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => dismissAnalysis()}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Board texture */}
              <View style={[styles.textureBox, { backgroundColor: textureInfo.color + '15', borderColor: textureInfo.color + '40' }]}>
                <View style={styles.textureHeader}>
                  <View style={[styles.textureDot, { backgroundColor: textureInfo.color }]} />
                  <Text style={[styles.textureName, { color: textureInfo.color }]}>
                    {textureInfo.label} Board
                  </Text>
                  <Text style={[styles.textureCards, { color: colors.mutedForeground }]}>
                    {pf.boardTexture.boardRankLabels}
                  </Text>
                </View>
                <Text style={[styles.textureDesc, { color: colors.foreground }]}>
                  {textureInfo.description}
                </Text>
              </View>

              {/* Villain bet banner — only show when hero checked and villain bet */}
              {heroCheckedVillainBet && (
                <View style={[styles.villainBetBanner, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C40' }]}>
                  <Feather name="alert-circle" size={14} color="#E74C3C" />
                  <Text style={[styles.villainBetBannerText, { color: '#E74C3C' }]}>
                    Villain bet {pf.villainBetPct}% pot ({pf.villainBetBB}BB) — Call or Fold?
                  </Text>
                </View>
              )}

              {/* Main advice */}
              <View style={[styles.adviceBox, { backgroundColor: gtoColor + '18', borderColor: gtoColor + '40' }]}>
                <Text style={[styles.adviceText, { color: colors.foreground }]}>{pf.advice}</Text>
              </View>

              {/* Stats grid */}
              <View style={styles.statsGrid}>
                <StatCell label="Your Action" value={pf.heroAction.toUpperCase()} color={colors.primary} colors={colors} />
                <StatCell label="GTO Action" value={pf.gtoAction.toUpperCase()} color={gtoColor} colors={colors} />
                <StatCell label="Made Hand" value={pf.madeHand} color={madeHandColor} colors={colors} />
                <StatCell
                  label="Villain"
                  value={villainActionLabel(pf.villainAction, pf.villainBetPct, pf.villainBetBB)}
                  color={villainActionColor(pf.villainAction)}
                  colors={colors}
                />
                {showVillainResponse && pf.villainResponse && (
                  <StatCell
                    label="V. Response"
                    value={villainActionLabel(pf.villainResponse, pf.villainResponseBetBB > 0 ? Math.round((pf.villainResponseBetBB / (pf.betBB || 1)) * 100) : 0, pf.villainResponseBetBB)}
                    color={villainActionColor(pf.villainResponse)}
                    colors={colors}
                  />
                )}
                {pf.heroAction === 'bet' || pf.heroAction === 'raise' ? (
                  <StatCell label="Hero Bet" value={`${pf.betPct}% pot`} color={colors.foreground} colors={colors} />
                ) : null}
                {pf.cbetRecommendation.sizingPct > 0 && (
                  <StatCell label="GTO Size" value={`${pf.cbetRecommendation.sizingPct}% pot`} color={gtoColor} colors={colors} />
                )}
                {pf.drawInfo.outs > 0 && (
                  <StatCell
                    label="Draw Equity"
                    value={`~${pf.drawInfo.equity}% (${pf.drawInfo.outs} outs)`}
                    color={pf.drawInfo.drawType === 'combo' ? '#E74C3C' : pf.drawInfo.drawType === 'flush' || pf.drawInfo.drawType === 'oesd' ? '#3498DB' : '#E67E22'}
                    colors={colors}
                  />
                )}
              </View>

              {/* C-bet reasoning */}
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  {pf.heroIsAggressor ? 'C-BET ANALYSIS' : 'POST-FLOP ANALYSIS'}
                </Text>
                <Text style={[styles.sectionText, { color: colors.foreground }]}>
                  {pf.cbetRecommendation.reason}
                </Text>
              </View>

              {/* Exploit tip */}
              {!!pf.exploitTip && (() => {
                const typeInfo = PLAYER_TYPE_INFO[mainVillainType];
                return (
                  <View style={[styles.section, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: typeInfo.color }]}>
                      EXPLOIT: {typeInfo.label.toUpperCase()} ({typeInfo.vpip}% VPIP)
                    </Text>
                    <View style={[styles.exploitBox, { backgroundColor: typeInfo.color + '18', borderColor: typeInfo.color + '40' }]}>
                      <Text style={[styles.exploitText, { color: colors.foreground }]}>{pf.exploitTip}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Mistakes */}
              {pf.mistakes.length > 0 && (
                <View style={[styles.section, { borderTopColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: '#E74C3C' }]}>LEAKS DETECTED</Text>
                  {pf.mistakes.map(m => (
                    <View key={m} style={[styles.mistakeItem, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C30' }]}>
                      <Text style={[styles.mistakeLabel, { color: '#E74C3C' }]}>{MISTAKE_LABELS[m]}</Text>
                      <Text style={[styles.mistakeTip, { color: colors.foreground }]}>{MISTAKE_TIPS[m]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            {heroCheckedVillainBet ? (
              <View style={styles.twoButtons}>
                <TouchableOpacity
                  style={[styles.foldBtn, { backgroundColor: '#E74C3C20', borderColor: '#E74C3C60' }]}
                  onPress={handleFold}
                >
                  <Text style={[styles.foldBtnText, { color: '#E74C3C' }]}>FOLD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: colors.primary }]}
                  onPress={handleNext}
                >
                  <Text style={[styles.callBtnText, { color: colors.primaryForeground }]}>{nextBtnLabel()}</Text>
                  <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                onPress={handleNext}
              >
                <Text style={[styles.nextText, { color: colors.primaryForeground }]}>{normalNextBtnLabel()}</Text>
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // ── PREFLOP / FOLD MODAL ───────────────────────────────────────────────────
  if (!analysis) return null;
  const gtoColor = analysis.isGTO ? '#27AE60' : '#E74C3C';

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.gtoIndicator, { backgroundColor: gtoColor }]}>
                <Feather name={analysis.isGTO ? 'check' : 'alert-triangle'} size={12} color="#FFF" />
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
            <View style={[styles.adviceBox, { backgroundColor: gtoColor + '18', borderColor: gtoColor + '40' }]}>
              <Text style={[styles.adviceText, { color: colors.foreground }]}>{analysis.advice}</Text>
            </View>

            <View style={styles.statsGrid}>
              <StatCell label="Your Action" value={analysis.heroAction.toUpperCase()} color={colors.primary} colors={colors} />
              <StatCell label="GTO Action" value={analysis.gtoAction.toUpperCase()} color={gtoColor} colors={colors} />
              <StatCell label="Equity" value={`${analysis.equity}%`} color={colors.foreground} colors={colors} />
              {analysis.potOdds > 0 && (
                <StatCell label="Pot Odds" value={`${analysis.potOdds}%`} color={analysis.equity >= analysis.potOdds ? '#27AE60' : '#E74C3C'} colors={colors} />
              )}
              <StatCell label="Position" value={analysis.heroPosition} color={colors.foreground} colors={colors} />
              {analysis.heroAction === 'raise' && (
                <StatCell label="Raise Size" value={`${analysis.raiseAmountBB}BB`} color={colors.foreground} colors={colors} />
              )}
            </View>

            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                POSITION: {analysis.heroPosition}
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground }]}>
                {POSITION_DESCRIPTIONS[analysis.heroPosition]}
              </Text>
            </View>

            {/* Exploit tip */}
            {!!analysis.exploitTip && (() => {
              const typeInfo = PLAYER_TYPE_INFO[mainVillainType];
              return (
                <View style={[styles.section, { borderTopColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: typeInfo.color }]}>
                    EXPLOIT: {typeInfo.label.toUpperCase()} ({typeInfo.vpip}% VPIP)
                  </Text>
                  <View style={[styles.exploitBox, { backgroundColor: typeInfo.color + '18', borderColor: typeInfo.color + '40' }]}>
                    <Text style={[styles.exploitText, { color: colors.foreground }]}>{analysis.exploitTip}</Text>
                  </View>
                </View>
              );
            })()}

            {analysis.mistakes.length > 0 && (
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: '#E74C3C' }]}>LEAKS DETECTED</Text>
                {analysis.mistakes.map(m => (
                  <View key={m} style={[styles.mistakeItem, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C30' }]}>
                    <Text style={[styles.mistakeLabel, { color: '#E74C3C' }]}>{MISTAKE_LABELS[m]}</Text>
                    <Text style={[styles.mistakeTip, { color: colors.foreground }]}>{MISTAKE_TIPS[m]}</Text>
                  </View>
                ))}
              </View>
            )}

            {!analysis.isGTO && analysis.gtoAction === 'raise' && (
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STANDARD SIZING</Text>
                <Text style={[styles.sectionText, { color: colors.foreground }]}>
                  Open raise: 2.5–3x BB{'\n'}
                  3-bet: ~3x the open (9–11x total){'\n'}
                  4-bet: ~2.2x the 3-bet
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={[styles.nextText, { color: colors.primaryForeground }]}>{normalNextBtnLabel()}</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function StatCell({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={[styles.statCell, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '84%', paddingBottom: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gtoIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  gtoLabel: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  handLabel: { fontSize: 20, fontWeight: '800' },
  strengthLabel: { fontSize: 12, fontWeight: '600' },
  streetLabel: { fontSize: 18, fontWeight: '800' },
  madeHandBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  madeHandBadgeText: { fontSize: 11, fontWeight: '700' },

  body: { paddingHorizontal: 16 },
  textureBox: { marginTop: 12, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  textureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  textureDot: { width: 8, height: 8, borderRadius: 4 },
  textureName: { fontSize: 13, fontWeight: '800' },
  textureCards: { fontSize: 11, flex: 1, textAlign: 'right' },
  textureDesc: { fontSize: 12, lineHeight: 18 },

  villainBetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  villainBetBannerText: { fontSize: 13, fontWeight: '700', flex: 1 },

  adviceBox: { marginTop: 8, borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 10 },
  adviceText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statCell: { flex: 1, minWidth: 80, borderRadius: 8, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  statValue: { fontSize: 13, fontWeight: '800', textAlign: 'center' },

  section: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, marginBottom: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  sectionText: { fontSize: 13, lineHeight: 20 },
  mistakeItem: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 6 },
  mistakeLabel: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  mistakeTip: { fontSize: 12, lineHeight: 18 },
  exploitBox: { borderRadius: 8, borderWidth: 1, padding: 12 },
  exploitText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },

  twoButtons: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginTop: 12,
  },
  foldBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  foldBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  callBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  callBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 12,
  },
  nextText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
