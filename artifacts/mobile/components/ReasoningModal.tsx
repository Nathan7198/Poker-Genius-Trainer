import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ReasoningTag, REASONING_OPTIONS } from '@/constants/pokerData';

interface Props {
  visible: boolean;
  onSelect: (tag: ReasoningTag | null) => void;
}

export default function ReasoningModal({ visible, onSelect }: Props) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  function handleSelect(tag: ReasoningTag) {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onSelect(tag);
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent visible={visible}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => onSelect(null)} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.question, { color: colors.foreground }]}>
            Why did you make that decision?
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Your answer builds your player profile
          </Text>

          <View style={styles.grid}>
            {REASONING_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.tag}
                style={[styles.option, { backgroundColor: opt.color + '18', borderColor: opt.color + '55' }]}
                onPress={() => handleSelect(opt.tag)}
                activeOpacity={0.75}
              >
                <Feather name={opt.icon as any} size={20} color={opt.color} />
                <Text style={[styles.optionLabel, { color: opt.color }]} numberOfLines={2}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.skip} onPress={() => onSelect(null)}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  question: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    minHeight: 80,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  skip: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
