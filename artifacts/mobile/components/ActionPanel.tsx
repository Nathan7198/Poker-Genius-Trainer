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
  GTO_POSITION_INFO, getPostFlopEquity, getPreflopGTOVerdict,
  GTO_RANGES, BB_DEFENSE,
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
  // Hide the panel after the current street's action is complete — prevents re-acting on
  // the same street if the user taps X to dismiss the analysis instead of "Deal Turn".
  const postFlopAlreadyDone = isPostFlop && state.postFlopStreetsDone.includes(state.phase as 'flop' | 'turn' | 'river');
  const visible = (isPreflop || isPostFlop) && !state.showAnalysis && !postFlopAlreadyDone;

  // Reset bet/raise mode when phase changes
  React.useEffect(() => { setRaiseMode(false); setBetMode(false); }, [state.phase]);

  if (!visible) return null;

  const { actionCtx, heroCards, heroPosition, difficulty, villainPostFlopAction, heroIsAggressor, heroActsFirst, heroCheckedStreet, mainVillainPosition } = state;
  const board = state.communityCards.filter(c => c.faceUp);
  const isGTOMode = state.trainingMode === 'gto';

  const notation = heroCards.length === 2 ? getHandNotation(heroCards[0], heroCards[1]) : '';
  const preflopEquity = notation ? getEquity(notation) : 50;
  const preflopStrength = notation ? getHandStrength(notation) : 'Weak';
  const heroAlreadyIn = heroPosition === 'BB' ? 1 : heroPosition === 'SB' ? 0.5 : 0;
  // Maximum total chips hero can put in this hand (blind already posted + remaining stack)
  const heroMaxCommit = Math.round((heroAlreadyIn + state.heroStack) * 10) / 10;
  // Effective call amount — capped at what hero actually has
  const preflopCallAmt = Math.min(actionCtx.facingRaise ? actionCtx.raiseAmount : 1, heroMaxCommit);
  const preflopCallAllIn = preflopCallAmt >= heroMaxCommit && heroMaxCommit < (actionCtx.facingRaise ? actionCtx.raiseAmount : 1);
  // Post-flop effective call — capped at heroStack (blinds already accounted for in stack)
  const postFlopCallAmt = Math.min(villainPostFlopAction?.betBB ?? 0, state.heroStack);
  const postFlopCallAllIn = postFlopCallAmt >= state.heroStack && state.heroStack < (villainPostFlopAction?.betBB ?? 0);
  const potOdds = calcPotOdds(Math.max(0, actionCtx.raiseAmount - heroAlreadyIn), actionCtx.potSize);
  // Classic info row — shown at Beginner/Intermediate regardless of mode
  const showInfo       = difficulty === 'Beginner' || difficulty === 'Intermediate';
  const showSuggestion = difficulty === 'Beginner';
  // Advanced non-GTO: show pot odds only (no equity — user must estimate it)
  const showPotOddsHint = difficulty === 'Advanced' && !isGTOMode;

  // GTO panel visibility and detail level
  const gtoShowPanel      = isGTOMode && difficulty !== 'Expert';
  const gtoShowHandStatus = difficulty === 'Beginner' || difficulty === 'Intermediate';
  const gtoShowActionRec  = difficulty === 'Beginner';
  const gtoShowTip        = difficulty === 'Beginner' || difficulty === 'Intermediate';

  // Post-flop evaluations
  const madeHandResult = isPostFlop && heroCards.length === 2 && board.length >= 3
    ? evaluateMadeHand(heroCards, board)
    : null;
  const boardTexture = isPostFlop && board.length >= 3 ? analyzeBoardTexture(board) : null;
  // 'bet' is the only opening action villain can take (raise/fold/call are responses to hero)
  const facingVillainBet = isPostFlop &&
    (villainPostFlopAction?.action === 'bet' || villainPostFlopAction?.action === 'raise');
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
    if (!actionCtx.facingRaise) return GTO_RANGES[heroPosition].has(notation) ? 'RAISE' : 'FOLD';
    if (heroPosition === 'BB') return BB_DEFENSE.has(notation) ? 'CALL/3BET' : 'FOLD';
    return preflopEquity >= potOdds ? 'CALL' : 'FOLD';
  })();

  // ── GTO Coach data (computed once, used in both panels) ────────────────────
  const gtoVerdict = isGTOMode && notation && isPreflop
    ? getPreflopGTOVerdict(notation, heroPosition, actionCtx.facingRaise, potOdds, preflopEquity, false)
    : null;
  const posInfo = GTO_POSITION_INFO[heroPosition];

  // ── PREFLOP PANEL ──────────────────────────────────────────────────────────
  if (isPreflop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>

        {/* GTO Coach panel — detail level controlled by difficulty */}
        {gtoShowPanel && notation && (
          <View style={styles.gtoPanel}>
            <Text style={styles.gtoPanelHeader}>GTO COACH  ·  PREFLOP</Text>
            <View style={styles.gtoStatRow}>
              <GTOStat label="POSITION" value={heroPosition} sub={`${posInfo.rangeSize}% range`} />
              {gtoShowHandStatus && (
                <GTOStat
                  label="HAND STATUS"
                  value={posInfo.rangeSize > 0 && GTO_RANGES[heroPosition].has(notation) ? 'In Range' : 'Out of Range'}
                  color={posInfo.rangeSize > 0 && GTO_RANGES[heroPosition].has(notation) ? '#27AE60' : '#E74C3C'}
                  sub={`vs ${posInfo.rangeSize}% open`}
                />
              )}
              {actionCtx.facingRaise ? (
                <GTOStat label="POT ODDS" value={`${potOdds}%`} sub="equity needed" color="#F39C12" />
              ) : gtoShowHandStatus ? (
                <GTOStat label="OPEN SIZE" value={heroPosition === 'BB' ? 'Defend' : `${posInfo.openSize}BB`} sub="GTO size" />
              ) : null}
              {gtoShowActionRec && (
                <GTOStat
                  label="ACTION"
                  value={gtoVerdict?.action.toUpperCase() ?? '—'}
                  color={gtoVerdict?.action === 'raise' ? '#27AE60' : gtoVerdict?.action === 'call' ? '#3498DB' : '#E74C3C'}
                />
              )}
            </View>
            {gtoShowTip && (
              <View style={styles.gtoTipBox}>
                <Text style={styles.gtoTipText} numberOfLines={3} ellipsizeMode="tail">
                  {gtoVerdict ? gtoVerdict.reason : posInfo.positionTip}
                </Text>
              </View>
            )}
          </View>
        )}

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

        {/* Advanced non-GTO: pot odds only when facing a raise */}
        {showPotOddsHint && actionCtx.facingRaise && notation && (
          <View style={styles.infoRow}>
            <InfoCell label="POT ODDS" value={`${potOdds}%`} sub="need to call" valueColor={colors.primary} />
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
              {RAISE_PRESETS.filter(bb => bb < heroMaxCommit).map(bb => (
                <TouchableOpacity
                  key={bb}
                  style={[styles.preset, { backgroundColor: selectedRaise === bb ? colors.primary : '#1A1A1A', borderColor: selectedRaise === bb ? colors.primary : '#282828' }]}
                  onPress={() => setSelectedRaise(bb)}
                >
                  <Text style={[styles.presetText, { color: selectedRaise === bb ? colors.primaryForeground : colors.foreground }]}>
                    {bb}BB
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                key="allin"
                style={[styles.preset, { backgroundColor: selectedRaise === heroMaxCommit ? '#7B241C' : '#1A1A1A', borderColor: selectedRaise === heroMaxCommit ? '#E74C3C' : '#282828' }]}
                onPress={() => setSelectedRaise(heroMaxCommit)}
              >
                <Text style={[styles.presetText, { color: selectedRaise === heroMaxCommit ? '#FFF' : colors.foreground }]}>ALL IN</Text>
                <Text style={[styles.presetSub, { color: selectedRaise === heroMaxCommit ? '#FF9999' : colors.mutedForeground }]}>{heroMaxCommit}BB</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: selectedRaise >= heroMaxCommit ? '#7B241C' : colors.primary }]}
              onPress={() => handlePreflop('raise', Math.min(selectedRaise, heroMaxCommit))}
            >
              <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                {selectedRaise >= heroMaxCommit ? `ALL IN — ${heroMaxCommit}BB` : `RAISE TO ${selectedRaise}BB`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRaiseMode(false)} style={styles.cancelRow}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttons}>
            {!(heroPosition === 'BB' && !actionCtx.facingRaise) && (
              <TouchableOpacity style={[styles.btn, styles.foldBtn]} onPress={() => handlePreflop('fold')}>
                <Text style={styles.btnText}>FOLD</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.callBtn, { flex: 1 }]}
              onPress={() => handlePreflop(
                !actionCtx.facingRaise && heroPosition === 'BB' ? 'check' : 'call'
              )}
            >
              <Text style={styles.btnText}>
                {!actionCtx.facingRaise && heroPosition === 'BB'
                  ? 'CHECK'
                  : preflopCallAllIn
                    ? `ALL IN ${preflopCallAmt}BB`
                    : `CALL ${preflopCallAmt}BB`
                }
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
  const postFlopEquity = madeHandResult ? getPostFlopEquity(madeHandResult.rank) : null;
  const postFlopPotOdds = facingVillainBet && villainPostFlopAction
    ? calcPotOdds(villainPostFlopAction.betBB, state.pot)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>

      {/* GTO Coach panel — post-flop, detail controlled by difficulty */}
      {gtoShowPanel && madeHandResult && boardTexture && cbetRec && (
        <View style={styles.gtoPanel}>
          <Text style={styles.gtoPanelHeader}>GTO COACH  ·  {streetLabel.toUpperCase()}</Text>
          <View style={styles.gtoStatRow}>
            {gtoShowHandStatus && (
              <GTOStat
                label="EQUITY"
                value={`~${postFlopEquity!.pct}%`}
                sub={postFlopEquity!.label.split('—')[0].trim()}
                color={postFlopEquity!.color}
              />
            )}
            {postFlopPotOdds !== null ? (
              <GTOStat
                label="POT ODDS"
                value={`${postFlopPotOdds}%`}
                sub={gtoShowHandStatus
                  ? (postFlopEquity!.pct >= postFlopPotOdds ? '✓ Call is +EV' : '✗ Fold is correct')
                  : 'need to call'}
                color={postFlopEquity && postFlopEquity.pct >= postFlopPotOdds ? '#27AE60' : '#E74C3C'}
              />
            ) : gtoShowHandStatus ? (
              <GTOStat label="BOARD" value={boardTexture.label} sub="texture" color={boardTexture.color} />
            ) : null}
            {gtoShowActionRec && (
              <GTOStat
                label="GTO LINE"
                value={cbetRec.action === 'bet' ? `BET ${cbetRec.sizingPct}%` : 'CHECK'}
                color={cbetRec.action === 'bet' ? '#27AE60' : '#3498DB'}
                sub="recommended"
              />
            )}
          </View>
          {gtoShowTip && (
            <View style={styles.gtoTipBox}>
              <Text style={styles.gtoTipText} numberOfLines={3} ellipsizeMode="tail">
                {cbetRec.reason}
                {postFlopPotOdds !== null
                  ? ' Need ' + postFlopPotOdds + '% equity to call — your hand has ~' + postFlopEquity!.pct + '%.'
                  : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Advanced non-GTO post-flop: pot odds only when facing a bet */}
      {showPotOddsHint && facingVillainBet && villainPostFlopAction && (
        <View style={styles.infoRow}>
          <InfoCell
            label="POT ODDS"
            value={`${calcPotOdds(villainPostFlopAction.betBB, state.pot)}%`}
            sub="need to call"
            valueColor={colors.primary}
          />
        </View>
      )}

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

      {/* Action order context */}
      {heroActsFirst && !villainPostFlopAction ? (
        <View style={[styles.contextBanner, { backgroundColor: '#1A3A5C20', borderColor: '#3498DB40', borderWidth: 1 }]}>
          <Text style={[styles.contextText, { color: '#3498DB' }]}>
            {heroPosition} acts first · Pot: {potBB}BB · {streetLabel}
          </Text>
        </View>
      ) : facingVillainBet && villainPostFlopAction ? (
        <View style={[styles.contextBanner, { backgroundColor: '#60501815', borderColor: '#60501840', borderWidth: 1 }]}>
          <Text style={[styles.contextText, { color: '#C8A840' }]}>
            {heroCheckedStreet
              ? `You checked · ${mainVillainPosition} bets ${villainPostFlopAction.betPct}% pot (${villainPostFlopAction.betBB}BB)`
              : `${mainVillainPosition} bets ${villainPostFlopAction.betPct}% pot (${villainPostFlopAction.betBB}BB)`}
            {showInfo ? ` · Pot odds: ${calcPotOdds(villainPostFlopAction.betBB, state.pot)}%` : ''}
          </Text>
        </View>
      ) : isPostFlop ? (
        <View style={[styles.contextBanner, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
            {heroActsFirst ? `${heroPosition} acts first` : `${mainVillainPosition} checks`} · Pot: {potBB}BB · {streetLabel}
          </Text>
        </View>
      ) : null}

      {/* Bet sizing panel */}
      {betMode ? (
        <View style={styles.sizingPanel}>
          <Text style={[styles.sizingLabel, { color: colors.mutedForeground }]}>
            BET SIZE (% of {potBB}BB pot · max {state.heroStack}BB)
          </Text>
          <View style={styles.presetGrid}>
            {BET_PCT_PRESETS.map(pct => {
              const rawBB = Math.round((pct / 100) * state.pot * 10) / 10;
              const bbAmt = Math.min(rawBB, state.heroStack);
              const isAllIn = bbAmt >= state.heroStack;
              const selected = selectedBetPct === pct;
              return (
                <TouchableOpacity
                  key={pct}
                  style={[styles.preset, { backgroundColor: selected ? (isAllIn ? '#7B241C' : '#3D2E08') : '#1A1A1A', borderColor: selected ? (isAllIn ? '#E74C3C' : '#A8882A') : '#282828' }]}
                  onPress={() => setSelectedBetPct(pct)}
                >
                  <Text style={[styles.presetText, { color: selected ? '#FFF' : colors.foreground }]}>
                    {isAllIn ? 'ALL IN' : `${pct}%`}
                  </Text>
                  <Text style={[styles.presetSub, { color: selected ? '#F0D89080' : colors.mutedForeground }]}>
                    {bbAmt}BB
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {(() => {
            const rawBB = Math.round((selectedBetPct / 100) * state.pot * 10) / 10;
            const bbAmt = Math.min(rawBB, state.heroStack);
            const isAllIn = bbAmt >= state.heroStack;
            return (
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: isAllIn ? '#7B241C' : '#3D2E08' }]}
                onPress={() => handlePostFlop('bet', selectedBetPct)}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>
                  {isAllIn ? `ALL IN — ${bbAmt}BB` : `BET ${selectedBetPct}% (${bbAmt}BB)`}
                </Text>
              </TouchableOpacity>
            );
          })()}
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
                style={[styles.btn, postFlopCallAllIn ? styles.allInBtn : styles.callBtn, { flex: 1 }]}
                onPress={() => handlePostFlop('call')}
              >
                <Text style={styles.btnText}>
                  {postFlopCallAllIn ? `ALL IN ${postFlopCallAmt}BB` : `CALL ${postFlopCallAmt}BB`}
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

function GTOStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.gtoStat}>
      <Text style={styles.gtoStatLabel}>{label}</Text>
      <Text style={[styles.gtoStatValue, { color: color ?? '#7ECFA0' }]}>{value}</Text>
      {sub ? <Text style={styles.gtoStatSub}>{sub}</Text> : null}
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
  foldBtn: { backgroundColor: '#4A2020', flex: 0.8 },
  callBtn: { backgroundColor: '#102840' },
  raiseBtn: { backgroundColor: '#2A1E08', flex: 0.9 },
  allInBtn: { backgroundColor: '#4A1010' },

  // GTO Coach panel
  gtoPanel: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27AE6040',
    backgroundColor: '#0A1F12',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  gtoPanelHeader: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#27AE60',
    marginBottom: 8,
    textAlign: 'center',
  },
  gtoStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  gtoStat: { alignItems: 'center', flex: 1 },
  gtoStatLabel: { fontSize: 7.5, color: '#4A7A5A', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  gtoStatValue: { fontSize: 13, fontWeight: '800' },
  gtoStatSub: { fontSize: 7.5, color: '#4A7A5A', fontWeight: '500', textAlign: 'center', marginTop: 1 },
  gtoTipBox: {
    backgroundColor: '#0D2818',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 4,
  },
  gtoTipText: { fontSize: 10.5, color: '#7ECFA0', lineHeight: 15 },
});
