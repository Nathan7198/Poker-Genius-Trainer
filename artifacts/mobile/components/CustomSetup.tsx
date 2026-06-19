import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { Position, PlayerType, POSITIONS, PLAYER_TYPE_INFO, POSITION_COLORS } from '@/constants/pokerData';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUIT_INFO = [
  { key: 's', symbol: '♠', color: '#94A3B8' },
  { key: 'h', symbol: '♥', color: '#EF4444' },
  { key: 'd', symbol: '♦', color: '#F59E0B' },
  { key: 'c', symbol: '♣', color: '#4ADE80' },
] as const;

const SUIT_COLORS: Record<string, string> = { s: '#94A3B8', h: '#EF4444', d: '#F59E0B', c: '#4ADE80' };
const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const PLAYER_TYPES: PlayerType[] = ['TAG', 'LAG', 'Nit', 'Fish', 'Maniac'];
const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
type Street = typeof STREETS[number];
type CardSpec = { rank: string; suit: string };

function getUnavailable(allUsed: Set<string>, ownCard: CardSpec | null): Set<string> {
  const result = new Set<string>(allUsed);
  if (ownCard) result.delete(`${ownCard.rank}${ownCard.suit}`);
  return result;
}

// ── Card slot ────────────────────────────────────────────────────────────────
function CardSlot({ label, value, onChange, unavailable }: {
  label: string;
  value: CardSpec | null;
  onChange: (card: CardSpec | null) => void;
  unavailable: Set<string>;
}) {
  const [picking, setPicking] = useState(false);
  const [pickRank, setPickRank] = useState<string | null>(null);

  function handleRandom() {
    setPicking(false);
    setPickRank(null);
    onChange(null);
  }

  function handleStartPick() {
    setPicking(true);
    setPickRank(null);
  }

  function handleRankPress(r: string) {
    setPickRank(r);
  }

  function handleSuitPress(s: string) {
    if (!pickRank) return;
    if (unavailable.has(`${pickRank}${s}`)) return;
    onChange({ rank: pickRank, suit: s });
    setPicking(false);
    setPickRank(null);
  }

  const suitColor = value ? (SUIT_COLORS[value.suit] ?? '#FFF') : '#A8882A';
  const suitSymbol = value ? (SUIT_SYMBOLS[value.suit] ?? '') : '';
  const isRandom = !value && !picking;
  const isPicking = picking || !!value;

  return (
    <View style={cs.slot}>
      <Text style={cs.slotLabel}>{label}</Text>

      <TouchableOpacity
        style={[cs.cardPreview, value && { borderColor: suitColor + '70', backgroundColor: suitColor + '10' }]}
        onPress={value ? handleRandom : handleStartPick}
        activeOpacity={0.8}
      >
        {value ? (
          <>
            <Text style={[cs.cardRank, { color: suitColor }]}>{value.rank}</Text>
            <Text style={[cs.cardSuit, { color: suitColor }]}>{suitSymbol}</Text>
          </>
        ) : picking ? (
          <Text style={cs.cardQuestion}>?</Text>
        ) : (
          <Feather name="shuffle" size={18} color="#A8882A50" />
        )}
      </TouchableOpacity>

      <View style={cs.toggleRow}>
        <TouchableOpacity
          style={[cs.toggleBtn, isRandom && cs.toggleBtnActive]}
          onPress={handleRandom}
        >
          <Text style={[cs.toggleText, isRandom && cs.toggleTextActive]}>RANDOM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cs.toggleBtn, isPicking && cs.toggleBtnActive]}
          onPress={handleStartPick}
        >
          <Text style={[cs.toggleText, isPicking && cs.toggleTextActive]}>PICK</Text>
        </TouchableOpacity>
      </View>

      {isPicking && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={cs.rankScroll}
          contentContainerStyle={cs.rankRow}
        >
          {RANKS.map(r => {
            const allUsed = SUIT_INFO.every(s => unavailable.has(`${r}${s.key}`));
            const selected = pickRank === r || value?.rank === r;
            return (
              <TouchableOpacity
                key={r}
                style={[cs.rankChip, selected && cs.rankChipSelected, allUsed && cs.rankChipDim]}
                onPress={() => !allUsed && handleRankPress(r)}
              >
                <Text style={[cs.rankChipText, selected && cs.rankChipTextSel]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {pickRank && (
        <View style={cs.suitRow}>
          {SUIT_INFO.map(s => {
            const used = unavailable.has(`${pickRank}${s.key}`);
            const selected = value?.rank === pickRank && value?.suit === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  cs.suitChip,
                  selected && { borderColor: s.color, backgroundColor: s.color + '20' },
                  used && cs.suitChipDim,
                ]}
                onPress={() => !used && handleSuitPress(s.key)}
              >
                <Text style={[cs.suitChipText, { color: used ? '#3A3A3A' : s.color }]}>{s.symbol}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={cs.sectionHeader}>
      <View style={cs.sectionLine} />
      <Text style={cs.sectionLabel}>{label}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CustomSetup() {
  const { startCustomHand } = useGame();

  const [heroPos, setHeroPos] = useState<Position | null>(null);
  const [opponentType, setOpponentType] = useState<PlayerType | null>(null);
  const [street, setStreet] = useState<Street>('preflop');
  const [heroCard1, setHeroCard1] = useState<CardSpec | null>(null);
  const [heroCard2, setHeroCard2] = useState<CardSpec | null>(null);
  const [commCards, setCommCards] = useState<(CardSpec | null)[]>([null, null, null, null, null]);

  function setCommCard(i: number, card: CardSpec | null) {
    setCommCards(prev => prev.map((c, idx) => idx === i ? card : c));
  }

  const usedCards = new Set<string>();
  if (heroCard1) usedCards.add(`${heroCard1.rank}${heroCard1.suit}`);
  if (heroCard2) usedCards.add(`${heroCard2.rank}${heroCard2.suit}`);
  commCards.forEach(c => { if (c) usedCards.add(`${c.rank}${c.suit}`); });

  const commSlotCount = { preflop: 0, flop: 3, turn: 4, river: 5 }[street];

  function handleDeal() {
    startCustomHand({
      heroPosition: heroPos,
      heroCard1,
      heroCard2,
      opponentType,
      startStreet: street,
      communityCards: commCards,
    });
  }

  return (
    <ScrollView
      style={cs.root}
      contentContainerStyle={cs.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={cs.title}>CUSTOM HAND</Text>
      <Text style={cs.subtitle}>Configure your scenario — randomise any condition you leave unset</Text>

      {/* YOUR POSITION */}
      <SectionHeader label="YOUR POSITION" />
      <View style={cs.optionRow}>
        <TouchableOpacity
          style={[cs.randomChip, !heroPos && cs.randomChipActive]}
          onPress={() => setHeroPos(null)}
        >
          <Feather name="shuffle" size={9} color={!heroPos ? '#0A0A0A' : '#A8882A'} style={{ marginRight: 3 }} />
          <Text style={[cs.randomChipText, !heroPos && cs.randomChipTextActive]}>RANDOM</Text>
        </TouchableOpacity>
        {POSITIONS.map(pos => {
          const sel = heroPos === pos;
          const col = POSITION_COLORS[pos];
          return (
            <TouchableOpacity
              key={pos}
              style={[cs.posChip, sel && { backgroundColor: col, borderColor: col }]}
              onPress={() => setHeroPos(pos)}
            >
              <Text style={[cs.posChipText, sel && cs.posChipTextSel]}>{pos}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* YOUR HOLE CARDS */}
      <SectionHeader label="YOUR HOLE CARDS" />
      <View style={cs.twoColRow}>
        <CardSlot
          label="Card 1"
          value={heroCard1}
          onChange={setHeroCard1}
          unavailable={getUnavailable(usedCards, heroCard1)}
        />
        <CardSlot
          label="Card 2"
          value={heroCard2}
          onChange={setHeroCard2}
          unavailable={getUnavailable(usedCards, heroCard2)}
        />
      </View>

      {/* OPPONENT TYPE */}
      <SectionHeader label="OPPONENT TYPE" />
      <View style={cs.optionRow}>
        <TouchableOpacity
          style={[cs.randomChip, !opponentType && cs.randomChipActive]}
          onPress={() => setOpponentType(null)}
        >
          <Feather name="shuffle" size={9} color={!opponentType ? '#0A0A0A' : '#A8882A'} style={{ marginRight: 3 }} />
          <Text style={[cs.randomChipText, !opponentType && cs.randomChipTextActive]}>RANDOM</Text>
        </TouchableOpacity>
        {PLAYER_TYPES.map(t => {
          const info = PLAYER_TYPE_INFO[t];
          const sel = opponentType === t;
          return (
            <TouchableOpacity
              key={t}
              style={[cs.typeChip, sel && { backgroundColor: info.color + '22', borderColor: info.color }]}
              onPress={() => setOpponentType(t)}
            >
              <Text style={[cs.typeChipText, { color: sel ? info.color : '#777' }]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* STARTING STREET */}
      <SectionHeader label="STARTING STREET" />
      <View style={cs.optionRow}>
        {STREETS.map(s => {
          const sel = street === s;
          return (
            <TouchableOpacity
              key={s}
              style={[cs.streetChip, sel && cs.streetChipActive]}
              onPress={() => setStreet(s)}
            >
              <Text style={[cs.streetChipText, sel && cs.streetChipTextActive]}>
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* COMMUNITY CARDS */}
      {commSlotCount > 0 && (
        <>
          <SectionHeader label="COMMUNITY CARDS" />
          <View style={cs.commGrid}>
            {Array.from({ length: commSlotCount }, (_, i) => {
              const labels = ['F1', 'F2', 'F3', 'TURN', 'RIVER'];
              return (
                <CardSlot
                  key={i}
                  label={labels[i]}
                  value={commCards[i] ?? null}
                  onChange={card => setCommCard(i, card)}
                  unavailable={getUnavailable(usedCards, commCards[i] ?? null)}
                />
              );
            })}
          </View>
        </>
      )}

      {/* DEAL BUTTON */}
      <TouchableOpacity style={cs.dealBtn} onPress={handleDeal} activeOpacity={0.85}>
        <Text style={cs.dealBtnText}>DEAL HAND  →</Text>
      </TouchableOpacity>

      <Text style={cs.hint}>Unset fields are dealt randomly from the remaining deck</Text>
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10,
  },
  title: {
    color: '#C8A840',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },
  sectionLine: {
    width: 3,
    height: 13,
    borderRadius: 2,
    backgroundColor: '#A8882A',
  },
  sectionLabel: {
    color: '#A8882A',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  randomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A8882A60',
  },
  randomChipActive: {
    backgroundColor: '#A8882A',
    borderColor: '#A8882A',
  },
  randomChipText: {
    color: '#A8882A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  randomChipTextActive: { color: '#0A0A0A' },
  posChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#161616',
  },
  posChipText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '700',
  },
  posChipTextSel: {
    color: '#FFF',
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#161616',
  },
  typeChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  streetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#161616',
  },
  streetChipActive: {
    backgroundColor: '#0E2A1B',
    borderColor: '#27AE60',
  },
  streetChipText: {
    color: '#555',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  streetChipTextActive: { color: '#27AE60' },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  commGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dealBtn: {
    backgroundColor: '#A8882A',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#A8882A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dealBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  hint: {
    color: '#3A3A3A',
    fontSize: 9,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // CardSlot styles
  slot: {
    flex: 1,
    minWidth: 90,
    gap: 4,
  },
  slotLabel: {
    color: '#666',
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardPreview: {
    height: 56,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  cardRank: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardSuit: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  cardQuestion: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#A8882A',
    backgroundColor: '#A8882A18',
  },
  toggleText: {
    color: '#444',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  toggleTextActive: { color: '#A8882A' },
  rankScroll: {
    flexGrow: 0,
  },
  rankRow: {
    flexDirection: 'row',
    gap: 3,
    paddingVertical: 2,
  },
  rankChip: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankChipSelected: {
    borderColor: '#C8A840',
    backgroundColor: '#C8A84018',
  },
  rankChipDim: { opacity: 0.25 },
  rankChipText: {
    color: '#777',
    fontSize: 9.5,
    fontWeight: '700',
  },
  rankChipTextSel: { color: '#C8A840' },
  suitRow: {
    flexDirection: 'row',
    gap: 4,
  },
  suitChip: {
    flex: 1,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suitChipDim: { opacity: 0.2 },
  suitChipText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
