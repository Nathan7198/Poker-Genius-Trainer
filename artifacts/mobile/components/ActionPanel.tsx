import React, { useState } from 'react';
import {
  Animated, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame, HeroAction } from '@/context/GameContext';
import { useColors } from '@/hooks/useColors';
import { calcPotOdds, getEquity, getHandNotation, getHandStrength, STRENGTH_COLORS, Difficulty } from '@/constants/pokerData';

const RAISE_PRESETS = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];

export default function ActionPanel() {
  const { state, heroAct } = useGame();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const [raiseMode, setRaiseMode] = useState(false);
  const [selectedRaise, setSelectedRaise] = useState(3);

  if (state.phase !== 'preflop' || state.showAnalysis) return null;

  const { actionCtx, heroCards, heroPosition, difficulty } = state;
  const notation = heroCards.length === 2 ? getHandNotation(heroCards[0], heroCards[1]) : '';
  const equity = notation ? getEquity(notation) : 50;
  const potOdds = calcPotOdds(actionCtx.raiseAmount, actionCtx.potSize);
  const strength = notation ? getHandStrength(notation) : 'Weak';
  const strengthColor = STRENGTH_COLORS[strength];
  const showInfo = difficulty === 'Beginner' || difficulty === 'Intermediate';
  const showSuggestion = difficulty === 'Beginner';

  function handleAction(action: HeroAction, raiseBB?: number) {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    heroAct(action, raiseBB);
    setRaiseMode(false);
  }

  const gtoRecommendation = (() => {
    if (!notation) return null;
    const { GTO_RANGES, BB_DEFENSE } = require('@/constants/pokerData');
    if (!actionCtx.facingRaise) {
      return GTO_RANGES[heroPosition].has(notation) ? 'RAISE' : 'FOLD';
    }
    if (heroPosition === 'BB') {
      return BB_DEFENSE.has(notation) ? 'CALL/3BET' : 'FOLD';
    }
    return equity >= potOdds ? 'CALL' : 'FOLD';
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Info row */}
      {showInfo && notation && (
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>HAND</Text>
            <Text style={[styles.infoValue, { color: strengthColor }]}>{notation}</Text>
            <Text style={[styles.infoSub, { color: strengthColor }]}>{strength}</Text>
          </View>
          {actionCtx.facingRaise && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>POT ODDS</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{potOdds}%</Text>
              <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>need to call</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>EQUITY</Text>
            <Text style={[styles.infoValue, { color: equity > 55 ? colors.success : equity > 48 ? colors.warning : '#E74C3C' }]}>
              {equity}%
            </Text>
            <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>vs random</Text>
          </View>
          {showSuggestion && gtoRecommendation && (
            <View style={[styles.infoItem, styles.suggestion]}>
              <Text style={styles.infoLabel}>GTO</Text>
              <Text style={[styles.suggestionText, { color: gtoRecommendation.includes('RAISE') || gtoRecommendation.includes('CALL') ? '#27AE60' : '#E74C3C' }]}>
                {gtoRecommendation}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Opponent action context */}
      {actionCtx.facingRaise && (
        <View style={[styles.actionContext, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
            {actionCtx.raisedByPosition
              ? `${actionCtx.raisedByPosition} raised to ${actionCtx.raiseAmount}BB`
              : `Facing ${actionCtx.raiseAmount}BB raise`}
            {actionCtx.calledByCount > 0 ? ` · ${actionCtx.calledByCount} caller(s)` : ''}
          </Text>
        </View>
      )}

      {/* Raise size selector */}
      {raiseMode && (
        <View style={styles.raisePicker}>
          <Text style={[styles.raisePickerLabel, { color: colors.mutedForeground }]}>SELECT RAISE SIZE (BB)</Text>
          <View style={styles.raisePresets}>
            {RAISE_PRESETS.map(bb => (
              <TouchableOpacity
                key={bb}
                style={[styles.raisePreset, selectedRaise === bb && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedRaise(bb)}
              >
                <Text style={[styles.raisePresetText, { color: selectedRaise === bb ? colors.primaryForeground : colors.foreground }]}>
                  {bb}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.confirmRaiseBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAction('raise', selectedRaise)}
          >
            <Text style={[styles.confirmRaiseText, { color: colors.primaryForeground }]}>
              RAISE TO {selectedRaise}BB
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main action buttons */}
      {!raiseMode && (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.foldBtn]}
            onPress={() => handleAction('fold')}
          >
            <Text style={styles.btnText}>FOLD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.callBtn, { flex: 1 }]}
            onPress={() => handleAction(actionCtx.facingRaise ? 'call' : 'check')}
          >
            <Text style={styles.btnText}>
              {actionCtx.facingRaise ? `CALL ${actionCtx.raiseAmount}BB` : 'CHECK'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.raiseBtn]}
            onPress={() => setRaiseMode(true)}
          >
            <Text style={styles.btnText}>
              {actionCtx.facingRaise ? '3-BET' : 'RAISE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {raiseMode && (
        <TouchableOpacity onPress={() => setRaiseMode(false)} style={styles.cancelRaise}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  infoItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  infoLabel: {
    fontSize: 8,
    color: '#7A9E7A',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  infoSub: {
    fontSize: 8,
    fontWeight: '500',
  },
  suggestion: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionContext: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  foldBtn: {
    backgroundColor: '#7F3F3F',
    flex: 0.8,
  },
  callBtn: {
    backgroundColor: '#1B5EA6',
  },
  raiseBtn: {
    backgroundColor: '#8A6D28',
    flex: 0.9,
  },
  raisePicker: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  raisePickerLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  raisePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  raisePreset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1B3A1E',
    borderWidth: 1,
    borderColor: '#2D5030',
  },
  raisePresetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmRaiseBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  confirmRaiseText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelRaise: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
