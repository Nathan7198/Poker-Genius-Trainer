import React, { useState } from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame, PostFlopHeroAction } from '@/context/GameContext';
import { useColors } from '@/hooks/useColors';
import {
  calcPotOdds, getEquity, getHandNotation, getHandStrength, STRENGTH_COLORS,
  evaluateMadeHand, analyzeBoardTexture, getCbetRecommendation,
  MADE_HAND_COLORS, BOARD_TEXTURE_INFO,
} from '@/constants/pokerData';

const RAISE_PRESETS = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
const BET_PCT_PRESETS = [25, 33, 50, 66, 75, 100, 150];

export default function ActionPanel() {
  const { state, heroAct, heroPostFlopAct } = useGame();
  const colors = useColors();
  const [raiseMode, setRaiseMode] = useState(false);
  const [betMode, setBetMode] = useState(false);
  const [selectedRaise, setSelectedRaise] = useState(3);
  const [selectedBetPct, setSelectedBetPct] = useState(50);

  const isPreflop = state.phase === 'preflop';
  const isPostFlop = ['flop', 'turn', 'river'].includes(state.phase);
  const visible = (isPreflop || isPostFlop) && !state.showAnalysis;

  // Reset bet/raise mode when phase changes
  React.useEffect(() => { setRaiseMode(false); setBetMode(false); }, [state.phase]);

  if (!visible) return null;

  const { actionCtx, heroCards, heroPosition, difficulty, villainPostFlopAction, heroIsAggressor } = state;
  const board = state.communityCards.filter(c => c.faceUp);

  const notation = heroCards.length === 2 ? getHandNotation(heroCards[0], heroCards[1]) : '';
  const preflopEquity = notation ? getEquity(notation) : 50;
  const preflopStrength = notation ? getHandStrength(notation) : 'Weak';
  const potOdds = calcPotOdds(actionCtx.raiseAmount, actionCtx.potSize);
  const showInfo = difficulty === 'Beginner' || difficulty === 'Intermediate';
  const showSuggestion = difficulty === 'Beginner';

  // Post-flop evaluations
  const madeHandResult = isPostFlop && heroCards.length === 2 && board.length >= 3
    ? evaluateMadeHand(heroCards, board)
    : null;
  const boardTexture = isPostFlop && board.length >= 3 ? analyzeBoardTexture(board) : null;
  const facingVillainBet = isPostFlop && villainPostFlopAction?.action === 'bet';
  const cbetRec = isPostFlop && boardTexture && madeHandResult
    ? getCbetRecommendation(boardTexture.texture, madeHandResult.rank, heroIsAggressor, facingVillainBet ?? false)
    : null;

  function haptic() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }

  function handlePreflop(a: 'fold'|'call'|'check'|'raise'|'limp', raiseBB?: number) {
    haptic();
    heroAct(a, raiseBB);
    setRaiseMode(false);
  }

  function handlePostFlop(a: PostFlopHeroAction, betPct?: number) {
    haptic();
    heroPostFlopAct(a, betPct);
    setBetMode(false);
  }

  const preflopGtoRec = (() => {
    if (!notation || !isPreflop) return null;
    const { GTO_RANGES, BB_DEFENSE } = require('@/constants/pokerData');
    if (!actionCtx.facingRaise) return GTO_RANGES[heroPosition].has(notation) ? 'RAISE' : 'FOLD';
    if (heroPosition === 'BB') return BB_DEFENSE.has(notation) ? 'CALL/3BET' : 'FOLD';
    return preflopEquity >= potOdds ? 'CALL' : 'FOLD';
  })();

  // ── PREFLOP PANEL ──────────────────────────────────────────────────────────
  if (isPreflop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {showInfo && notation && (
          <View style={styles.infoRow}>
            <InfoCell label="HAND" value={notation} sub={preflopStrength} valueColor={STRENGTH_COLORS[preflopStrength]} />
            {actionCtx.facingRaise && (
              <InfoCell label="POT ODDS" value={`${potOdds}%`} sub="need to call" valueColor={colors.primary} />
            )}
            <InfoCell
              label="EQUITY"
              value={`${preflopEquity}%`}
              sub="vs random"
              valueColor={preflopEquity > 55 ? colors.success : preflopEquity > 48 ? colors.warning : '#E74C3C'}
            />
            {showSuggestion && preflopGtoRec && (
              <InfoCell
                label="GTO"
                value={preflopGtoRec}
                valueColor={preflopGtoRec.includes('RAISE') || preflopGtoRec.includes('CALL') ? '#27AE60' : '#E74C3C'}
              />
            )}
          </View>
        )}

        {actionCtx.facingRaise && (
          <View style={[styles.contextBanner, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
              {actionCtx.raisedByPosition
                ? `${actionCtx.raisedByPosition} raised to ${actionCtx.raiseAmount}BB`
                : `Facing ${actionCtx.raiseAmount}BB raise`}
              {actionCtx.calledByCount > 0 ? ` · ${actionCtx.calledByCount} caller(s)` : ''}
            </Text>
          </View>
        )}

        {raiseMode ? (
          <View style={styles.sizingPanel}>
            <Text style={[styles.sizingLabel, { color: colors.mutedForeground }]}>SELECT RAISE SIZE (BB)</Text>
            <View style={styles.presetGrid}>
              {RAISE_PRESETS.map(bb => (
                <TouchableOpacity
                  key={bb}
                  style={[styles.preset, { backgroundColor: selectedRaise === bb ? colors.primary : '#1B3A1E', borderColor: selectedRaise === bb ? colors.primary : '#2D5030' }]}
                  onPress={() => setSelectedRaise(bb)}
                >
                  <Text style={[styles.presetText, { color: selectedRaise === bb ? colors.primaryForeground : colors.foreground }]}>
                    {bb}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => handlePreflop('raise', selectedRaise)}
            >
              <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                RAISE TO {selectedRaise}BB
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRaiseMode(false)} style={styles.cancelRow}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, styles.foldBtn]} onPress={() => handlePreflop('fold')}>
              <Text style={styles.btnText}>FOLD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.callBtn, { flex: 1 }]}
              onPress={() => handlePreflop(actionCtx.facingRaise ? 'call' : 'check')}
            >
              <Text style={styles.btnText}>
                {actionCtx.facingRaise ? `CALL ${actionCtx.raiseAmount}BB` : 'CHECK'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.raiseBtn]} onPress={() => setRaiseMode(true)}>
              <Text style={styles.btnText}>{actionCtx.facingRaise ? '3-BET' : 'RAISE'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── POST-FLOP PANEL ────────────────────────────────────────────────────────
  const streetLabel = state.phase.charAt(0).toUpperCase() + state.phase.slice(1);
  const potBB = Math.round(state.pot * 10) / 10;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Board + made hand info */}
      {showInfo && madeHandResult && boardTexture && (
        <View style={styles.postFlopInfoRow}>
          {/* Board texture */}
          <View style={[styles.textureCard, { backgroundColor: boardTexture.color + '18', borderColor: boardTexture.color + '50' }]}>
            <Text style={[styles.textureLine, { color: boardTexture.color }]}>
              {boardTexture.label.toUpperCase()}
            </Text>
            <Text style={[styles.textureBoard, { color: colors.mutedForeground }]}>
              {boardTexture.boardRankLabels}
            </Text>
          </View>
          {/* Made hand */}
          <View style={[styles.madeHandCard, { backgroundColor: MADE_HAND_COLORS[madeHandResult.hand] + '18', borderColor: MADE_HAND_COLORS[madeHandResult.hand] + '50' }]}>
            <Text style={[styles.madeHandName, { color: MADE_HAND_COLORS[madeHandResult.hand] }]}>
              {madeHandResult.hand.toUpperCase()}
            </Text>
            <Text style={[styles.madeHandSub, { color: colors.mutedForeground }]}>Made hand</Text>
          </View>
          {/* C-bet recommendation */}
          {showSuggestion && cbetRec && (
            <View style={[styles.recCard, { backgroundColor: cbetRec.action === 'bet' ? '#27AE6020' : '#3498DB20', borderColor: cbetRec.action === 'bet' ? '#27AE6050' : '#3498DB50' }]}>
              <Text style={[styles.recAction, { color: cbetRec.action === 'bet' ? '#27AE60' : '#3498DB' }]}>
                {cbetRec.action === 'bet' ? `BET ${cbetRec.sizingPct}%` : 'CHECK'}
              </Text>
              <Text style={[styles.recSub, { color: colors.mutedForeground }]}>GTO line</Text>
            </View>
          )}
        </View>
      )}

      {/* Villain action banner */}
      {facingVillainBet && villainPostFlopAction && (
        <View style={[styles.contextBanner, { backgroundColor: '#8A6D2815', borderColor: '#8A6D2840', borderWidth: 1 }]}>
          <Text style={[styles.contextText, { color: '#E5C76B' }]}>
            Villain bets {villainPostFlopAction.betPct}% pot ({villainPostFlopAction.betBB}BB)
            {showInfo ? ` · Pot odds: ${calcPotOdds(villainPostFlopAction.betBB, state.pot)}%` : ''}
          </Text>
        </View>
      )}
      {!facingVillainBet && isPostFlop && (
        <View style={[styles.contextBanner, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
            Villain checks · Pot: {potBB}BB · {streetLabel}
          </Text>
        </View>
      )}

      {/* Bet sizing panel */}
      {betMode ? (
        <View style={styles.sizingPanel}>
          <Text style={[styles.sizingLabel, { color: colors.mutedForeground }]}>
            BET SIZE (% of {potBB}BB pot)
          </Text>
          <View style={styles.presetGrid}>
            {BET_PCT_PRESETS.map(pct => {
              const bbAmt = Math.round((pct / 100) * state.pot * 10) / 10;
              return (
                <TouchableOpacity
                  key={pct}
                  style={[styles.preset, { backgroundColor: selectedBetPct === pct ? '#8A6D28' : '#1B3A1E', borderColor: selectedBetPct === pct ? '#C9A84C' : '#2D5030' }]}
                  onPress={() => setSelectedBetPct(pct)}
                >
                  <Text style={[styles.presetText, { color: selectedBetPct === pct ? '#FFF' : colors.foreground }]}>
                    {pct}%
                  </Text>
                  <Text style={[styles.presetSub, { color: selectedBetPct === pct ? '#F0D89080' : colors.mutedForeground }]}>
                    {bbAmt}BB
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: '#8A6D28' }]}
            onPress={() => handlePostFlop('bet', selectedBetPct)}
          >
            <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>
              BET {selectedBetPct}% ({Math.round((selectedBetPct / 100) * state.pot * 10) / 10}BB)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBetMode(false)} style={styles.cancelRow}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttons}>
          {facingVillainBet ? (
            <>
              <TouchableOpacity style={[styles.btn, styles.foldBtn, { flex: 0.7 }]} onPress={() => handlePostFlop('fold')}>
                <Text style={styles.btnText}>FOLD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.callBtn, { flex: 1 }]}
                onPress={() => handlePostFlop('call')}
              >
                <Text style={styles.btnText}>
                  CALL {villainPostFlopAction?.betBB}BB
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.raiseBtn, { flex: 0.85 }]} onPress={() => setBetMode(true)}>
                <Text style={styles.btnText}>RAISE</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.btn, styles.callBtn, { flex: 1 }]} onPress={() => handlePostFlop('check')}>
                <Text style={styles.btnText}>CHECK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.raiseBtn, { flex: 1 }]} onPress={() => setBetMode(true)}>
                <Text style={styles.btnText}>BET</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function InfoCell({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={[styles.infoCellValue, { color: valueColor ?? '#FFF' }]}>{value}</Text>
      {sub && <Text style={styles.infoCellSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  infoCell: { alignItems: 'center', minWidth: 60 },
  infoCellLabel: { fontSize: 8, color: '#7A9E7A', fontWeight: '700', letterSpacing: 0.5, marginBottom: 1 },
  infoCellValue: { fontSize: 18, fontWeight: '800' },
  infoCellSub: { fontSize: 8, color: '#7A9E7A', fontWeight: '500' },

  postFlopInfoRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  textureCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  textureLine: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  textureBoard: { fontSize: 9, marginTop: 2 },
  madeHandCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  madeHandName: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
  madeHandSub: { fontSize: 8, marginTop: 2 },
  recCard: {
    flex: 0.8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recAction: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  recSub: { fontSize: 8, marginTop: 2 },

  contextBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contextText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  sizingPanel: { paddingHorizontal: 12, paddingTop: 8 },
  sizingLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  preset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: { fontSize: 12, fontWeight: '700' },
  presetSub: { fontSize: 8, fontWeight: '500' },
  confirmBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginBottom: 4 },
  confirmBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  cancelRow: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 13, fontWeight: '600' },

  buttons: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 4 },
  btn: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  foldBtn: { backgroundColor: '#7F3F3F', flex: 0.8 },
  callBtn: { backgroundColor: '#1B5EA6' },
  raiseBtn: { backgroundColor: '#8A6D28', flex: 0.9 },
});
