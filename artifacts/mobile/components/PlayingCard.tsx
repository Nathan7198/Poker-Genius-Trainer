import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/constants/pokerData';

const SUIT_SYMBOLS: Record<string, string> = { s:'♠', h:'♥', d:'♦', c:'♣' };
const RED_SUITS = new Set(['h','d']);

interface PlayingCardProps {
  card?: Card;
  size?: 'sm'|'md'|'lg';
  faceDown?: boolean;
}

export default function PlayingCard({ card, size = 'md', faceDown }: PlayingCardProps) {
  const dims = {
    sm: { width:28, height:38, rankSize:10, suitSize:9, radius:4, pTop:2, pSide:3 },
    md: { width:38, height:52, rankSize:14, suitSize:13, radius:6, pTop:3, pSide:4 },
    lg: { width:54, height:74, rankSize:20, suitSize:18, radius:8, pTop:4, pSide:6 },
  }[size];

  if (faceDown || !card?.faceUp) {
    return (
      <View style={[styles.card, {
        width: dims.width, height: dims.height, borderRadius: dims.radius,
        backgroundColor: '#1A5E34',
        borderColor: '#C9A84C', borderWidth: 1.5,
      }]}>
        <View style={styles.backPattern}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={[styles.backLine, { opacity: 0.3 + i * 0.15 }]} />
          ))}
        </View>
      </View>
    );
  }

  const isRed = RED_SUITS.has(card.suit);
  const suitSym = SUIT_SYMBOLS[card.suit] ?? card.suit;
  const textColor = isRed ? '#CC2222' : '#1A1A1A';

  return (
    <View style={[styles.card, {
      width: dims.width, height: dims.height, borderRadius: dims.radius,
      paddingTop: dims.pTop, paddingHorizontal: dims.pSide,
    }]}>
      <Text style={[styles.rankTop, { fontSize: dims.rankSize, color: textColor }]} numberOfLines={1}>
        {card.rank}
      </Text>
      <Text style={[styles.suitCenter, { fontSize: dims.suitSize * 1.4, color: textColor }]}>
        {suitSym}
      </Text>
      <Text style={[styles.rankBottom, { fontSize: dims.rankSize, color: textColor }]} numberOfLines={1}>
        {card.rank}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAF5',
    borderWidth: 1,
    borderColor: '#E0DDD0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankTop: {
    fontWeight: '700',
    lineHeight: undefined,
    alignSelf: 'flex-start',
  },
  suitCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -14 }],
  },
  rankBottom: {
    fontWeight: '700',
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  backPattern: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  backLine: {
    height: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },
});
