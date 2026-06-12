import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/constants/pokerData';

const SUIT_SYMBOLS: Record<string, string> = { s:'♠', h:'♥', d:'♦', c:'♣' };
const RED_SUITS = new Set(['h','d']);

interface PlayingCardProps {
  card?: Card;
  size?: 'sm'|'board'|'md'|'lg';
  faceDown?: boolean;
}

export default function PlayingCard({ card, size = 'md', faceDown }: PlayingCardProps) {
  const dims = {
    sm:    { width:28, height:38, rankSize:9,  suitSize:8,  radius:4, pad:2 },
    board: { width:34, height:46, rankSize:11, suitSize:9,  radius:5, pad:2 },
    md:    { width:38, height:52, rankSize:12, suitSize:10, radius:6, pad:3 },
    lg:    { width:54, height:74, rankSize:16, suitSize:14, radius:8, pad:4 },
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
    }]}>
      {/* Top-left corner: rank, then suit below */}
      <View style={[styles.corner, { top: dims.pad, left: dims.pad }]}>
        <Text
          style={{ fontSize: dims.rankSize, color: textColor, fontWeight: '800', lineHeight: dims.rankSize * 1.1 }}
          numberOfLines={1}
        >
          {card.rank}
        </Text>
        <Text style={{ fontSize: dims.suitSize, color: textColor, lineHeight: dims.suitSize, marginTop: -1 }}>
          {suitSym}
        </Text>
      </View>

      {/* Bottom-right corner: same layout, rotated 180° */}
      <View style={[styles.corner, { bottom: dims.pad, right: dims.pad, transform: [{ rotate: '180deg' }] }]}>
        <Text
          style={{ fontSize: dims.rankSize, color: textColor, fontWeight: '800', lineHeight: dims.rankSize * 1.1 }}
          numberOfLines={1}
        >
          {card.rank}
        </Text>
        <Text style={{ fontSize: dims.suitSize, color: textColor, lineHeight: dims.suitSize, marginTop: -1 }}>
          {suitSym}
        </Text>
      </View>
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
  },
  corner: {
    position: 'absolute',
    alignItems: 'center',
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
