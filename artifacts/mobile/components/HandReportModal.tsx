import React from 'react';
import {
  Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/useColors';
import {
  MADE_HAND_COLORS, BOARD_TEXTURE_INFO, PLAYER_TYPE_INFO, MISTAKE_LABELS, MISTAKE_TIPS,
} from '@/constants/pokerData';
import type { PostFlopStreetAnalysis, VillainActionType } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function HandReportModal({ visible, onClose }: Props) {
  const { state } = useGame();
  const colors = useColors();
  const { analysis, postFlopAnalysisHistory, mainVillainType } = state;

  if (!visible || !analysis) return null;

  const villainInfo = PLAYER_TYPE_INFO[mainVillainType];

  const heroFoldedPreflop = analysis.heroAction === 'fold';

  const allGTO = [
    ...(heroFoldedPreflop ? [] : [analysis.isGTO]),
    ...postFlopAnalysisHistory
      .filter(s => s.heroAction !== 'fold')
      .map(s => s.isGTO),
  ];
  const gtoCount = allGTO.filter(Boolean).length;
  const totalStreets = allGTO.length;
  const overallGood = totalStreets > 0 && gtoCount === totalStreets;

  function haptic() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function handleClose() {
    haptic();
    onClose();
  }

  function preflopActionLabel(): string {
    const a = analysis!.heroAction;
    if (a === 'raise') return `Raise ${analysis!.raiseAmountBB}BB`;
    if (a === 'limp') return 'Limp';
    return a.charAt(0).toUpperCase() + a.slice(1);
  }

  function preflopGtoLabel(): string {
    const g = analysis!.gtoAction;
    if (g === 'raise') {
      const sz = analysis!.gtoRaiseSize;
      return sz ? `Raise ${sz}BB` : 'Raise';
    }
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  function postFlopActionLabel(s: PostFlopStreetAnalysis): string {
    if (s.heroAction === 'bet' || s.heroAction === 'raise') {
      return `${s.heroAction.charAt(0).toUpperCase() + s.heroAction.slice(1)} ${s.betPct}% pot (${s.betBB}BB)`;
    }
    return s.heroAction.charAt(0).toUpperCase() + s.heroAction.slice(1);
  }

  function postFlopGtoLabel(s: PostFlopStreetAnalysis): string {
    if ((s.gtoAction === 'bet' || s.gtoAction === 'raise') && s.gtoSizingPct > 0) {
      return `${s.gtoAction.charAt(0).toUpperCase() + s.gtoAction.slice(1)} ${s.gtoSizingPct}% pot`;
    }
    return s.gtoAction.charAt(0).toUpperCase() + s.gtoAction.slice(1);
  }

  function villainActionLine(act: VillainActionType, pct: number, bb: number): string | null {
    if (act === 'check') return null;
    if (act === 'bet')   return `Villain bet ${pct}% pot (${bb}BB)`;
    if (act === 'raise') return `Villain raised to ${bb}BB`;
    if (act === 'call')  return `Villain called ${bb}BB`;
    return null;
  }

  function villainResponseLine(resp: VillainActionType | null, respBB: number): string | null {
    if (!resp || resp === 'fold') return null;
    if (resp === 'call')  return `Villain called`;
    if (resp === 'raise') return `Villain re-raised to ${respBB}BB`;
    if (resp === 'check') return `Villain checked behind`;
    return null;
  }

  function sizingVerdictPreflop(): SizingVerdict | null {
    if (analysis!.heroAction !== 'raise') return null;
    const actual = analysis!.raiseAmountBB;
    const ideal  = analysis!.gtoRaiseSize;
    if (!ideal) return null;
    const good = Math.abs(actual - ideal) <= 0.5;
    return {
      yourSize:  `${actual}BB`,
      idealSize: `${ideal}BB`,
      good,
      reason: good
        ? null
        : actual < ideal
          ? `Too small — ${actual < 2 ? 'minimum is 2BB, ' : ''}standard is ${ideal}BB`
          : `Oversized — standard open is ${ideal}BB; sizing down protects your range`,
    };
  }

  function sizingVerdictPostFlop(s: PostFlopStreetAnalysis): SizingVerdict | null {
    if (s.heroAction === 'fold') return null;
    const heroBet = s.heroAction === 'bet' || s.heroAction === 'raise';
    const gtoSz   = s.gtoSizingPct || s.cbetRecommendation.sizingPct;

    if (!heroBet && gtoSz === 0) return null;

    if (!heroBet && gtoSz > 0) {
      return {
        yourSize:  null,
        idealSize: `${gtoSz}% pot`,
        good:      false,
        reason:    `GTO calls for a ${gtoSz}% pot bet here — not betting left money on the table`,
      };
    }

    if (heroBet) {
      const pot     = s.betPct > 0 ? Math.round(s.betBB / (s.betPct / 100) * 10) / 10 : null;
      const idealBB = pot && gtoSz > 0 ? Math.round((gtoSz / 100) * pot * 10) / 10 : null;
      const good    = gtoSz === 0 || Math.abs(s.betPct - gtoSz) <= 15;

      if (gtoSz === 0) {
        return { yourSize: `${s.betPct}% pot (${s.betBB}BB)`, idealSize: null, good: true, reason: null };
      }

      return {
        yourSize:  `${s.betPct}% pot (${s.betBB}BB)`,
        idealSize: `${gtoSz}% pot${idealBB ? ` (${idealBB}BB)` : ''}`,
        good,
        reason: good
          ? null
          : s.betPct < gtoSz - 15
            ? `Undersized — ${s.betPct}% lets villain call draws cheaply; ${gtoSz}% charges them correctly`
            : `Oversized — ${s.betPct}% folds out weaker hands you want calls from; ${gtoSz}% is optimal`,
      };
    }

    return null;
  }

  const preflopSizing = sizingVerdictPreflop();

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>HAND REPORT</Text>
              <View style={[styles.handPill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.handPillText, { color: colors.foreground }]}>{analysis.handNotation}</Text>
              </View>
              <View style={[styles.villainPill, { backgroundColor: villainInfo.color + '20', borderColor: villainInfo.color + '40' }]}>
                <Text style={[styles.villainPillText, { color: villainInfo.color }]}>{villainInfo.label}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* ── Score banner ── */}
          <View style={[styles.scoreBanner, {
            backgroundColor: overallGood ? '#27AE6015' : '#E67E2215',
            borderBottomColor: overallGood ? '#27AE6030' : '#E67E2230',
          }]}>
            <Feather name={overallGood ? 'award' : 'target'} size={14}
              color={overallGood ? '#27AE60' : '#E67E22'} />
            <Text style={[styles.scoreText, { color: overallGood ? '#27AE60' : '#E67E22' }]}>
              {totalStreets === 0
                ? 'Folded preflop — no streets to score'
                : `${gtoCount}/${totalStreets} streets played optimally${overallGood ? ' — clean hand!' : ` — ${totalStreets - gtoCount} area${totalStreets - gtoCount > 1 ? 's' : ''} to improve`}`
              }
            </Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}>

            {/* ── PREFLOP ── */}
            <StreetSection
              streetName="PREFLOP"
              isGTO={analysis.isGTO}
              yourAction={preflopActionLabel()}
              gtoAction={preflopGtoLabel()}
              actionsMatch={analysis.heroAction === analysis.gtoAction}
              sizing={preflopSizing}
              advice={analysis.advice}
              mistakes={analysis.mistakes.map(m => ({ label: MISTAKE_LABELS[m], tip: MISTAKE_TIPS[m] }))}
              extra={`Equity ${analysis.equity}%${analysis.potOdds > 0 ? `  ·  Pot odds ${analysis.potOdds}%` : ''}`}
              heroFolded={heroFoldedPreflop}
              villainFolded={false}
              facingLine={null}
              villainOutcomeLine={null}
              colors={colors}
            />

            {/* ── POST-FLOP STREETS ── */}
            {postFlopAnalysisHistory.map((s, i) => {
              const textureInfo   = BOARD_TEXTURE_INFO[s.boardTexture.texture];
              const madeHandColor = MADE_HAND_COLORS[s.madeHand];
              const sv            = sizingVerdictPostFlop(s);
              const heroFolded    = s.heroAction === 'fold';
              const villainFolded = s.villainResponse === 'fold';
              const facingLine    = villainActionLine(s.villainAction, s.villainBetPct, s.villainBetBB);
              const outcomeLine   = villainResponseLine(s.villainResponse, s.villainResponseBetBB);

              return (
                <StreetSection
                  key={`${s.street}-${i}`}
                  streetName={s.street.toUpperCase()}
                  subTitle={`${textureInfo.label} · ${s.boardTexture.boardRankLabels}`}
                  madeHand={s.madeHand}
                  madeHandColor={madeHandColor}
                  isGTO={s.isGTO}
                  yourAction={postFlopActionLabel(s)}
                  gtoAction={postFlopGtoLabel(s)}
                  actionsMatch={s.heroAction === s.gtoAction}
                  sizing={sv}
                  advice={s.advice}
                  mistakes={s.mistakes.map(m => ({ label: MISTAKE_LABELS[m], tip: MISTAKE_TIPS[m] }))}
                  heroFolded={heroFolded}
                  villainFolded={villainFolded}
                  facingLine={facingLine}
                  villainOutcomeLine={outcomeLine}
                  colors={colors}
                />
              );
            })}

            {postFlopAnalysisHistory.length === 0 && !heroFoldedPreflop && (
              <View style={[styles.noStreetsNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text style={[styles.noStreetsText, { color: colors.mutedForeground }]}>
                  Hand ended preflop — no post-flop streets to review.
                </Text>
              </View>
            )}

          </ScrollView>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Feather name="check" size={16} color={colors.primaryForeground} />
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>DONE</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ── Sub-types ────────────────────────────────────────────────────────────────

interface SizingVerdict {
  yourSize: string | null;
  idealSize: string | null;
  good: boolean;
  reason: string | null;
}

interface MistakeItem {
  label: string;
  tip: string;
}

// ── StreetSection ────────────────────────────────────────────────────────────

function StreetSection({
  streetName, subTitle, madeHand, madeHandColor, isGTO,
  yourAction, gtoAction, actionsMatch,
  sizing, advice, mistakes, extra,
  heroFolded, villainFolded, facingLine, villainOutcomeLine,
  colors,
}: {
  streetName: string;
  subTitle?: string;
  madeHand?: string;
  madeHandColor?: string;
  isGTO: boolean;
  yourAction: string;
  gtoAction: string;
  actionsMatch: boolean;
  sizing: SizingVerdict | null;
  advice: string;
  mistakes: MistakeItem[];
  extra?: string;
  heroFolded: boolean;
  villainFolded: boolean;
  facingLine: string | null;
  villainOutcomeLine: string | null;
  colors: any;
}) {
  const gtoColor = heroFolded ? '#E74C3C' : (isGTO ? '#27AE60' : '#E74C3C');

  return (
    <View style={[
      styles.streetBlock,
      { borderColor: heroFolded ? '#E74C3C50' : (villainFolded ? '#27AE6050' : colors.border) },
      heroFolded && { backgroundColor: '#E74C3C08' },
      villainFolded && !heroFolded && { backgroundColor: '#27AE6008' },
    ]}>

      {/* Street header */}
      <View style={styles.streetHeader}>
        <View style={styles.streetHeaderLeft}>
          <Text style={[styles.streetName, { color: colors.foreground }]}>{streetName}</Text>
          {subTitle && (
            <Text style={[styles.streetSub, { color: colors.mutedForeground }]}>{subTitle}</Text>
          )}
          {madeHand && madeHandColor && (
            <View style={[styles.madeHandPill, { backgroundColor: madeHandColor + '20', borderColor: madeHandColor + '50' }]}>
              <Text style={[styles.madeHandPillText, { color: madeHandColor }]}>{madeHand}</Text>
            </View>
          )}
        </View>

        {heroFolded ? (
          <View style={[styles.foldBadge, { backgroundColor: '#E74C3C20', borderColor: '#E74C3C55' }]}>
            <Feather name="x" size={10} color="#E74C3C" />
            <Text style={[styles.foldBadgeText, { color: '#E74C3C' }]}>FOLDED</Text>
          </View>
        ) : (
          <View style={[styles.gtoBadge, { backgroundColor: gtoColor + '18', borderColor: gtoColor + '45' }]}>
            <Feather name={isGTO ? 'check' : 'alert-triangle'} size={10} color={gtoColor} />
            <Text style={[styles.gtoBadgeText, { color: gtoColor }]}>{isGTO ? 'GTO' : 'Improve'}</Text>
          </View>
        )}
      </View>

      {/* Facing context — only when villain bet or raised first */}
      {facingLine && (
        <View style={[styles.facingRow, { backgroundColor: '#E74C3C12', borderColor: '#E74C3C30' }]}>
          <Feather name="alert-circle" size={11} color="#E74C3C" />
          <Text style={[styles.facingText, { color: colors.foreground }]}>
            <Text style={{ fontWeight: '800', color: '#E74C3C' }}>Facing: </Text>
            {facingLine}
          </Text>
        </View>
      )}

      {/* Hero folded — large prominent banner */}
      {heroFolded ? (
        <View style={[styles.heroFoldBanner, { borderColor: '#E74C3C40' }]}>
          <View style={styles.heroFoldBannerTop}>
            <Feather name="x-circle" size={18} color="#E74C3C" />
            <Text style={styles.heroFoldBannerTitle}>YOU FOLDED — HAND ENDED HERE</Text>
          </View>
          {advice ? (
            <Text style={[styles.heroFoldBannerAdvice, { color: colors.foreground }]}>{advice}</Text>
          ) : null}
          {mistakes.length > 0 && (
            <View style={styles.foldMistakesRow}>
              {mistakes.map((m, i) => (
                <View key={i} style={styles.foldMistakePill}>
                  <Feather name="alert-triangle" size={9} color="#E74C3C" />
                  <Text style={styles.foldMistakePillText}>{m.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          {/* YOUR ACTION / GTO PLAY two-column row */}
          <View style={[styles.actionRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.actionHalf}>
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>YOUR ACTION</Text>
              <Text style={[styles.actionValue, { color: isGTO ? '#27AE60' : '#E74C3C' }]} numberOfLines={2}>
                {yourAction}
              </Text>
            </View>
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.actionHalf}>
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>GTO PLAY</Text>
              <Text style={[styles.actionValue, { color: '#27AE60' }]} numberOfLines={2}>
                {actionsMatch ? '✓ ' : ''}{gtoAction}
              </Text>
            </View>
          </View>

          {/* Villain folded banner */}
          {villainFolded && (
            <View style={styles.villainFoldBanner}>
              <Feather name="check-circle" size={15} color="#27AE60" />
              <View style={{ flex: 1 }}>
                <Text style={styles.villainFoldTitle}>VILLAIN FOLDED — Pot won</Text>
                <Text style={[styles.villainFoldSub, { color: colors.mutedForeground }]}>
                  Your bet had fold equity — villain gave up the hand.
                </Text>
              </View>
            </View>
          )}

          {/* Villain outcome line (called / raised) */}
          {!villainFolded && villainOutcomeLine && (
            <View style={[styles.outcomeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="user" size={11} color={colors.mutedForeground} />
              <Text style={[styles.outcomeText, { color: colors.foreground }]}>
                <Text style={[styles.outcomeKey, { color: colors.mutedForeground }]}>Outcome: </Text>
                {villainOutcomeLine}
              </Text>
            </View>
          )}

          {/* Sizing comparison */}
          {sizing && (
            <View style={[
              styles.sizingRow,
              { backgroundColor: sizing.good ? '#27AE6010' : '#E67E2210', borderColor: sizing.good ? '#27AE6030' : '#E67E2230' },
            ]}>
              <View style={styles.sizingHeader}>
                <Feather name="sliders" size={11} color={sizing.good ? '#27AE60' : '#E67E22'} />
                <Text style={[styles.sizingTitle, { color: sizing.good ? '#27AE60' : '#E67E22' }]}>
                  RAISE / BET SIZE
                </Text>
              </View>
              <View style={styles.sizingValues}>
                {sizing.yourSize && (
                  <View style={styles.sizingItem}>
                    <Text style={[styles.sizingKey, { color: colors.mutedForeground }]}>You</Text>
                    <Text style={[styles.sizingVal, { color: sizing.good ? '#27AE60' : '#E74C3C' }]}>
                      {sizing.yourSize}
                    </Text>
                  </View>
                )}
                {sizing.idealSize && (
                  <View style={styles.sizingItem}>
                    <Text style={[styles.sizingKey, { color: colors.mutedForeground }]}>Ideal</Text>
                    <Text style={[styles.sizingVal, { color: '#27AE60' }]}>{sizing.idealSize}</Text>
                  </View>
                )}
              </View>
              {sizing.reason && (
                <Text style={[styles.sizingReason, { color: colors.foreground }]}>{sizing.reason}</Text>
              )}
            </View>
          )}

          {/* Advice */}
          <Text style={[styles.advice, { color: colors.foreground }]}>{advice}</Text>

          {/* Extra info */}
          {extra && (
            <Text style={[styles.extra, { color: colors.mutedForeground }]}>{extra}</Text>
          )}

          {/* Mistakes */}
          {mistakes.length > 0 && (
            <View style={styles.mistakesContainer}>
              {mistakes.map((m, i) => (
                <View key={i} style={[styles.mistakeRow, { backgroundColor: '#E74C3C10', borderColor: '#E74C3C25' }]}>
                  <View style={styles.mistakeHeader}>
                    <Feather name="alert-circle" size={11} color="#E74C3C" />
                    <Text style={styles.mistakeLabel}>{m.label}</Text>
                  </View>
                  <Text style={[styles.mistakeTip, { color: colors.foreground }]}>{m.tip}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:     { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingBottom: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle:     { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  handPill:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  handPillText:    { fontSize: 13, fontWeight: '800' },
  villainPill:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  villainPillText: { fontSize: 11, fontWeight: '700' },

  scoreBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1,
  },
  scoreText: { fontSize: 12, fontWeight: '700', flex: 1 },

  body:        { flex: 1 },
  bodyContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 10 },

  noStreetsNote: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  noStreetsText: { fontSize: 13, flex: 1 },

  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, paddingVertical: 15, borderRadius: 14,
  },
  doneBtnText: { fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  // ── Street block
  streetBlock: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 12,
    gap: 9,
  },
  streetHeader:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  streetHeaderLeft: { flex: 1, gap: 4 },
  streetName:       { fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  streetSub:        { fontSize: 11, fontWeight: '600' },
  madeHandPill: {
    alignSelf: 'flex-start', borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  madeHandPillText: { fontSize: 10, fontWeight: '700' },

  foldBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 7, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  foldBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  gtoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 7, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  gtoBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // Facing villain bet row
  facingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
  },
  facingText: { fontSize: 12, lineHeight: 17, flex: 1 },

  // Hero fold banner
  heroFoldBanner: {
    borderRadius: 10, borderWidth: 1.5,
    backgroundColor: '#E74C3C12',
    padding: 12, gap: 8,
  },
  heroFoldBannerTop: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  heroFoldBannerTitle: {
    fontSize: 14, fontWeight: '900', color: '#E74C3C', flex: 1, letterSpacing: 0.3,
  },
  heroFoldBannerAdvice: { fontSize: 13, lineHeight: 19 },
  foldMistakesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  foldMistakePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E74C3C20', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  foldMistakePillText: { fontSize: 10, fontWeight: '700', color: '#E74C3C' },

  // Villain fold banner
  villainFoldBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: '#27AE6050',
    backgroundColor: '#27AE6012',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  villainFoldTitle: { fontSize: 13, fontWeight: '900', color: '#27AE60', marginBottom: 2 },
  villainFoldSub:   { fontSize: 11, lineHeight: 16 },

  // Outcome row (called/raised)
  outcomeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7,
  },
  outcomeText: { fontSize: 12, flex: 1 },
  outcomeKey:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  actionRow: {
    flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden',
  },
  actionHalf:    { flex: 1, paddingHorizontal: 11, paddingVertical: 9, gap: 3 },
  actionDivider: { width: 1 },
  actionLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  actionValue:   { fontSize: 13, fontWeight: '800', lineHeight: 17 },

  sizingRow:    { borderRadius: 10, borderWidth: 1, padding: 11, gap: 7 },
  sizingHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sizingTitle:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  sizingValues: { flexDirection: 'row', gap: 18 },
  sizingItem:   { gap: 2 },
  sizingKey:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  sizingVal:    { fontSize: 14, fontWeight: '800' },
  sizingReason: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },

  advice: { fontSize: 13, lineHeight: 19 },
  extra:  { fontSize: 11, fontWeight: '600' },

  mistakesContainer: { gap: 6 },
  mistakeRow: { borderRadius: 8, borderWidth: 1, padding: 9, gap: 4 },
  mistakeHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mistakeLabel: { fontSize: 11, fontWeight: '800', color: '#E74C3C' },
  mistakeTip:   { fontSize: 12, lineHeight: 17 },
});
