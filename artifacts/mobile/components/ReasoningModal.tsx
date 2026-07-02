import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { HandHistoryEntry } from '@/context/StatsContext';

interface Feedback {
  correct: boolean;
  headline: string;
  body: string;
}

interface Props {
  visible: boolean;
  heroFolded?: boolean;
  hand?: HandHistoryEntry;
  onNext: () => void;
}

function getFeedback(hand: HandHistoryEntry, heroFolded: boolean): Feedback {
  const pos   = hand.heroPosition;
  const cards = hand.heroNotation;
  const board = hand.boardTexture.toLowerCase();

  if (heroFolded) {
    const foldStreetData = hand.streets.find(s => s.action === 'fold');
    const correct = hand.foldedStreet === 'preflop'
      ? hand.preflopGTO
      : (foldStreetData?.isGTO ?? true);
    const madeHand = foldStreetData?.madeHand ?? '';

    if (correct) {
      if (hand.foldedStreet === 'preflop') {
        return {
          correct: true,
          headline: 'Correct fold',
          body: `${cards} from ${pos} sits outside your GTO opening range from this seat. Folding here is the highest-EV play — keeping your opening range tight avoids difficult postflop spots out of position and against stronger hands.`,
        };
      }
      return {
        correct: true,
        headline: 'Correct fold',
        body: `Laying down${madeHand ? ` ${madeHand.toLowerCase()}` : ''} on the ${hand.foldedStreet} was the right call. On this ${board} board the risk/reward of continuing didn't add up — a disciplined fold here protects your stack for better spots.`,
      };
    }

    // Wrong fold
    if (hand.foldedStreet === 'preflop') {
      return {
        correct: false,
        headline: 'Too tight preflop',
        body: `${cards} from ${pos} IS in your GTO opening range — folding was a mistake. You're giving up a profitable spot by playing too tight from this seat. Review your opening ranges in the Learn tab and make sure you know which hands to open from each position.`,
      };
    }

    // Postflop fold mistake
    let hint = '';
    if (madeHand.toLowerCase().includes('draw')) {
      hint = `With a draw you almost always have enough equity to continue — consider a call for implied odds or a raise to apply fold equity.`;
    } else if (madeHand.toLowerCase().includes('pair') || madeHand.toLowerCase().includes('two')) {
      hint = `A pair or two pair usually has enough showdown value to call here, especially on a ${board} board.`;
    } else {
      hint = `Even with a marginal holding the pot odds and your position made continuing the higher-EV play.`;
    }

    return {
      correct: false,
      headline: `Folded too soon on the ${hand.foldedStreet}`,
      body: `${madeHand ? `You had ${madeHand.toLowerCase()}` : 'Your hand'} on a ${board} board. ${hint} Don't give up equity without a strong reason — folding too often is an exploitable leak.`,
    };
  }

  // Hero played to showdown
  const correct = hand.totalMistakes === 0;
  const n = hand.totalMistakes;

  if (correct) {
    const lastStreet = hand.streets[hand.streets.length - 1];
    const madeHand = lastStreet?.madeHand ?? '';
    return {
      correct: true,
      headline: 'Well played',
      body: `No GTO mistakes this hand${madeHand ? ` — you correctly played ${madeHand.toLowerCase()} to showdown` : ''}. You made the right decision on every street. Consistent play like this is how you build long-term profit.`,
    };
  }

  // Mistakes on played streets
  const badStreets = hand.streets.filter(s => !s.isGTO);
  const adviceByAction: Record<string, string> = {
    call:  'Calling can trap you with a capped range. GTO often prefers a raise to build the pot or a fold to cut losses.',
    check: 'Checking here gave villain a free card. GTO recommends betting to protect your equity and start building the pot.',
    bet:   'That spot called for caution — GTO prefers a check here to keep villain\'s bluffing range active and disguise your hand strength.',
    raise: 'The raise wasn\'t warranted here. GTO takes a more passive line — save aggression for spots with clear value or semi-bluff equity.',
    fold:  'You had enough equity or showdown value to continue. That fold was too tight given the pot odds and hand strength.',
  };

  if (badStreets.length > 0) {
    const streetDesc = badStreets.length === 1
      ? `the ${badStreets[0].street}`
      : badStreets.map(s => s.street).join(' and the ');
    const advice = adviceByAction[badStreets[0].action] ?? 'Review the GTO recommendation for this street.';
    return {
      correct: false,
      headline: `${n} GTO mistake${n !== 1 ? 's' : ''}`,
      body: `You deviated from GTO on ${streetDesc}. ${advice}`,
    };
  }

  return {
    correct: false,
    headline: `${n} GTO mistake${n !== 1 ? 's' : ''}`,
    body: `GTO found ${n} deviation${n !== 1 ? 's' : ''} from optimal play this hand. Check the hand breakdown on the previous screen to see exactly where things went wrong and what the correct line was.`,
  };
}

export default function ReasoningModal({ visible, heroFolded, hand, onNext }: Props) {
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

  if (!visible) return null;

  const feedback = hand ? getFeedback(hand, !!heroFolded) : null;
  const accent = feedback?.correct ? '#27AE60' : '#E74C3C';

  function handleNext() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    onNext();
  }

  return (
    <Modal transparent animationType="none" statusBarTranslucent visible={visible}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onNext} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {feedback ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
                <Feather
                  name={feedback.correct ? 'check-circle' : 'x-circle'}
                  size={42}
                  color={accent}
                />
              </View>

              <Text style={[styles.headline, { color: accent }]}>
                {feedback.headline}
              </Text>

              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.body, { color: colors.foreground }]}>
                  {feedback.body}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: accent }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Next Hand</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            // No hand data yet — just let them proceed
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.border, marginTop: 8 }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextBtnText, { color: colors.foreground }]}>Next Hand</Text>
              <Feather name="arrow-right" size={18} color={colors.foreground as string} />
            </TouchableOpacity>
          )}
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
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  bodyScroll: {
    flexGrow: 0,
    marginBottom: 24,
  },
  bodyContent: {
    paddingHorizontal: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
