import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '@/context/GameContext';
import PlayingCard from './PlayingCard';
import PlayerSeat from './PlayerSeat';

// Angles spread across the UPPER half of the oval — no seats at the bottom
// 270° = top-center, 195°/345° = sides, 230°/310° = upper corners
const OPPONENT_ANGLES_DEG = [345, 310, 270, 230, 195];

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

const TABLE_H = 290;

export default function PokerTable() {
  const { state } = useGame();
  const { width } = useWindowDimensions();

  // Felt dimensions
  const tableW = width - 16;
  const cx = tableW / 2;
  const cy = TABLE_H / 2;   // 145
  const rx = tableW * 0.40;
  const ry = 85; // fixed — keeps top-center seat inside the table

  function getSeatPos(angleDeg: number) {
    const r = degToRad(angleDeg);
    return {
      x: cx + rx * Math.cos(r),
      y: cy + ry * Math.sin(r),
    };
  }

  const activePlayers = state.players.slice(0, 5);

  return (
    <View style={[styles.outer, { height: TABLE_H + 48, width: tableW }]}>
      {/* Table felt */}
      <View style={[styles.felt, { width: tableW, height: TABLE_H, borderRadius: TABLE_H / 2 + 8 }]}>
        {/* Inner dashed border */}
        <View style={[styles.feltInner, { width: tableW - 40, height: TABLE_H - 40, borderRadius: TABLE_H / 2 }]} />

        {/* Pot display */}
        {state.pot > 0 && (
          <View style={styles.potBadge}>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potAmount}>{state.pot.toFixed(1)} BB</Text>
          </View>
        )}

        {/* Community cards — center of felt */}
        <View style={styles.communityCards}>
          {state.phase !== 'idle' && state.phase !== 'preflop' ? (
            state.communityCards.slice(0, 5).map((card, i) => (
              <PlayingCard key={i} card={card} size="md" faceDown={!card.faceUp} />
            ))
          ) : state.phase === 'preflop' ? (
            <View style={styles.preflopHint}>
              <Text style={styles.preflopHintText}>PREFLOP</Text>
            </View>
          ) : null}
        </View>

        {/* Bot player seats — absolutely positioned on the oval */}
        {activePlayers.map((player, i) => {
          const pos = getSeatPos(OPPONENT_ANGLES_DEG[i]);
          return (
            <View
              key={player.id}
              style={[styles.seatAbsolute, { left: pos.x - 36, top: pos.y - 60 }]}
            >
              <PlayerSeat player={player} showCards={state.phase === 'showdown'} />
            </View>
          );
        })}
      </View>

      {/* Hero seat — always below the felt */}
      <View style={styles.heroRow}>
        <View style={styles.heroCards}>
          {state.heroCards.length > 0
            ? state.heroCards.map((card, i) => (
                <View key={i} style={{ marginHorizontal: 3 }}>
                  <PlayingCard card={card} size="lg" />
                </View>
              ))
            : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroPlaceholderText}>YOUR HAND</Text>
              </View>
            )}
        </View>

        <View style={styles.heroBadge}>
          <View style={styles.heroPosRow}>
            <Text style={styles.heroLabel}>YOU</Text>
            {state.phase !== 'idle' && (
              <View style={[styles.heroPosTag, { backgroundColor: '#C9A84C' }]}>
                <Text style={styles.heroPosText}>{state.heroPosition}</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroStack}>{state.heroStack}BB</Text>
          {state.heroBet > 0 && (
            <Text style={styles.heroBetText}>Bet: {state.heroBet}BB</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    overflow: 'visible',
    alignSelf: 'center',
  },
  felt: {
    backgroundColor: '#1B4D2E',
    borderWidth: 8,
    borderColor: '#0F3320',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'visible',
  },
  feltInner: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#235C38',
    borderStyle: 'dashed',
  },
  potBadge: {
    position: 'absolute',
    top: '34%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },
  potLabel: { color: '#C9A84C', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  potAmount: { color: '#E5C76B', fontSize: 13, fontWeight: '800' },
  communityCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: '55%',
  },
  preflopHint: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C9A84C40',
  },
  preflopHintText: {
    color: '#C9A84C60',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  seatAbsolute: {
    position: 'absolute',
  },

  // Hero area
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  heroCards: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPlaceholder: {
    width: 120,
    height: 74,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C9A84C40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: '#C9A84C40',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroBadge: {
    backgroundColor: '#162A18',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9A84C50',
    minWidth: 80,
  },
  heroPosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { color: '#E5C76B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroPosTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  heroPosText: { color: '#0D1B0F', fontSize: 8, fontWeight: '800' },
  heroStack: { color: '#7A9E7A', fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroBetText: { color: '#C9A84C', fontSize: 10, fontWeight: '600', marginTop: 1 },
});
