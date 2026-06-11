import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '@/context/GameContext';
import { POSITIONS } from '@/constants/pokerData';
import PlayingCard from './PlayingCard';
import PlayerSeat from './PlayerSeat';

// Clockwise from hero (bottom-center):
//   150° = lower-left (1st clockwise = SB when hero is BTN)
//   210° = upper-left
//   270° = top-center
//   330° = upper-right
//    30° = lower-right (last clockwise = CO when hero is BTN)
// In screen coords (y increases downward), going clockwise from the bottom
// means angles INCREASE from 90°: 90→150→210→270→330→30→90.
const OPPONENT_ANGLES_DEG = [150, 210, 270, 330, 30];

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Seats extend AWAY from the table centre:
//  • Upper seats (sin < 0, y < cy) → seat grows upward — anchor at seat bottom
//  • Lower seats (sin > 0, y > cy) → seat grows downward — anchor at seat top
function getSeatTopOffset(angleDeg: number): number {
  return Math.sin(degToRad(angleDeg)) > 0.05 ? -8 : -85;
}

const TABLE_H = 340;
// cy is intentionally above the geometric centre so the lower half has
// more room for community cards (centre band) and the hero area.
const CY = 155;
const RY = 105;

export default function PokerTable() {
  const { state } = useGame();
  const { width } = useWindowDimensions();

  const tableW = width - 16;
  const cx = tableW / 2;
  const rx = tableW * 0.40;

  function getSeatPos(angleDeg: number) {
    const r = degToRad(angleDeg);
    return {
      x: cx + rx * Math.cos(r),
      y: CY + RY * Math.sin(r),
    };
  }

  // Sort opponents clockwise from heroPosition:
  //   seat[0] = first clockwise (e.g. SB when hero is BTN) → lower-left (150°)
  //   seat[4] = last  clockwise (e.g. CO when hero is BTN) → lower-right (30°)
  const heroIdx = POSITIONS.indexOf(state.heroPosition);
  const activePlayers = [...state.players]
    .sort((a, b) => {
      const ai = POSITIONS.indexOf(a.position as (typeof POSITIONS)[number]);
      const bi = POSITIONS.indexOf(b.position as (typeof POSITIONS)[number]);
      return ((ai - heroIdx + POSITIONS.length) % POSITIONS.length) -
             ((bi - heroIdx + POSITIONS.length) % POSITIONS.length);
    })
    .slice(0, 5);

  return (
    <View style={[styles.outer, { height: TABLE_H + 90, width: tableW }]}>
      {/* Table felt */}
      <View style={[styles.felt, { width: tableW, height: TABLE_H, borderRadius: TABLE_H / 2 + 8 }]}>
        {/* Inner dashed border */}
        <View style={[styles.feltInner, { width: tableW - 40, height: TABLE_H - 40, borderRadius: TABLE_H / 2 }]} />

        {/* Bot player seats — absolutely positioned on the oval */}
        {activePlayers.map((player, i) => {
          const pos = getSeatPos(OPPONENT_ANGLES_DEG[i]);
          const topOffset = getSeatTopOffset(OPPONENT_ANGLES_DEG[i]);
          return (
            <View
              key={player.id}
              style={[styles.seatAbsolute, { left: pos.x - 36, top: pos.y + topOffset }]}
            >
              <PlayerSeat player={player} showCards={state.phase === 'showdown'} />
            </View>
          );
        })}

        {/* Pot display — sits in the clear band below upper seats */}
        {state.pot > 0 && (
          <View style={styles.potBadge}>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potAmount}>{state.pot.toFixed(1)} BB</Text>
          </View>
        )}

        {/* Community cards — in the clear band above lower seats */}
        <View style={styles.communityCards}>
          {state.phase !== 'idle' && state.phase !== 'preflop' ? (
            state.communityCards.slice(0, 5).map((card, i) => (
              <PlayingCard key={i} card={card} size="sm" faceDown={!card.faceUp} />
            ))
          ) : state.phase === 'preflop' ? (
            <View style={styles.preflopHint}>
              <Text style={styles.preflopHintText}>PREFLOP</Text>
            </View>
          ) : null}
        </View>
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
    // Sits at 22 % of TABLE_H (~75 px): below top seat, above community cards
    top: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    // Sits at 39 % of TABLE_H (~133 px): below upper seats, above lower seats
    top: '39%',
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
