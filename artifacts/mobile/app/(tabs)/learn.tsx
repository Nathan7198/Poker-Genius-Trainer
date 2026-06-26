import React, { useState, useCallback } from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import RangeGrid from '@/components/RangeGrid';
import { useGame } from '@/context/GameContext';
import {
  POSITIONS, Position, POSITION_LABELS, POSITION_COLORS, POSITION_DESCRIPTIONS,
  PLAYER_TYPE_INFO, PlayerType, DIFFICULTIES, DIFFICULTY_DESCRIPTIONS,
  calcPotOdds, StackTier, STACK_TIER_LABELS, STACK_TIER_DESCRIPTIONS, getStackTier,
  TableFormat, TABLE_FORMAT_LABELS, TABLE_FORMAT_RANGES, FORMAT_POSITIONS, getTableFormat,
} from '@/constants/pokerData';

type Tab = 'ranges'|'positions'|'players'|'theory'|'outs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ranges', label: 'Ranges' },
  { key: 'positions', label: 'Positions' },
  { key: 'players', label: 'Player Types' },
  { key: 'theory', label: 'GTO Theory' },
  { key: 'outs', label: 'Outs & Equity' },
];

const POT_ODDS_EXAMPLES = [
  { facing: 'Half-pot bet', callPct: 25, equity: 'You need 25%+ equity' },
  { facing: '2/3 pot bet', callPct: 28, equity: 'You need 28%+ equity' },
  { facing: 'Pot-sized bet', callPct: 33, equity: 'You need 33%+ equity' },
  { facing: '2x pot overbet', callPct: 40, equity: 'You need 40%+ equity' },
];

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<Tab>('ranges');
  const [selectedPosition, setSelectedPosition] = useState<Position>('BTN');
  const [selectedStackTier, setSelectedStackTier] = useState<StackTier>('deep');
  const [selectedTableFormat, setSelectedTableFormat] = useState<TableFormat>(
    () => getTableFormat(state.tableSize)
  );

  const handleFormatChange = (fmt: TableFormat) => {
    setSelectedTableFormat(fmt);
    const valid = FORMAT_POSITIONS[fmt];
    if (!valid.includes(selectedPosition)) setSelectedPosition('BTN');
  };

  // When navigating to this tab during an active hand, jump straight to the
  // hero's current position in the Ranges view so they can check their range.
  useFocusEffect(
    useCallback(() => {
      if (state.phase !== 'idle') {
        const fmt = getTableFormat(state.tableSize);
        setActiveTab('ranges');
        setSelectedTableFormat(fmt);
        const valid = FORMAT_POSITIONS[fmt];
        const pos = valid.includes(state.heroPosition) ? state.heroPosition : 'BTN';
        setSelectedPosition(pos);
        setSelectedStackTier(getStackTier(state.heroStack));
      }
    }, [state.phase, state.heroPosition, state.heroStack, state.tableSize])
  );

  const topPad = Platform.OS === 'web' ? insets.top + 10 : insets.top + 4;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.gold }]}>GTO LIBRARY</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{TABLE_FORMAT_LABELS[selectedTableFormat]} · No-Limit Hold'em</Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === t.key ? colors.gold : colors.mutedForeground }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── RANGES ── */}
        {activeTab === 'ranges' && (() => {
          const validPositions = FORMAT_POSITIONS[selectedTableFormat];
          const isSixmax = selectedTableFormat === 'sixmax';
          const tierColors: Record<StackTier, string> = { deep: '#27AE60', mid: '#3498DB', short: '#E67E22', 'push-fold': '#E74C3C' };
          const tierShort: Record<StackTier, string> = { deep: '75BB+', mid: '40–75BB', short: '20–40BB', 'push-fold': '<20BB' };
          const fmtColors: Record<TableFormat, string> = { hu: '#E74C3C', sh: '#E67E22', sixmax: '#27AE60', fr: '#3498DB' };
          return (
          <View>
            {/* Table format selector */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TABLE SIZE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
              {(['hu', 'sh', 'sixmax', 'fr'] as TableFormat[]).map(fmt => {
                const col = fmtColors[fmt];
                const sel = selectedTableFormat === fmt;
                return (
                  <TouchableOpacity
                    key={fmt}
                    style={[styles.posChip, { backgroundColor: sel ? col : colors.secondary, borderColor: col, borderWidth: 1 }]}
                    onPress={() => handleFormatChange(fmt)}
                  >
                    <Text style={[styles.posChipText, { color: sel ? '#FFF' : col }]}>{TABLE_FORMAT_LABELS[fmt]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Position selector — filtered to valid positions for selected format */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
              {validPositions.map(pos => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.posChip, {
                    backgroundColor: selectedPosition === pos ? POSITION_COLORS[pos] : colors.secondary,
                    borderColor: POSITION_COLORS[pos],
                    borderWidth: 1,
                  }]}
                  onPress={() => setSelectedPosition(pos)}
                >
                  <Text style={[styles.posChipText, { color: selectedPosition === pos ? '#FFF' : POSITION_COLORS[pos] }]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Stack tier selector — only for 6-max (stack-adjusted ranges only defined for 6-max) */}
            {isSixmax ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>STACK SIZE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
                  {(['deep', 'mid', 'short', 'push-fold'] as StackTier[]).map(tier => {
                    const col = tierColors[tier];
                    const sel = selectedStackTier === tier;
                    return (
                      <TouchableOpacity
                        key={tier}
                        style={[styles.posChip, { backgroundColor: sel ? col : colors.secondary, borderColor: col, borderWidth: 1 }]}
                        onPress={() => setSelectedStackTier(tier)}
                      >
                        <Text style={[styles.posChipText, { color: sel ? '#FFF' : col }]}>{tierShort[tier]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.stackTierBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.stackTierLabel, { color: tierColors[selectedStackTier] }]}>{STACK_TIER_LABELS[selectedStackTier]}</Text>
                  <Text style={[styles.stackTierDesc, { color: colors.mutedForeground }]}>{STACK_TIER_DESCRIPTIONS[selectedStackTier]}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.stackTierBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.stackTierLabel, { color: fmtColors[selectedTableFormat] }]}>{TABLE_FORMAT_LABELS[selectedTableFormat]}</Text>
                <Text style={[styles.stackTierDesc, { color: colors.mutedForeground }]}>
                  {selectedTableFormat === 'hu'
                    ? 'Heads-up strategy differs significantly from multi-way play. Ranges are very wide — position and aggression dominate. Stack-size tiers apply to 6-max view.'
                    : selectedTableFormat === 'sh'
                      ? 'Short-handed tables reward aggression. Every position plays wider as there are fewer players to run into strong hands. Stack-size tiers apply to 6-max view.'
                      : 'Full ring EP ranges are significantly tighter — you have up to 8 players still to act. Ranges widen considerably in later positions. Stack-size tiers apply to 6-max view.'}
                </Text>
              </View>
            )}

            {/* Position label */}
            <View style={styles.posHeader}>
              <Text style={[styles.posName, { color: colors.foreground }]}>{POSITION_LABELS[selectedPosition]}</Text>
              <View style={[styles.posColorDot, { backgroundColor: POSITION_COLORS[selectedPosition] }]} />
            </View>
            <Text style={[styles.posDesc, { color: colors.mutedForeground }]}>
              {POSITION_DESCRIPTIONS[selectedPosition]}
            </Text>

            {/* Range grid */}
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              {selectedPosition === 'BB' && (
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 0 }]}>
                    {selectedTableFormat === 'hu' ? 'HU BB DEFENSE VS BTN OPEN' : 'BB DEFENSE VS 3x OPEN'}
                  </Text>
                  <Text style={[styles.infoText, { color: colors.foreground, marginBottom: 8 }]}>
                    {selectedTableFormat === 'hu'
                      ? 'In heads-up, BB defends extremely wide (~65%). You have great pot odds and only one opponent — folding too often is a major leak.'
                      : 'BB defends very wide due to discounted pot odds. You already have 1BB invested and only need to call 2BB more into a ~6.5BB pot. This gives you ~30% pot odds, requiring only ~30% equity to call.'}
                  </Text>
                </View>
              )}
              <RangeGrid
                position={selectedPosition}
                compact={false}
                stackTier={isSixmax ? selectedStackTier : undefined}
                tableFormat={selectedTableFormat}
              />
            </View>

            {/* GTO sizing tip */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, margin: 16 }]}>
              <Text style={[styles.cardTitle, { color: colors.gold }]}>STANDARD OPEN SIZES</Text>
              <Text style={[styles.cardText, { color: colors.foreground }]}>
                <Text style={{ fontWeight: '700' }}>EP/MP (UTG-HJ):</Text> 3x BB open{'\n'}
                <Text style={{ fontWeight: '700' }}>CO:</Text> 2.5x BB open{'\n'}
                <Text style={{ fontWeight: '700' }}>BTN:</Text> 2.5x BB open{'\n'}
                <Text style={{ fontWeight: '700' }}>SB:</Text> 3x BB open vs BB{'\n'}
                <Text style={{ fontWeight: '700' }}>3-Bet:</Text> ~3x the open (9–11x total){'\n'}
                <Text style={{ fontWeight: '700' }}>4-Bet:</Text> ~2.2–2.5x the 3-bet
              </Text>
            </View>
          </View>
          );
        })()}

        {/* ── POSITIONS ── */}
        {activeTab === 'positions' && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Table Position Guide</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground, marginBottom: 16 }]}>
              In poker, position is power. Acting later gives you more information. The button is the most profitable seat in the game — on average, you win chips from BTN that you lose elsewhere.
            </Text>

            {POSITIONS.map(pos => (
              <View key={pos} style={[styles.card, { backgroundColor: colors.card, borderColor: POSITION_COLORS[pos] + '44', marginBottom: 10 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.posBadge, { backgroundColor: POSITION_COLORS[pos] }]}>
                    <Text style={styles.posBadgeText}>{pos}</Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{POSITION_LABELS[pos]}</Text>
                </View>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
                  {POSITION_DESCRIPTIONS[pos]}
                </Text>
              </View>
            ))}

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 6 }]}>
              <Text style={[styles.cardTitle, { color: colors.gold }]}>PREFLOP ACTION ORDER</Text>
              <Text style={[styles.cardText, { color: colors.foreground }]}>
                UTG → HJ → CO → BTN → SB → BB
              </Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground, marginTop: 6 }]}>
                After the flop, SB acts first and BTN acts last. The button's positional advantage continues for the entire hand.
              </Text>
            </View>
          </View>
        )}

        {/* ── PLAYER TYPES ── */}
        {activeTab === 'players' && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Opponent Profiles</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground, marginBottom: 16 }]}>
              VPIP = % of hands voluntarily entered. PFR = % of hands raised preflop. A high VPIP/PFR gap = calling station. High PFR = aggressive.
            </Text>

            {(Object.keys(PLAYER_TYPE_INFO) as PlayerType[]).map(type => {
              const info = PLAYER_TYPE_INFO[type];
              return (
                <View key={type} style={[styles.card, { backgroundColor: colors.card, borderColor: info.color + '44', marginBottom: 10 }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: info.color }]}>
                      <Text style={styles.typeBadgeText}>{info.shortLabel}</Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{info.label}</Text>
                  </View>
                  <Text style={[styles.cardText, { color: colors.mutedForeground, marginBottom: 8 }]}>
                    {info.description}
                  </Text>
                  <View style={styles.statsRow}>
                    <StatBadge label="VPIP" value={`${info.vpip}%`} color={info.color} />
                    <StatBadge label="PFR" value={`${info.pfr}%`} color={info.color} />
                  </View>
                  <View style={[styles.exploitBox, { backgroundColor: info.color + '15', borderColor: info.color + '30' }]}>
                    <Text style={[styles.exploitLabel, { color: info.color }]}>HOW TO EXPLOIT</Text>
                    <Text style={[styles.exploitText, { color: colors.foreground }]}>{info.exploit}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── GTO THEORY ── */}
        {activeTab === 'theory' && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>GTO Fundamentals</Text>

            <TheoryCard
              title="What is GTO?"
              color="#C9A84C"
              colors={colors}
            >
              Game Theory Optimal (GTO) poker is a mathematically balanced strategy that cannot be exploited. GTO prevents your opponents from profiting by adjusting to your tendencies. Playing GTO doesn't maximize profit against weak players, but it provides an unexploitable foundation.
            </TheoryCard>

            <TheoryCard title="Pot Odds" color="#3498DB" colors={colors}>
              Pot odds tell you how much equity you need to call profitably. If you must call 30BB into a 90BB pot, the total pot becomes 120BB. You invested 30/120 = 25% of the pot, so you need at least 25% equity.{'\n\n'}
              <Text style={{ fontWeight: '700' }}>Formula:</Text> Call% / (Pot + Call%) = Required Equity
            </TheoryCard>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#3498DB44', marginBottom: 10 }]}>
              <Text style={[styles.cardTitle, { color: '#3498DB' }]}>POT ODDS QUICK REFERENCE</Text>
              {POT_ODDS_EXAMPLES.map((ex, i) => (
                <View key={i} style={[styles.oddsRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                  <Text style={[styles.oddsFacing, { color: colors.mutedForeground }]}>{ex.facing}</Text>
                  <Text style={[styles.oddsResult, { color: '#3498DB' }]}>{ex.equity}</Text>
                </View>
              ))}
            </View>

            <TheoryCard title="Equity vs Pot Odds" color="#27AE60" colors={colors}>
              If your equity exceeds your pot odds, calling is profitable long-term. If your equity is less than the pot odds, folding saves money. Example: You have 35% equity on a flush draw. Villain bets pot (33% pot odds). 35% equity {'>'} 33% required → profitable call.
            </TheoryCard>

            <TheoryCard title="Range vs Range Thinking" color="#9B59B6" colors={colors}>
              Instead of putting your opponent on a single hand, think in ranges. A UTG raiser has ~14% of hands. On a K♠9♥2♣ board, their range contains KK, K9s, AA, QQ, JJ, and misses. Your hand's equity is calculated against their entire range, not one specific hand.
            </TheoryCard>

            <TheoryCard title="3-Betting" color="#E67E22" colors={colors}>
              3-bets should have two components: value hands (AA, KK, QQ, JJ, AKs) and bluffs (A5s, A2s — they block Ace-heavy calling ranges). This balance prevents exploitation.{'\n\n'}
              Sizing: ~3x the open from position, ~4x out of position.{'\n'}
              A 3-bet to 9BB after a 3BB open is standard in 6-max.
            </TheoryCard>

            <TheoryCard title="Continuation Betting" color="#E74C3C" colors={colors}>
              C-bet when you have equity, initiative, or a range advantage on the board texture. Avoid c-betting every flop — use mixed strategies. On dry boards (K72 rainbow) bet wide as the preflop raiser. On wet boards (JT9 two-tone), size up with value and give up more bluffs.
            </TheoryCard>

            <TheoryCard title="Stack-to-Pot Ratio (SPR)" color="#1ABC9C" colors={colors}>
              SPR = Effective Stack / Pot Size. Low SPR (1-3) → commit with top pair or better. Medium SPR (4-9) → need strong hands or draws. High SPR (10+) → need premium hands for all-in commitment. SPR guides how aggressively you build pots.
            </TheoryCard>
          </View>
        )}
        {/* ── OUTS & EQUITY ── */}
        {activeTab === 'outs' && (
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Outs & Equity</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground, marginBottom: 16 }]}>
              An "out" is any card remaining in the deck that will complete your drawing hand. Count your outs, then apply the Rule of 4 or Rule of 2 to estimate your equity in seconds — no calculator needed.
            </Text>

            {/* Rule of 4 and 2 */}
            <View style={[styles.card, { backgroundColor: '#3B82F615', borderColor: '#3B82F640', marginBottom: 10 }]}>
              <Text style={[styles.cardTitle, { color: '#3B82F6' }]}>THE RULE OF 4 AND RULE OF 2</Text>
              <View style={{ gap: 10 }}>
                <View style={[styles.ruleBox, { borderColor: '#27AE6040', backgroundColor: '#27AE6012' }]}>
                  <Text style={[styles.ruleLabel, { color: '#27AE60' }]}>ON THE FLOP  (2 cards still to come)</Text>
                  <Text style={[styles.ruleFormula, { color: '#27AE60' }]}>Outs × 4 = Equity %</Text>
                  <Text style={[styles.ruleExample, { color: colors.mutedForeground }]}>9 outs × 4 = 36% chance of hitting by the river</Text>
                </View>
                <View style={[styles.ruleBox, { borderColor: '#E67E2240', backgroundColor: '#E67E2212' }]}>
                  <Text style={[styles.ruleLabel, { color: '#E67E22' }]}>ON THE TURN  (1 card still to come)</Text>
                  <Text style={[styles.ruleFormula, { color: '#E67E22' }]}>Outs × 2 = Equity %</Text>
                  <Text style={[styles.ruleExample, { color: colors.mutedForeground }]}>9 outs × 2 = 18% chance of hitting on the river</Text>
                </View>
              </View>
              <Text style={[styles.infoText, { color: colors.mutedForeground, marginTop: 10, fontSize: 12 }]}>
                These are approximations — accurate to within 1–2% for most draws, which is close enough for live decisions.
              </Text>
            </View>

            {/* Flush draw worked example */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#3498DB44', marginBottom: 10 }]}>
              <Text style={[styles.cardTitle, { color: '#3498DB' }]}>WORKED EXAMPLE — FLUSH DRAW</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground, marginBottom: 10 }]}>
                You hold <Text style={{ color: '#3498DB', fontWeight: '800' }}>K♠ Q♠</Text>. The flop comes <Text style={{ color: '#3498DB', fontWeight: '800' }}>J♠ 8♠ 2♥</Text>.
              </Text>
              <WorkedStep n={1} color="#3498DB" colors={colors} title="Count your suited cards">
                You have K♠ Q♠ in hand + J♠ 8♠ on the board = 4 spades total. You need just one more spade for a flush.
              </WorkedStep>
              <WorkedStep n={2} color="#3498DB" colors={colors} title="Count your outs">
                There are 13 spades in a deck. You can see 4 of them. That leaves 13 − 4 = <Text style={{ fontWeight: '800', color: '#3498DB' }}>9 outs</Text>.
              </WorkedStep>
              <WorkedStep n={3} color="#3498DB" colors={colors} title="Apply Rule of 4 (on the flop)">
                9 outs × 4 = <Text style={{ fontWeight: '900', color: '#27AE60' }}>36%</Text> chance of completing the flush by the river.
              </WorkedStep>
              <WorkedStep n={4} color="#3498DB" colors={colors} title="Apply Rule of 2 (on the turn, if you missed)">
                9 outs × 2 = <Text style={{ fontWeight: '900', color: '#E67E22' }}>18%</Text> chance of hitting on the river.
              </WorkedStep>
              <View style={{ backgroundColor: '#27AE6015', borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#27AE6035' }}>
                <Text style={{ color: '#27AE60', fontWeight: '800', fontSize: 12 }}>HOW TO USE THIS</Text>
                <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                  If villain bets half pot → you need 25% equity to call → 36% {'>'} 25% → <Text style={{ fontWeight: '800' }}>CALL</Text>.{'\n'}
                  If villain bets 2× pot → you need 40% equity → 36% {'<'} 40% → <Text style={{ fontWeight: '800' }}>FOLD</Text>.
                </Text>
              </View>
            </View>

            {/* Straight draw worked example */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#E67E2244', marginBottom: 10 }]}>
              <Text style={[styles.cardTitle, { color: '#E67E22' }]}>WORKED EXAMPLE — STRAIGHT DRAW</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground, marginBottom: 10 }]}>
                You hold <Text style={{ color: '#E67E22', fontWeight: '800' }}>9♥ 8♣</Text>. The flop comes <Text style={{ color: '#E67E22', fontWeight: '800' }}>7♦ 6♠ 2♥</Text>.
              </Text>
              <WorkedStep n={1} color="#E67E22" colors={colors} title="Identify the draw">
                You have 9-8-7-6. Any 5 or any T completes the straight — that's an open-ended straight draw (OESD).
              </WorkedStep>
              <WorkedStep n={2} color="#E67E22" colors={colors} title="Count your outs">
                Four 5s + four Ts = <Text style={{ fontWeight: '800', color: '#E67E22' }}>8 outs</Text>.
              </WorkedStep>
              <WorkedStep n={3} color="#E67E22" colors={colors} title="Apply Rule of 4">
                8 outs × 4 = <Text style={{ fontWeight: '900', color: '#27AE60' }}>32%</Text> by the river.  On the turn: 8 × 2 = <Text style={{ fontWeight: '900', color: '#E67E22' }}>16%</Text>.
              </WorkedStep>
            </View>

            {/* Common draws reference table */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
              <Text style={[styles.cardTitle, { color: colors.gold }]}>COMMON DRAWS — QUICK REFERENCE</Text>
              <View style={{ gap: 0 }}>
                {[
                  { draw: 'Flush draw', outs: 9, color: '#3498DB' },
                  { draw: 'Open-ended straight (OESD)', outs: 8, color: '#E67E22' },
                  { draw: 'Flush draw + gutshot', outs: 12, color: '#9B59B6' },
                  { draw: 'Flush draw + OESD', outs: 15, color: '#9B59B6' },
                  { draw: 'Two overcards', outs: 6, color: '#27AE60' },
                  { draw: 'Gutshot straight', outs: 4, color: '#E74C3C' },
                  { draw: 'Pair → trips (set)', outs: 2, color: '#95A5A6' },
                ].map((row, i) => (
                  <View key={i} style={[styles.outsRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ color: row.color, fontSize: 12, fontWeight: '700' }}>{row.draw}</Text>
                    </View>
                    <View style={styles.outsCell}>
                      <Text style={[styles.outsCellLabel, { color: colors.mutedForeground }]}>Outs</Text>
                      <Text style={[styles.outsCellVal, { color: colors.foreground }]}>{row.outs}</Text>
                    </View>
                    <View style={styles.outsCell}>
                      <Text style={[styles.outsCellLabel, { color: colors.mutedForeground }]}>Flop</Text>
                      <Text style={[styles.outsCellVal, { color: '#27AE60' }]}>{row.outs * 4}%</Text>
                    </View>
                    <View style={styles.outsCell}>
                      <Text style={[styles.outsCellLabel, { color: colors.mutedForeground }]}>Turn</Text>
                      <Text style={[styles.outsCellVal, { color: '#E67E22' }]}>{row.outs * 2}%</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 10, lineHeight: 14 }}>
                * Flush draw + OESD (15 outs) slightly overestimates — some outs overlap. True equity ≈ 54%.
              </Text>
            </View>

            {/* Tips */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.gold }]}>IMPORTANT NOTES</Text>
              <Text style={[styles.cardText, { color: colors.foreground }]}>
                <Text style={{ fontWeight: '800' }}>Not all outs are clean.</Text> If you have a straight draw but completing your straight also puts a flush on the board, some of your "outs" might give the flush to your opponent. Discount dirty outs.{'\n\n'}
                <Text style={{ fontWeight: '800' }}>Backdoor draws</Text> (needing both turn AND river) are worth about 2–3% extra equity — not enough to call on their own, but add value to your made hands.{'\n\n'}
                <Text style={{ fontWeight: '800' }}>Equity ≠ profitability.</Text> Always compare your equity to the pot odds. Having 36% equity is only profitable if the call costs you less than 36% of the pot.
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function WorkedStep({ n, title, color, children, colors }: { n: number; title: string; color: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 12, marginBottom: 3 }}>{title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>{children}</Text>
      </View>
    </View>
  );
}

function TheoryCard({ title, color, children, colors }: { title: string; color: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: color + '44', marginBottom: 10 }]}>
      <Text style={[styles.cardTitle, { color }]}>{title.toUpperCase()}</Text>
      <Text style={[styles.cardText, { color: colors.foreground }]}>{children}</Text>
    </View>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[styles.statBadgeLabel, { color }]}>{label}</Text>
      <Text style={[styles.statBadgeValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  tabScroll: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  tabContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  posRow: {
    flexGrow: 0,
  },
  posChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  posChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  posHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  posName: {
    fontSize: 16,
    fontWeight: '700',
  },
  posColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  posDesc: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  stackTierBadge: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  stackTierLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stackTierDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
  },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  posBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  statBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statBadgeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  exploitBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  exploitLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exploitText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ruleBox: { borderRadius: 8, borderWidth: 1, padding: 10 },
  ruleLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  ruleFormula: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  ruleExample: { fontSize: 12, lineHeight: 16 },
  outsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 6 },
  outsCell: { width: 44, alignItems: 'center' },
  outsCellLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  outsCellVal: { fontSize: 13, fontWeight: '800' },
  oddsRow: {
    paddingVertical: 8,
    gap: 3,
  },
  oddsFacing: {
    fontSize: 12,
    fontWeight: '600',
  },
  oddsResult: {
    fontSize: 12,
    fontWeight: '700',
  },
});
