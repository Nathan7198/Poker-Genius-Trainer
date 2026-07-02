import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ReasoningTag, REASONING_OPTIONS, FOLD_REASONING_OPTIONS } from '@/constants/pokerData';
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
  onSelect: (tag: ReasoningTag | null) => void;
}

function getFeedback(hand: HandHistoryEntry, tag: ReasoningTag, heroFolded: boolean): Feedback {
  const pos  = hand.heroPosition;
  const cards = hand.heroNotation;

  if (heroFolded) {
    const correct = hand.foldedStreet === 'preflop'
      ? hand.preflopGTO
      : (hand.streets.find(s => s.action === 'fold')?.isGTO ?? true);

    switch (tag) {
      case 'range_miss':
        return correct
          ? {
              correct,
              headline: 'Correct fold',
              body: `${cards} from ${pos} is outside your GTO range for this spot. Folding here keeps your range balanced and unexploitable.`,
            }
          : {
              correct,
              headline: 'That was a mistake',
              body: `${cards} from ${pos} ${hand.foldedStreet === 'preflop' ? 'IS in your GTO opening range' : 'was worth continuing with here'}. Study your ranges for this position — this hand should be played.`,
            };

      case 'pot_odds':
        return correct
          ? {
              correct,
              headline: 'Good discipline',
              body: `The price wasn't right to continue. You correctly identified that the pot odds didn't justify a call here.`,
            }
          : {
              correct,
              headline: 'That was a mistake',
              body: `The pot odds actually justified continuing. With the amount already in the pot relative to the call size, you had the right price to play on — trust the maths over your instincts here.`,
            };

      case 'vs_aggression':
        return correct
          ? {
              correct,
              headline: 'Correct laydown',
              body: `Against this level of aggression, ${cards} from ${pos} doesn't have enough equity or playability to continue profitably. Good read.`,
            }
          : {
              correct,
              headline: 'That was a mistake',
              body: `${cards} from ${pos} has enough equity and playability to continue despite the aggression. Review your calling and 3-bet frequencies vs. different raise sizes from this position.`,
            };

      case 'range_unknown':
        return correct
          ? {
              correct,
              headline: 'Fold was right — know your range',
              body: `The fold was correct, but you should make it automatic. Study your GTO opening and continuing ranges by position so you never have to guess in future.`,
            }
          : {
              correct,
              headline: "Mistake — and you didn't know your range",
              body: `That was a GTO error, and uncertainty about your range made it harder to play correctly. ${cards} from ${pos} belongs in your GTO range. Drill your ranges in the Learn tab.`,
            };

      case 'speculative':
        return correct
          ? {
              correct,
              headline: 'Correct fold',
              body: `${cards} is marginal enough here that folding is the right play. You correctly identified the hand wasn't worth the risk at this position and stack depth.`,
            }
          : {
              correct,
              headline: 'That was a mistake',
              body: `${cards} from ${pos} has enough equity and implied odds to be profitable here. Don't underestimate speculative hands — they shine against deep stacks and passive players.`,
            };

      case 'board_fear':
        return correct
          ? {
              correct,
              headline: 'Correct fold',
              body: `That board texture does heavily favour villain's range. You made a good read and found a clean laydown.`,
            }
          : {
              correct,
              headline: 'That was a mistake',
              body: `Villain's range doesn't connect with the board as reliably as you feared. Scary runouts often hit YOUR range too — or create perfect bluffing opportunities. Don't give up too easily.`,
            };

      default:
        return correct
          ? { correct, headline: 'Correct fold', body: 'GTO agrees with this fold. Well judged.' }
          : { correct, headline: 'That was a mistake', body: 'GTO says you should have continued. Review each street to understand what changed the EV.' };
    }
  } else {
    const correct = hand.totalMistakes === 0;
    const n = hand.totalMistakes;
    const mistakeLabel = `${n} GTO mistake${n !== 1 ? 's' : ''}`;

    switch (tag) {
      case 'value':
        return correct
          ? {
              correct,
              headline: 'Well played',
              body: `Your value bet / call was GTO correct. You extracted maximum chips when you had the best of it — keep recognising these spots.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `Some of your value decisions were off. GTO uses a mixed strategy — not every made hand is a bet. Check whether your hand was strong enough for value vs. the specific range you were facing on each street.`,
            };

      case 'protect':
        return correct
          ? {
              correct,
              headline: 'Well played',
              body: `Protecting your equity was the right approach here. Your bet denied villain the odds they needed to realise their draw equity cheaply.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `Protection betting can backfire. GTO doesn't always bet for protection — sometimes checking is higher EV, keeping villain's weak hands in so they can bluff later streets into your strong range.`,
            };

      case 'bluff':
        return correct
          ? {
              correct,
              headline: 'Well timed',
              body: `GTO agrees this was a good bluffing spot. You applied pressure in the right situation with the right hand.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `This bluff didn't have the right ingredients. Before firing, ask: do you have good blockers? Does the board hit your range more than villain's? Is villain capable of folding here?`,
            };

      case 'fold_equity':
        return correct
          ? {
              correct,
              headline: 'Good aggression',
              body: `You correctly identified a high fold-equity spot and GTO backs you up. Keep targeting situations where villain's range is capped or their calling range is weak.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `Villain wasn't folding enough here. Better fold-equity targets are players with capped ranges — someone who checked back the flop, for example, can rarely have the nuts.`,
            };

      case 'board_fear':
        return correct
          ? {
              correct,
              headline: 'Good read',
              body: `Playing carefully here was the right call. You correctly identified that the board texture warranted a more cautious line.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `Playing passively because the board scared you was a mistake. These boards often hit your range too — and even when they don't, they create great opportunities to represent strength.`,
            };

      case 'unknown':
        return correct
          ? {
              correct,
              headline: 'Turned out right',
              body: `The hand went well despite the uncertainty — but don't rely on that. Use this as motivation to study the spots you find confusing, so next time you know exactly why you're making each play.`,
            }
          : {
              correct,
              headline: mistakeLabel,
              body: `Without a clear plan, GTO mistakes are hard to avoid. Focus on the spots you face most often — pot odds, range advantages, and correct sizing for each scenario.`,
            };

      default:
        return correct
          ? { correct, headline: 'Correct play', body: 'GTO agrees with your decision. Well done.' }
          : { correct, headline: mistakeLabel, body: 'GTO found mistakes in this hand. Review your action on each street to spot where it went wrong.' };
    }
  }
}

export default function ReasoningModal({ visible, heroFolded, hand, onSelect }: Props) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [phase, setPhase] = useState<'select' | 'feedback'>('select');
  const [selectedTag, setSelectedTag] = useState<ReasoningTag | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const options = heroFolded ? FOLD_REASONING_OPTIONS : REASONING_OPTIONS;

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
      setPhase('select');
      setSelectedTag(null);
      setFeedback(null);
    }
  }, [visible]);

  function handleOptionPress(tag: ReasoningTag) {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (hand) {
      setSelectedTag(tag);
      setFeedback(getFeedback(hand, tag, !!heroFolded));
      setPhase('feedback');
    } else {
      onSelect(tag);
    }
  }

  function handleNext() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    onSelect(selectedTag);
  }

  if (!visible) return null;

  const accentColor = feedback?.correct ? '#27AE60' : '#E74C3C';

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

          {phase === 'select' ? (
            <>
              <Text style={[styles.question, { color: colors.foreground }]}>
                {heroFolded ? 'Why did you fold?' : 'Why did you make that play?'}
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Your answer builds your player profile
              </Text>

              <View style={styles.grid}>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt.tag}
                    style={[styles.option, { backgroundColor: opt.color + '18', borderColor: opt.color + '55' }]}
                    onPress={() => handleOptionPress(opt.tag)}
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
            </>
          ) : feedback ? (
            <>
              <View style={[styles.feedbackIconWrap, { backgroundColor: accentColor + '18' }]}>
                <Feather
                  name={feedback.correct ? 'check-circle' : 'x-circle'}
                  size={42}
                  color={accentColor}
                />
              </View>

              <Text style={[styles.feedbackHeadline, { color: accentColor }]}>
                {feedback.headline}
              </Text>

              <Text style={[styles.feedbackBody, { color: colors.foreground }]}>
                {feedback.body}
              </Text>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: accentColor }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Next Hand</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : null}
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
  // Feedback phase
  feedbackIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  feedbackHeadline: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  feedbackBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
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
