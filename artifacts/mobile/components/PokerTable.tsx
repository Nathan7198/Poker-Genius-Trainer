import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '@/context/GameContext';
import PlayingCard from './PlayingCard';
import PlayerSeat from './PlayerSeat';

// Seat angles going clockwise from hero at the bottom
const OPPONENT_ANGLES_DEG = [30, 330, 270, 210, 150]; // bottom-right, right, top, left, bottom-left

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export default function PokerTable() {
  const { state } = useGame();
  const { width } = useWindowDimensions();
  const TABLE_H = 280;
  const cx = width / 2;
  const cy = TABLE_H / 2;
  const rx = width * 0.41;
  const ry = TABLE_H * 0.37;

  function getSeatPos(angleDeg: number) {
    const r = degToRad(angleDeg);
    return {
      x: cx + rx * Math.cos(r),
      y: cy + ry * Math.sin(r),
    };
  }

  const activePlayers = state.players.slice(0, 5);
  const visibleCommunity = state.communityCards.filter(c => c.faceUp);

  return (
    <View style={[styles.outer, { height: TABLE_H + 40 }]}>
      {/* Table felt */}
      <View style={[styles.felt, { width: width - 16, height: TABLE_H, borderRadius: (TABLE_H / 2) + 10 }]}>
        {/* Inner felt highlight */}
        <View style={[styles.feltInner, { width: width - 56, height: TABLE_H - 40, borderRadius: (TABLE_H / 2) }]} />

        {/* Pot display */}
        <View style={styles.potContainer}>
          {state.pot > 0 && (
            <View style={styles.potBadge}>
              <Text style={styles.potLabel}>POT</Text>
              <Text style={styles.potAmount}>{state.pot.toFixed(1)} BB</Text>
            </View>
          )}
        </View>

        {/* Community cards */}
        <View style={styles.communityCards}>
          {state.phase !== 'idle' && state.phase !== 'preflop' ? (
            <>
              {state.communityCards.slice(0, 5).map((card, i) => (
                <View key={i} style={styles.communityCardWrap}>
                  <PlayingCard card={card} size="md" faceDown={!card.faceUp} />
                </View>
              ))}
            </>
          ) : state.phase === 'preflop' ? (
            <View style={styles.preflopHint}>
              <Text style={styles.preflopHintText}>PREFLOP</Text>
            </View>
          ) : null}
        </View>

        {/* Phase indicator */}
        {state.phase !== 'idle' && (
          <View style={styles.phaseIndicator}>
            <Text style={styles.phaseText}>{state.phase.toUpperCase()}</Text>
          </View>
        )}

        {/* Bot players */}
        {activePlayers.map((player, i) => {
          const angleDeg = OPPONENT_ANGLES_DEG[i];
          const pos = getSeatPos(angleDeg);
          return (
            <View
              key={player.id}
              style={[styles.seatAbsolute, { left: pos.x - 36, top: pos.y - 50 }]}
            >
              <PlayerSeat player={player} showCards={state.phase === 'showdown'} />
            </View>
          );
        })}
      </View>

      {/* Hero seat at the bottom */}
      <View style={styles.heroSeatRow}>
        {/* Hero cards */}
        <View style={styles.heroCards}>
          {state.heroCards.map((card, i) => (
            <View key={i} style={{ marginHorizontal: 3 }}>
              <PlayingCard card={card} size="lg" />
            </View>
          ))}
          {state.phase === 'idle' && (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>YOUR HAND</Text>
            </View>
          )}
        </View>

        {/* Hero badge */}
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
    paddingHorizontal: 8,
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
  potContainer: {
    position: 'absolute',
    top: '35%',
    alignItems: 'center',
  },
  potBadge: {
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
  potLabel: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  potAmount: {
    color: '#E5C76B',
    fontSize: 13,
    fontWeight: '800',
  },
  communityCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: '52%',
  },
  communityCardWrap: {},
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
  phaseIndicator: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  phaseText: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  seatAbsolute: {
    position: 'absolute',
  },
  heroSeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  heroLabel: {
    color: '#E5C76B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroPosTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  heroPosText: {
    color: '#0D1B0F',
    fontSize: 8,
    fontWeight: '800',
  },
  heroStack: {
    color: '#7A9E7A',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroBetText: {
    color: '#C9A84C',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});
