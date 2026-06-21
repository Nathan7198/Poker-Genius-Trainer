import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  Position, GRID_RANKS, getGridCell,
  GTO_RANGES, BB_DEFENSE, THREEBET_VALUE, THREEBET_BLUFF,
  STACK_GTO_RANGES, STACK_BB_DEFENSE, SHORT_THREEBET_VALUE,
  StackTier,
} from '@/constants/pokerData';
import { useColors } from '@/hooks/useColors';

interface RangeGridProps {
  position: Position;
  highlightHand?: string;
  showLegend?: boolean;
  compact?: boolean;
  stackTier?: StackTier;
}

export default function RangeGrid({ position, highlightHand, showLegend = true, compact = false, stackTier }: RangeGridProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const cellSize = compact ? Math.floor((width - 40) / 13) - 1 : Math.floor((width - 32) / 13) - 1;

  const range = stackTier
    ? (position === 'BB' ? STACK_BB_DEFENSE[stackTier] : STACK_GTO_RANGES[stackTier][position])
    : (position === 'BB' ? BB_DEFENSE : GTO_RANGES[position]);

  const threebetValue = stackTier === 'push-fold' ? new Set<string>()
    : stackTier === 'short' ? SHORT_THREEBET_VALUE
    : THREEBET_VALUE;
  const threebetBluff = (stackTier === 'short' || stackTier === 'push-fold') ? new Set<string>() : THREEBET_BLUFF;

  const cells = useMemo(() => {
    return GRID_RANKS.map((_, row) =>
      GRID_RANKS.map((_, col) => {
        const { hand, type } = getGridCell(row, col);
        const inOpen = range.has(hand);
        const in3bValue = threebetValue.has(hand);
        const in3bBluff = threebetBluff.has(hand);
        const isHighlighted = hand === highlightHand;
        return { hand, type, inOpen, in3bValue, in3bBluff, isHighlighted };
      })
    );
  }, [position, highlightHand, stackTier]);

  function getCellBg(inOpen: boolean, in3bValue: boolean, in3bBluff: boolean, isHighlighted: boolean): string {
    if (isHighlighted) return '#FFD700';
    if (in3bValue) return '#8B1A1A';
    if (in3bBluff) return '#4A1A6B';
    if (inOpen) return '#1A5E34';
    return '#111E13';
  }

  const openCount = useMemo(() => range.size, [range]);
  const totalHands = 169;
  const openPct = Math.round((openCount / totalHands) * 100);

  return (
    <View style={styles.container}>
      {/* Column headers */}
      <View style={styles.gridRow}>
        <View style={{ width: cellSize }} />
        {GRID_RANKS.map(r => (
          <View key={r} style={[styles.headerCell, { width: cellSize, height: cellSize * 0.7 }]}>
            <Text style={[styles.headerText, { fontSize: cellSize * 0.38 }]}>{r}</Text>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      {cells.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {/* Row header */}
          <View style={[styles.headerCell, { width: cellSize, height: cellSize }]}>
            <Text style={[styles.headerText, { fontSize: cellSize * 0.38 }]}>{GRID_RANKS[ri]}</Text>
          </View>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getCellBg(cell.inOpen, cell.in3bValue, cell.in3bBluff, cell.isHighlighted),
                  borderWidth: cell.isHighlighted ? 1.5 : 0.5,
                  borderColor: cell.isHighlighted ? '#FFD700' : '#1A3A1E',
                },
              ]}
            >
              <Text
                style={[styles.cellText, {
                  fontSize: Math.max(5, cellSize * 0.32),
                  color: cell.inOpen || cell.in3bValue || cell.in3bBluff || cell.isHighlighted
                    ? '#FFFFFFCC'
                    : '#FFFFFF22',
                }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {cell.hand}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <LegendItem color="#1A5E34" label={position === 'BB' ? 'Defend Range' : stackTier === 'push-fold' ? 'Shove Range' : 'Open Range'} />
          {threebetValue.size > 0 && <LegendItem color="#8B1A1A" label="3-Bet Value" />}
          {threebetBluff.size > 0 && <LegendItem color="#4A1A6B" label="3-Bet Bluff" />}
          <LegendItem color="#111E13" label="Fold" />
          {highlightHand && <LegendItem color="#FFD700" label={`Your Hand (${highlightHand})`} />}
        </View>
      )}

      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
          {position === 'BB' ? 'Defense Range' : stackTier === 'push-fold' ? 'Shove Range' : 'Opening Range'}:{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{openPct}%</Text> of hands
          {' · '}{openCount} combos
        </Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  gridRow: {
    flexDirection: 'row',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: '#7A9E7A',
    fontWeight: '700',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1,
  },
  cellText: {
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statsText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
