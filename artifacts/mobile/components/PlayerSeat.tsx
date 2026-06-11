import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BotPlayer } from '@/context/GameContext';
import { POSITION_COLORS, PLAYER_TYPE_INFO } from '@/constants/pokerData';
import PlayingCard from './PlayingCard';
import { useColors } from '@/hooks/useColors';

interface PlayerSeatProps {
  player: BotPlayer;
  showCards?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  fold: '#95A5A6',
  call: '#3498DB',
  raise: '#E67E22',
  check: '#27AE60',
};

const TYPE_ICONS: Record<string, string> = {
  TAG: 'shield',
  LAG: 'zap',
  Nit: 'lock',
  Fish: 'anchor',
  Maniac: 'flame' as any,
};

export default function PlayerSeat({ player, showCards }: PlayerSeatProps) {
  const colors = useColors();
  const typeInfo = PLAYER_TYPE_INFO[player.type];
  const posColor = POSITION_COLORS[player.position];
  const folded = !player.isActive;

  return (
    <View style={[styles.container, folded && styles.folded]}>
      {/* Position badge */}
      <View style={[styles.posBadge, { backgroundColor: posColor }]}>
        <Text style={styles.posText}>{player.position}</Text>
      </View>

      {/* Cards */}
      <View style={styles.cards}>
        {player.cards.slice(0, 2).map((c, i) => (
          <View key={i} style={[styles.cardWrap, { marginLeft: i > 0 ? -8 : 0 }]}>
            <PlayingCard card={c} size="sm" faceDown={!showCards} />
          </View>
        ))}
      </View>

      {/* Player type badge */}
      <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '22', borderColor: typeInfo.color + '55' }]}>
        <Feather name={(TYPE_ICONS[player.type] ?? 'user') as any} size={7} color={typeInfo.color} />
        <Text style={[styles.typeText, { color: typeInfo.color }]} numberOfLines={1}>
          {typeInfo.shortLabel} · {typeInfo.vpip}%
        </Text>
      </View>

      {/* Player info */}
      <View style={[styles.info, { backgroundColor: colors.card }]}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={[styles.stack, { color: colors.mutedForeground }]}>
          {player.stack}BB
        </Text>
      </View>

      {/* Action bubble */}
      {player.action && !folded && (
        <View style={[styles.actionBubble, { backgroundColor: ACTION_COLORS[player.action] ?? '#666' }]}>
          <Text style={styles.actionText}>{player.action.toUpperCase()}</Text>
        </View>
      )}
      {folded && (
        <View style={[styles.actionBubble, { backgroundColor: '#4A4A4A' }]}>
          <Text style={styles.actionText}>FOLD</Text>
        </View>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <View style={styles.betBadge}>
          <Text style={styles.betText}>{player.currentBet}BB</Text>
        </View>
      )}

      {/* Dealer button */}
      {player.isDealer && (
        <View style={styles.dealerBtn}>
          <Text style={styles.dealerText}>D</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 72,
  },
  folded: {
    opacity: 0.45,
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 3,
  },
  posText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cards: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  cardWrap: {
    zIndex: 1,
  },
  info: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 60,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 2,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 9,
    fontWeight: '600',
  },
  stack: {
    fontSize: 8,
    fontWeight: '500',
  },
  actionBubble: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
  },
  betBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#C9A84C',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  betText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '700',
  },
  dealerBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  dealerText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#1A1A1A',
  },
});
