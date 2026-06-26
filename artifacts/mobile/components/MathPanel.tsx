import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/useColors';
import {
  getEquity, calcPotOdds, getHandNotation, countDrawOuts,
  evaluateMadeHand, MADE_HAND_COLORS,
} from '@/constants/pokerData';

function Row({ label, value, valueColor, sub }: { label: string; value: string; valueColor?: string; sub?: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionHeader, { color }]}>{title}</Text>;
}

export default function MathPanel() {
  const { state } = useGame();
  const colors = useColors();

  const { phase, heroCards, communityCards, pot, currentBet, heroStack, actionCtx } = state;
  const isPreflop = phase === 'preflop';
  const isPostflop = phase === 'flop' || phase === 'turn' || phase === 'river';
  if (!isPreflop && !isPostflop) return null;
  if (heroCards.length < 2) return null;

  const board = communityCards.filter(c => c.faceUp);

  // ── Preflop equity ─────────────────────────────────────────────────────────
  const handNotation = getHandNotation(heroCards[0], heroCards[1]);
  const preflopEquity = getEquity(handNotation);

  // ── Pot odds ───────────────────────────────────────────────────────────────
  const facingRaise = actionCtx.facingRaise;
  const callAmount = facingRaise
    ? Math.max(0, actionCtx.raiseAmount - (actionCtx.heroAlreadyIn ?? 0))
    : (isPreflop && state.heroPosition === 'BB' ? 0 : 0);
  const potOdds = facingRaise && callAmount > 0 ? calcPotOdds(callAmount, pot) : 0;

  // ── Postflop draw / made hand ──────────────────────────────────────────────
  const madeHandResult = useMemo(() => {
    if (board.length >= 3) return evaluateMadeHand(heroCards, board);
    return null;
  }, [heroCards, board]);

  const drawInfo = useMemo(() => {
    if (board.length >= 3 && phase !== 'river') {
      return countDrawOuts(heroCards, board, phase as 'flop' | 'turn');
    }
    return null;
  }, [heroCards, board, phase]);

  // ── Equity to use for EV calc ─────────────────────────────────────────────
  const effectiveEquity = isPostflop && drawInfo && drawInfo.outs > 0
    ? drawInfo.equity
    : preflopEquity;

  // ── EV of calling ─────────────────────────────────────────────────────────
  const evCall = callAmount > 0
    ? Math.round(((effectiveEquity / 100) * (pot + callAmount) - callAmount) * 10) / 10
    : null;
  const evPositive = evCall !== null && evCall >= 0;

  // ── SPR ───────────────────────────────────────────────────────────────────
  const spr = pot > 0 ? Math.round((heroStack / pot) * 10) / 10 : null;
  const sprLabel = spr === null ? '' : spr >= 13 ? 'Deep — many post-flop streets ahead'
    : spr >= 4 ? 'Medium — commit with top pair or better'
    : 'Low — ready to get all-in, be selective';

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: '#3B82F620' }]}>
      <Text style={[styles.title, { color: '#3B82F6' }]}>POKER MATH</Text>

      {/* ── YOUR HAND ─────────────────────────────────────────────────── */}
      <SectionHeader title="YOUR HAND" color={colors.mutedForeground} />
      <Row
        label="Hand"
        value={handNotation}
        valueColor={colors.foreground}
        sub="notation: suited = 's', offsuit = 'o', pair = no suffix"
      />
      <Row
        label="Preflop equity"
        value={`${preflopEquity}%`}
        valueColor={preflopEquity >= 60 ? '#27AE60' : preflopEquity >= 50 ? '#E67E22' : '#E74C3C'}
        sub={`vs a random hand. Above 50% = ahead of average`}
      />

      {/* ── MADE HAND (postflop) ───────────────────────────────────────── */}
      {madeHandResult && (
        <>
          <Divider />
          <SectionHeader title="MADE HAND" color={colors.mutedForeground} />
          <Row
            label="Hand rank"
            value={madeHandResult.hand}
            valueColor={MADE_HAND_COLORS[madeHandResult.hand]}
            sub={`Rank score: ${madeHandResult.rank} (higher = stronger)`}
          />
        </>
      )}

      {/* ── DRAW OUTS (rule of 2/4) ────────────────────────────────────── */}
      {drawInfo && drawInfo.outs > 0 && (
        <>
          <Divider />
          <SectionHeader title="DRAW OUTS  (Rule of 2 / Rule of 4)" color={colors.mutedForeground} />
          <Row label="Draw type" value={drawInfo.label} valueColor="#3498DB" />
          <Row
            label="Outs"
            value={`${drawInfo.outs} cards`}
            valueColor={colors.foreground}
            sub="Cards left in the deck that complete your draw"
          />
          <Row
            label="Equity from draw"
            value={`~${drawInfo.equity}%`}
            valueColor="#3498DB"
            sub={phase === 'flop'
              ? `Outs × 4 = ${drawInfo.outs} × 4 = ${drawInfo.equity}% (2 cards to come)`
              : `Outs × 2 = ${drawInfo.outs} × 2 = ${drawInfo.equity}% (1 card to come)`}
          />
        </>
      )}

      {/* ── POT ODDS ─────────────────────────────────────────────────── */}
      {facingRaise && callAmount > 0 && (
        <>
          <Divider />
          <SectionHeader title="POT ODDS" color={colors.mutedForeground} />
          <Row
            label="Call amount"
            value={`${callAmount.toFixed(1)}BB`}
            valueColor={colors.foreground}
          />
          <Row
            label="Pot after call"
            value={`${(pot + callAmount).toFixed(1)}BB`}
            valueColor={colors.foreground}
          />
          <Row
            label="Pot odds"
            value={`${potOdds}%`}
            valueColor={colors.foreground}
            sub={`${callAmount.toFixed(1)} ÷ ${(pot + callAmount).toFixed(1)} = ${potOdds}%`}
          />
          <Row
            label="Equity needed"
            value={`> ${potOdds}%`}
            valueColor={effectiveEquity >= potOdds ? '#27AE60' : '#E74C3C'}
            sub={`Your equity (${effectiveEquity}%) ${effectiveEquity >= potOdds ? '≥' : '<'} ${potOdds}% required → call is ${effectiveEquity >= potOdds ? '+EV' : '–EV'}`}
          />
        </>
      )}

      {/* ── EXPECTED VALUE ───────────────────────────────────────────── */}
      {evCall !== null && (
        <>
          <Divider />
          <SectionHeader title="EXPECTED VALUE (EV)" color={colors.mutedForeground} />
          <Row
            label="EV formula"
            value=""
            sub={`(Equity × Pot) − Call = EV`}
          />
          <Row
            label="EV(call)"
            value={`${evCall >= 0 ? '+' : ''}${evCall}BB`}
            valueColor={evPositive ? '#27AE60' : '#E74C3C'}
            sub={`(${effectiveEquity}% × ${(pot + callAmount).toFixed(1)}BB) − ${callAmount.toFixed(1)}BB`}
          />
          <Row
            label="EV(fold)"
            value="0BB"
            valueColor={colors.mutedForeground}
            sub="Folding always has 0 EV — it's the baseline"
          />
          <View style={[styles.verdict, { backgroundColor: evPositive ? '#27AE6018' : '#E74C3C18', borderColor: evPositive ? '#27AE6055' : '#E74C3C55' }]}>
            <Text style={[styles.verdictText, { color: evPositive ? '#27AE60' : '#E74C3C' }]}>
              {evPositive ? `CALL IS +EV  (+${evCall}BB expected profit)` : `FOLD IS CORRECT  (${evCall}BB if you call)`}
            </Text>
          </View>
        </>
      )}

      {/* ── SPR (postflop) ────────────────────────────────────────────── */}
      {spr !== null && isPostflop && (
        <>
          <Divider />
          <SectionHeader title="STACK-TO-POT RATIO (SPR)" color={colors.mutedForeground} />
          <Row
            label="SPR"
            value={`${spr}`}
            valueColor={spr < 4 ? '#E74C3C' : spr < 13 ? '#E67E22' : '#27AE60'}
            sub={`Stack (${heroStack.toFixed(1)}BB) ÷ Pot (${pot.toFixed(1)}BB) = ${spr}`}
          />
          <Text style={[styles.sprNote, { color: colors.mutedForeground }]}>{sprLabel}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, borderWidth: 1,
    padding: 14, marginHorizontal: 12, marginTop: 8,
  },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  sectionHeader: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  rowLabel: { fontSize: 11, fontWeight: '600', flex: 1, paddingRight: 8 },
  rowRight: { flex: 1.4, alignItems: 'flex-end' },
  rowValue: { fontSize: 12, fontWeight: '800', textAlign: 'right' },
  rowSub: { fontSize: 9, textAlign: 'right', lineHeight: 13, marginTop: 1 },
  divider: { height: 1, marginVertical: 8 },
  verdict: { borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 6, alignItems: 'center' },
  verdictText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
  sprNote: { fontSize: 10, lineHeight: 14, marginTop: 3 },
});
