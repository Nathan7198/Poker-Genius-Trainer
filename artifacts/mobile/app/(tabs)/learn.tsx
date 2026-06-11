import React, { useState } from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import RangeGrid from '@/components/RangeGrid';
import {
  POSITIONS, Position, POSITION_LABELS, POSITION_COLORS, POSITION_DESCRIPTIONS,
  PLAYER_TYPE_INFO, PlayerType, DIFFICULTIES, DIFFICULTY_DESCRIPTIONS,
  calcPotOdds,
} from '@/constants/pokerData';

type Tab = 'ranges'|'positions'|'players'|'theory';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ranges', label: 'Ranges' },
  { key: 'positions', label: 'Positions' },
  { key: 'players', label: 'Player Types' },
  { key: 'theory', label: 'GTO Theory' },
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
  const [activeTab, setActiveTab] = useState<Tab>('ranges');
  const [selectedPosition, setSelectedPosition] = useState<Position>('BTN');

  const topPad = Platform.OS === 'web' ? insets.top + 10 : insets.top + 4;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.gold }]}>GTO LIBRARY</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>6-Max No-Limit Hold'em</Text>
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
        {activeTab === 'ranges' && (
          <View>
            {/* Position selector */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
              {POSITIONS.map(pos => (
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
              {selectedPosition === 'BB'
                ? (
                  <View>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 0 }]}>BB DEFENSE VS 3x OPEN</Text>
                    <Text style={[styles.infoText, { color: colors.foreground, marginBottom: 8 }]}>
                      BB defends very wide due to discounted pot odds. You already have 1BB invested and only need to call 2BB more into a ~6.5BB pot. This gives you ~30% pot odds, requiring only ~30% equity to call.
                    </Text>
                  </View>
                )
                : null}
              <RangeGrid position={selectedPosition} compact={false} />
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
        )}

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
      </ScrollView>
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
