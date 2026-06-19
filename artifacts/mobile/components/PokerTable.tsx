import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '@/context/GameContext';
import { PREFLOP_ORDER, Position } from '@/constants/pokerData';
import PlayingCard from './PlayingCard';
import PlayerSeat from './PlayerSeat';

// Dynamic seat angles: N opponents spread from 150° to 30° counter-clockwise
// through the top (240° arc). N=5 reproduces the original [150,210,270,330,30].
function getOpponentAngles(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [270];
  return Array.from({ length: n }, (_, i) => (150 + (i * 240) / (n - 1)) % 360);
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Seats extend AWAY from the table centre:
//  • Upper seats (sin < 0, y < cy) → seat grows upward — anchor at seat bottom
//  • Lower seats (sin > 0, y > cy) → seat grows downward — anchor at seat top
function getSeatTopOffset(angleDeg: number): number {
  return Math.sin(degToRad(angleDeg)) > 0.05 ? -8 : -85;
}

export default function PokerTable() {
  const { state } = useGame();
  const { width, height } = useWindowDimensions();

  // Reserve space for: top-bar(~52) + tab(~94) + panel + hero row(~90) + padding(~20).
  // GTO mode panel is ~50px taller than worst-case non-GTO, so reserve more.
  const panelReserve = state.trainingMode === 'gto' ? 596 : 546;
  const TABLE_H = Math.max(200, Math.min(340, height - panelReserve));
  // CY/RY proportional to TABLE_H (original ratios: 155/340, 105/340)
  const CY = Math.round(TABLE_H * 0.456);
  const RY = Math.round(TABLE_H * 0.309);

  // Upper seats are absolutely positioned with a -85px topOffset, meaning they
  // extend above the outer view.  Bake that overflow into paddingTop so the
  // outer view fully contains all visible content — no clipping behind the header.
  const TOP_SEAT_Y = CY - RY;           // y of top seat centre within felt
  const SEAT_OVERFLOW = Math.max(0, 85 - TOP_SEAT_Y); // px extending above felt top

  const heroFolded = state.phase === 'showdown' && state.lastHeroAction === 'fold';

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

  // Map each opponent to a fixed seat slot by their clockwise rank from hero.
  // Use PREFLOP_ORDER (all 9 positions) so new positions like UTG2/MP work.
  const heroIdx = PREFLOP_ORDER.indexOf(state.heroPosition);
  const numBots = state.players.length;
  const opponentAngles = getOpponentAngles(numBots);
  const isPostFlop = ['flop', 'turn', 'river', 'showdown'].includes(state.phase);

  const handActiveSet = new Set(state.handActivePlayers);
  const playerSeats = state.players
    .filter(p => {
      // Showdown: only show players who were live at the river
      if (state.phase === 'showdown') {
        if (handActiveSet.size > 0) return handActiveSet.has(p.position as Position);
        return p.isActive || p.position === state.mainVillainPosition;
      }
      // All other phases: show every seat so the table always looks full
      return true;
    })
    .map(p => {
      const pi = PREFLOP_ORDER.indexOf(p.position as Position);
      const rank = (pi - heroIdx + PREFLOP_ORDER.length) % PREFLOP_ORDER.length; // 1..N

      let displayPlayer = p;
      if (isPostFlop && state.phase !== 'showdown') {
        const psa = state.playerStreetActions[p.position as Position];
        const showChip = psa?.action === 'bet' || psa?.action === 'raise' || psa?.action === 'call';
        // Player is active mid-street only if not folded preflop AND still in handActivePlayers
        const isActiveMid = p.isActive && (handActiveSet.size === 0 || handActiveSet.has(p.position as Position));
        displayPlayer = {
          ...p,
          isActive: isActiveMid,
          action: isActiveMid ? (psa?.action ?? null) : null,
          currentBet: isActiveMid && showChip ? (psa?.betBB ?? 0) : 0,
        };
      } else if (isPostFlop) {
        const psa = state.playerStreetActions[p.position as Position];
        const showChip = psa?.action === 'bet' || psa?.action === 'raise' || psa?.action === 'call';
        displayPlayer = {
          ...p,
          action: psa?.action ?? null,
          currentBet: showChip ? (psa?.betBB ?? 0) : 0,
        };
      }

      return { player: displayPlayer, seatIdx: rank - 1 }; // seatIdx 0..N-1
    })
    .filter(s => s.seatIdx >= 0 && s.seatIdx < numBots);

  return (
    <View style={[styles.outer, { height: TABLE_H + SEAT_OVERFLOW + 90, paddingTop: SEAT_OVERFLOW, width: tableW }]}>
      {/* Table felt */}
      <View style={[styles.felt, { width: tableW, height: TABLE_H, borderRadius: TABLE_H / 2 }]}>
        {/* Outer border overlay — rendered as overlay so it doesn't shift absolute children */}
        <View style={[styles.feltBorder, { borderRadius: TABLE_H / 2 + 8 }]} pointerEvents="none" />
        {/* Inner dashed border */}
        <View style={[styles.feltInner, { width: tableW - 40, height: TABLE_H - 40, borderRadius: TABLE_H / 2 }]} />

        {/* Bot player seats — absolutely positioned on the oval */}
        {playerSeats.map(({ player, seatIdx }) => {
          const angleDeg = opponentAngles[seatIdx] ?? 270;
          const pos = getSeatPos(angleDeg);
          const topOffset = getSeatTopOffset(angleDeg);
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
            <View style={styles.potBadgeInner}>
              <Text style={styles.potLabel}>POT</Text>
              <Text style={styles.potAmount}>{state.pot.toFixed(1)} BB</Text>
            </View>
          </View>
        )}

        {/* Community cards — in the clear band above lower seats */}
        <View style={styles.communityCards}>
          {state.phase !== 'idle' && state.phase !== 'preflop' ? (
            state.communityCards.slice(0, 5).map((card, i) => (
              <PlayingCard key={i} card={card} size="board" faceDown={!card.faceUp} />
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

        <View style={[styles.heroBadge, heroFolded && styles.heroBadgeFolded]}>
          <View style={styles.heroPosRow}>
            <Text style={styles.heroLabel}>YOU</Text>
            {state.phase !== 'idle' && (
              <View style={[styles.heroPosTag, { backgroundColor: heroFolded ? '#E74C3C' : '#A8882A' }]}>
                <Text style={styles.heroPosText}>{state.heroPosition}</Text>
              </View>
            )}
          </View>
          {heroFolded ? (
            <Text style={styles.heroFoldedLabel}>FOLDED</Text>
          ) : (
            <>
              <Text style={styles.heroStack}>{Number.isInteger(state.heroStack) ? state.heroStack : state.heroStack.toFixed(1)}BB</Text>
              {state.heroBet > 0 && (
                <Text style={styles.heroBetText}>Bet: {state.heroBet}BB</Text>
              )}
            </>
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
    backgroundColor: '#163224',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  feltBorder: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderWidth: 8,
    borderColor: '#0A1E14',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  feltInner: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#1E4A32',
    borderStyle: 'dashed',
  },
  potBadge: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  potBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A8882A40',
  },
  potLabel: { color: '#A8882A', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  potAmount: { color: '#C8A840', fontSize: 13, fontWeight: '800' },
  communityCards: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
  },
  preflopHint: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A8882A40',
  },
  preflopHintText: {
    color: '#A8882A60',
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
    borderColor: '#A8882A40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: '#A8882A40',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroBadge: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A8882A50',
    minWidth: 80,
  },
  heroBadgeFolded: {
    backgroundColor: '#2A1616',
    borderColor: '#E74C3C50',
  },
  heroFoldedLabel: {
    color: '#E74C3C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  heroPosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { color: '#C8A840', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroPosTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  heroPosText: { color: '#0A0A0A', fontSize: 8, fontWeight: '800' },
  heroStack: { color: '#5A6A5A', fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroBetText: { color: '#A8882A', fontSize: 10, fontWeight: '600', marginTop: 1 },
});
