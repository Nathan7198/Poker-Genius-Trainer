import React from 'react';
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { useStats } from '@/context/StatsContext';
import type { HandHistoryEntry } from '@/context/StatsContext';
import { useColors } from '@/hooks/useColors';
import PokerTable from '@/components/PokerTable';
import ActionPanel from '@/components/ActionPanel';
import CoachModal from '@/components/CoachModal';
import HandReportModal from '@/components/HandReportModal';
import CustomSetup from '@/components/CustomSetup';
import {
  DIFFICULTIES, DIFFICULTY_DESCRIPTIONS, getHandNotation,
  evaluateMadeHand, MADE_HAND_COLORS, PREFLOP_ORDER,
} from '@/constants/pokerData';
import type { Difficulty } from '@/constants/pokerData';

const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_COLORS: Record<string, string> = { s: '#94A3B8', h: '#EF4444', d: '#EF4444', c: '#94A3B8' };

function cardLabel(rank: string, suit: string) {
  return `${rank}${SUIT_SYMBOLS[suit] ?? suit}`;
}

export default function PlayScreen() {
  const { state, startNewHand, setDifficulty, setTrainingMode, setTableSize, setGameFormat, goIdle } = useGame();
  const { logHandHistory, recordHandResult } = useStats();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showDifficultyPicker, setShowDifficultyPicker] = React.useState(false);
  const [showModePicker, setShowModePicker] = React.useState(false);
  const [showTablePicker, setShowTablePicker] = React.useState(false);
  const [showFormatPicker, setShowFormatPicker] = React.useState(false);
  const [expandCustomSizes, setExpandCustomSizes] = React.useState(false);
  const [showHandReport, setShowHandReport] = React.useState(false);
  const isPreflopMode = state.trainingMode === 'preflop';
  const modeBtnRef = React.useRef<View>(null);
  const [modeBtnY, setModeBtnY] = React.useState(0);
  const [modeBtnX, setModeBtnX] = React.useState(0);
  const [modeBtnH, setModeBtnH] = React.useState(0);

  const lastLoggedHand = React.useRef<number>(-1);

  React.useEffect(() => {
    if (state.phase !== 'showdown') return;
    if (state.handNumber <= 0) return;
    if (lastLoggedHand.current === state.handNumber) return;
    lastLoggedHand.current = state.handNumber;

    const { heroCards, heroPosition, communityCards, analysis, postFlopAnalysisHistory } = state;

    const notation = heroCards.length === 2
      ? (analysis?.handNotation ?? getHandNotation(heroCards[0], heroCards[1]))
      : '??';

    const faceUp = communityCards.filter(c => c.faceUp);
    const flopCards = faceUp.slice(0, 3).map(c => cardLabel(c.rank, c.suit)).join(' ');
    const turnCard = faceUp[3] ? cardLabel(faceUp[3].rank, faceUp[3].suit) : '';
    const riverCard = faceUp[4] ? cardLabel(faceUp[4].rank, faceUp[4].suit) : '';

    const firstPostFlop = postFlopAnalysisHistory[0];
    const boardTexture = firstPostFlop?.boardTexture.label ?? 'Unknown';
    const boardTextureColor = firstPostFlop?.boardTexture.color ?? '#95A5A6';

    const folded = state.lastHeroAction === 'fold' ||
      postFlopAnalysisHistory.some(a => a.heroAction === 'fold');
    const foldedStreet = state.lastHeroAction === 'fold'
      ? 'preflop'
      : (postFlopAnalysisHistory.find(a => a.heroAction === 'fold')?.street ?? '');

    const preflopAction = analysis
      ? analysis.heroAction === 'raise'
        ? `raise ${analysis.raiseAmountBB}BB`
        : analysis.heroAction
      : 'unknown';

    const streets = postFlopAnalysisHistory.map(a => ({
      street: a.street,
      action: a.heroAction === 'bet'
        ? `bet ${a.betPct}%`
        : a.heroAction === 'raise'
          ? `raise ${a.betPct}%`
          : a.heroAction,
      isGTO: a.isGTO,
      madeHand: a.madeHand,
    }));

    const totalMistakes =
      (analysis?.mistakes.length ?? 0) +
      postFlopAnalysisHistory.reduce((n, a) => n + a.mistakes.length, 0);

    const entry: HandHistoryEntry = {
      handNumber: state.handNumber,
      timestamp: Date.now(),
      heroNotation: notation,
      heroPosition,
      preflopAction,
      preflopGTO: analysis?.isGTO ?? true,
      flopCards,
      turnCard,
      riverCard,
      boardTexture,
      boardTextureColor,
      streets,
      folded,
      foldedStreet,
      totalMistakes,
    };

    logHandHistory(entry);

    // Skip win/loss tracking for preflop-only drills and GTO mode
    if (state.trainingMode === 'full' || state.trainingMode === 'custom') {
      const won = state.showdownResult === 'hero';
      const profitBB = won
        ? Math.round((state.pot - state.heroTotalInvestedBB) * 100) / 100
        : Math.round(-state.heroTotalInvestedBB * 100) / 100;
      recordHandResult(won, profitBB);
    }
  }, [state.phase, state.handNumber]);

  const isIdle = state.phase === 'idle';
  const isShowdown = state.phase === 'showdown' && !state.showAnalysis;

  function handleNewHand() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    startNewHand();
    setShowDifficultyPicker(false);
  }

  function handleDifficulty(d: Difficulty) {
    setDifficulty(d);
    setShowDifficultyPicker(false);
  }

  function handleTableSize(size: number) {
    setTableSize(size);
    setShowTablePicker(false);
    setExpandCustomSizes(false);
  }

  const tableSz = state.tableSize;
  const tableBtnText = tableSz === 9 ? '9P' : tableSz === 6 ? '6P' : tableSz === 2 ? 'HU' : `${tableSz}P`;
  const isCustomSize = tableSz !== 6 && tableSz !== 9;

  const diffColors: Record<Difficulty, string> = {
    Beginner: '#27AE60',
    Intermediate: '#3498DB',
    Advanced: '#E67E22',
    Expert: '#E74C3C',
  };

  const isLive = !isIdle && !isShowdown && !state.showAnalysis;
  const streetBadge = isLive ? ({ preflop: 'PREFLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER' } as Record<string,string>)[state.phase] ?? null : null;

  const TAB_BAR_H = Platform.OS === 'web' ? 84 : 60;

  // ── Showdown display helpers ────────────────────────────────────────────
  const board = state.communityCards.filter(c => c.faceUp);
  const mainVillainPlayer = state.players.find(p => p.position === state.mainVillainPosition)
    ?? state.players[0];
  const villainFaceUpCards = mainVillainPlayer?.cards.filter(c => c.faceUp) ?? [];

  const heroHandResult = board.length >= 3 && state.heroCards.length === 2
    ? evaluateMadeHand(state.heroCards, board)
    : null;
  const villainHandResult = board.length >= 3 && villainFaceUpCards.length === 2
    ? evaluateMadeHand(villainFaceUpCards, board)
    : null;

  const resultConfig = isShowdown && state.showdownResult
    ? {
        hero: { label: '🏆 YOU WIN', sublabel: `Pot: ${state.pot.toFixed(1)}BB`, color: '#27AE60', bg: '#27AE6020' },
        villain: state.villainFolded
          ? { label: '✓ VILLAIN FOLDED', sublabel: `You win ${state.pot.toFixed(1)}BB`, color: '#27AE60', bg: '#27AE6020' }
          : { label: '✗ VILLAIN WINS', sublabel: `Pot: ${state.pot.toFixed(1)}BB`, color: '#E74C3C', bg: '#E74C3C20' },
        tie: { label: '= TIE', sublabel: `Chop: ${(state.pot / 2).toFixed(1)}BB each`, color: '#E5C76B', bg: '#E5C76B20' },
      }[state.showdownResult]
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 10 : 0, paddingBottom: TAB_BAR_H + insets.bottom }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS !== 'web' ? insets.top + 4 : 4, borderBottomColor: colors.border }]}>
        {/* Row 1: title + live street badge */}
        <View style={styles.topRow}>
          <Text style={[styles.appTitle, { color: colors.gold }]}>POKER TRAINER</Text>
          {streetBadge && (
            <View style={[styles.streetBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.streetBadgeText, { color: colors.gold }]}>{streetBadge}</Text>
            </View>
          )}
        </View>

        {/* Row 2: settings buttons — each flex:1 so they always fit the screen */}
        <View style={styles.settingsRow}>
          <View
            ref={modeBtnRef}
            style={{ flex: 1 }}
            onLayout={() => {
              modeBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
                setModeBtnX(pageX);
                setModeBtnY(pageY);
                setModeBtnH(height);
              });
            }}
          >
            <TouchableOpacity
              style={[styles.modeBtn, { borderColor: '#33333366' }]}
              onPress={() => { setShowModePicker(!showModePicker); setShowDifficultyPicker(false); setShowTablePicker(false); setShowFormatPicker(false); }}
            >
              <Text style={styles.modeBtnLabel}>MODE</Text>
              <Text style={[styles.modeBtnText, {
                color: state.trainingMode === 'gto' ? '#27AE60'
                  : state.trainingMode === 'custom' ? '#3498DB'
                  : isPreflopMode ? colors.goldLight
                  : colors.foreground,
              }]} numberOfLines={1}>
                {state.trainingMode === 'gto' ? 'GTO'
                  : state.trainingMode === 'custom' ? 'Custom'
                  : isPreflopMode ? 'Pre Flop'
                  : 'Full Hands'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.tableBtn, { borderColor: isCustomSize ? colors.goldLight + '66' : '#33333366', backgroundColor: isCustomSize ? '#A8882A15' : '#181818' }]}
            onPress={() => { setShowTablePicker(!showTablePicker); setShowModePicker(false); setShowDifficultyPicker(false); setShowFormatPicker(false); }}
          >
            <Text style={styles.tableBtnLabel}>TABLE</Text>
            <Text style={[styles.tableBtnText, { color: isCustomSize ? colors.goldLight : colors.foreground }]}>{tableBtnText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatBtn, {
              borderColor: state.gameFormat === 'tournament' ? '#E5C76B66' : '#33333366',
              backgroundColor: state.gameFormat === 'tournament' ? '#A8882A15' : '#181818',
            }]}
            onPress={() => { setShowFormatPicker(!showFormatPicker); setShowModePicker(false); setShowTablePicker(false); setShowDifficultyPicker(false); }}
          >
            <Text style={styles.formatBtnLabel}>FORMAT</Text>
            <Text style={[styles.formatBtnText, { color: state.gameFormat === 'tournament' ? colors.goldLight : colors.foreground }]} numberOfLines={1}>
              {state.gameFormat === 'tournament' ? 'Tourn.' : 'Cash'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diffBtn, { backgroundColor: diffColors[state.difficulty] + '22', borderColor: diffColors[state.difficulty] + '66' }]}
            onPress={() => { setShowDifficultyPicker(!showDifficultyPicker); setShowModePicker(false); setShowTablePicker(false); setShowFormatPicker(false); }}
          >
            <Text style={styles.diffBtnLabel}>DIFFICULTY</Text>
            <Text style={[styles.diffBtnText, { color: diffColors[state.difficulty] }]} numberOfLines={1}>
              {state.difficulty}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode picker — rendered outside header so touches aren't clipped */}
      {showModePicker && (
        <View style={[styles.modePicker, { backgroundColor: colors.card, borderColor: colors.border, top: modeBtnY + modeBtnH + 4, left: modeBtnX }]}>
          {([['full', 'Full Hands'], ['preflop', 'Pre Flop'], ['gto', 'GTO Mode'], ['custom', 'Custom']] as const).map(([val, label]) => {
            const isSelected = state.trainingMode === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.modeOption, isSelected && { backgroundColor: '#A8882A18' }]}
                onPress={() => { setTrainingMode(val); setShowModePicker(false); }}
              >
                <View style={styles.modeOptionRow}>
                  <Feather name="check" size={13} color={isSelected ? colors.goldLight : 'transparent'} style={{ marginRight: 6 }} />
                  <Text style={[styles.modeOptionText, { color: isSelected ? colors.goldLight : colors.foreground }]}>{label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Format picker */}
      {showFormatPicker && (
        <View style={[styles.formatPicker, { backgroundColor: colors.card, borderColor: colors.border, top: modeBtnY + modeBtnH + 4 }]}>
          {([
            ['cash', 'Cash Games', 'Start every hand at 100BB. No persistent stacks.'],
            ['tournament', 'Tournament', 'Stacks carry over between hands. Reach 0BB and you\'re out.'],
          ] as const).map(([fmt, label, desc]) => {
            const sel = state.gameFormat === fmt;
            return (
              <TouchableOpacity
                key={fmt}
                style={[styles.formatOption, sel && { backgroundColor: '#A8882A18' }]}
                onPress={() => { setGameFormat(fmt); setShowFormatPicker(false); }}
              >
                <View style={styles.formatOptionRow}>
                  <Feather name="check" size={13} color={sel ? colors.goldLight : 'transparent'} style={{ marginRight: 6 }} />
                  <Text style={[styles.formatOptionName, { color: sel ? colors.goldLight : colors.foreground }]}>{label}</Text>
                </View>
                <Text style={[styles.formatOptionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Difficulty picker */}
      {showDifficultyPicker && (
        <View style={[styles.diffPicker, { backgroundColor: colors.card, borderColor: colors.border, top: modeBtnY + modeBtnH + 4 }]}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffOption, state.difficulty === d && { backgroundColor: diffColors[d] + '20' }]}
              onPress={() => handleDifficulty(d)}
            >
              <View style={styles.diffOptionRow}>
                <Feather name="check" size={13} color={state.difficulty === d ? diffColors[d] : 'transparent'} style={{ marginRight: 6 }} />
                <Text style={[styles.diffOptionName, { color: state.difficulty === d ? diffColors[d] : colors.foreground }]}>{d}</Text>
              </View>
              <Text style={[styles.diffOptionDesc, { color: colors.mutedForeground }]}>{DIFFICULTY_DESCRIPTIONS[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Table size picker */}
      {showTablePicker && (
        <View style={[styles.tablePicker, { backgroundColor: colors.card, borderColor: colors.border, top: modeBtnY + modeBtnH + 4 }]}>
          {([
            [9, 'Full Ring', '9 players · standard full ring'],
            [6, '6-Max', '6 players · default format'],
          ] as const).map(([size, label, desc]) => {
            const sel = tableSz === size;
            return (
              <TouchableOpacity
                key={size}
                style={[styles.tableOption, sel && { backgroundColor: '#A8882A18' }]}
                onPress={() => handleTableSize(size)}
              >
                <View style={styles.tableOptionRow}>
                  <Feather name="check" size={13} color={sel ? colors.goldLight : 'transparent'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tableOptionName, { color: sel ? colors.goldLight : colors.foreground }]}>{label}</Text>
                </View>
                <Text style={[styles.tableOptionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.tableOption, isCustomSize && { backgroundColor: '#A8882A18' }]}
            onPress={() => setExpandCustomSizes(!expandCustomSizes)}
          >
            <View style={styles.tableOptionRow}>
              <Feather name={expandCustomSizes ? 'chevron-down' : 'chevron-right'} size={13} color={isCustomSize ? colors.goldLight : colors.mutedForeground} style={{ marginRight: 6 }} />
              <Text style={[styles.tableOptionName, { color: isCustomSize ? colors.goldLight : colors.foreground }]}>Customise</Text>
            </View>
            <Text style={[styles.tableOptionDesc, { color: colors.mutedForeground }]}>Any size · 2–9 players</Text>
          </TouchableOpacity>
          {expandCustomSizes && (
            <View style={styles.customSizes}>
              {([2,3,4,5,7,8] as const).map(n => {
                const sel = tableSz === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.customSizeBtn, { borderColor: sel ? colors.goldLight : colors.border, backgroundColor: sel ? '#A8882A18' : 'transparent' }]}
                    onPress={() => handleTableSize(n)}
                  >
                    <Text style={[styles.customSizeText, { color: sel ? colors.goldLight : colors.foreground }]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Table — visible during play AND at showdown (villain cards auto-revealed in seat) */}
        {!isIdle && <PokerTable />}

        {/* Preflop action trail — shows each player's action in position order */}
        {state.phase === 'preflop' && !state.showAnalysis && (() => {
          const heroIdx = PREFLOP_ORDER.indexOf(state.heroPosition);
          const preHeroBots = state.players
            .filter(p => PREFLOP_ORDER.indexOf(p.position) < heroIdx && p.action !== null)
            .sort((a, b) => PREFLOP_ORDER.indexOf(a.position) - PREFLOP_ORDER.indexOf(b.position));
          if (preHeroBots.length === 0) return null;

          const chipColor = (act: string | null) =>
            act === 'raise' ? '#E5C76B' :
            act === 'call' || act === 'limp' ? '#3498DB' : '#666';

          const chipLabel = (act: string | null, bet: number) =>
            act === 'raise' ? `RAISED ${bet}BB` :
            act === 'call' && bet === 1 ? 'LIMPED' :
            act === 'call'  ? `CALLED ${bet}BB` :
            'FOLDED';

          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionTrail}
              contentContainerStyle={styles.actionTrailContent}
            >
              {preHeroBots.map(p => {
                const col = chipColor(p.action);
                return (
                  <View key={p.position} style={[styles.actionChip, { borderColor: col + '60', backgroundColor: col + '15' }]}>
                    <Text style={[styles.chipPos, { color: colors.mutedForeground }]}>{p.position}</Text>
                    <Text style={[styles.chipAction, { color: col }]}>{chipLabel(p.action, p.currentBet)}</Text>
                  </View>
                );
              })}
              <View style={[styles.actionChip, { borderColor: '#27AE6060', backgroundColor: '#27AE6015' }]}>
                <Text style={[styles.chipPos, { color: colors.mutedForeground }]}>YOU</Text>
                <Text style={[styles.chipAction, { color: '#27AE60' }]}>YOUR TURN</Text>
              </View>
            </ScrollView>
          );
        })()}

        {/* Idle */}
        {isIdle && (
          state.trainingMode === 'custom' ? (
            <CustomSetup />
          ) : state.gameFormat === 'tournament' && state.tournamentStacks.hero <= 0 ? (
            <View style={styles.centerActions}>
              <View style={[styles.eliminatedBadge, { backgroundColor: '#E74C3C18', borderColor: '#E74C3C55' }]}>
                <Text style={[styles.eliminatedTitle, { color: '#E74C3C' }]}>ELIMINATED</Text>
                <Text style={[styles.eliminatedSub, { color: colors.mutedForeground }]}>You ran out of chips. Start a new tournament to play again.</Text>
              </View>
              <TouchableOpacity
                style={[styles.dealBtn, { backgroundColor: '#444' }]}
                onPress={() => { setGameFormat('tournament'); }}
              >
                <Text style={[styles.dealBtnText, { color: '#CCC' }]}>NEW TOURNAMENT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centerActions}>
              {state.gameFormat === 'tournament' && (
                <View style={[styles.tourneyChips, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tourneyChipsLabel, { color: colors.mutedForeground }]}>YOUR TOURNAMENT STACK</Text>
                  <Text style={[styles.tourneyChipsValue, { color: colors.goldLight }]}>
                    {Number.isInteger(state.tournamentStacks.hero) ? state.tournamentStacks.hero : state.tournamentStacks.hero.toFixed(1)} BB
                  </Text>
                  {state.eliminatedPositions.length > 0 && (
                    <Text style={[styles.tourneyElimText, { color: colors.mutedForeground }]}>
                      Eliminated: {state.eliminatedPositions.join(', ')}
                    </Text>
                  )}
                </View>
              )}
              <TouchableOpacity style={[styles.dealBtn, { backgroundColor: colors.gold }]} onPress={handleNewHand}>
                <Text style={[styles.dealBtnText, { color: '#0A0A0A' }]}>DEAL CARDS</Text>
              </TouchableOpacity>
              <Text style={[styles.idleSubtext, { color: colors.mutedForeground }]}>
                Hero always at bottom · Boards never repeat · Full street coaching
              </Text>
            </View>
          )
        )}

      </ScrollView>

      {/* Showdown footer — always fully visible, no scrolling needed */}
      {isShowdown && (
        <View style={[styles.sdFooter, { borderTopColor: colors.border }]}>
          {/* Winner badge + hand names */}
          <View style={styles.sdResultSection}>
            {isPreflopMode && !state.showdownResult ? (
              <View style={[styles.sdWinBadge, { backgroundColor: '#A8882A18', borderColor: '#A8882A50' }]}>
                <Text style={[styles.sdWinLabel, { color: colors.goldLight }]}>PREFLOP DRILL COMPLETE</Text>
                <Text style={[styles.sdWinSub, { color: colors.mutedForeground }]}>
                  {state.analysis?.isGTO ? '✓ GTO decision' : '✗ Mistake — see coach for details'}
                </Text>
              </View>
            ) : resultConfig ? (
              <View style={[styles.sdWinBadge, { backgroundColor: resultConfig.bg, borderColor: resultConfig.color + '60' }]}>
                <Text style={[styles.sdWinLabel, { color: resultConfig.color }]}>{resultConfig.label}</Text>
                <Text style={[styles.sdWinSub, { color: colors.mutedForeground }]}>{resultConfig.sublabel}</Text>
              </View>
            ) : null}
            {state.heroCards.length === 2 && (
              <View style={[styles.sdHandRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sdHandItem}>
                  <Text style={[styles.sdHandWho, { color: state.showdownResult === 'hero' ? '#27AE60' : colors.mutedForeground }]}>YOU</Text>
                  <Text style={[styles.sdHandName, { color: heroHandResult ? MADE_HAND_COLORS[heroHandResult.hand] : colors.foreground }]}>
                    {heroHandResult?.hand ?? 'High Card'}
                  </Text>
                </View>
                {villainFaceUpCards.length === 2 ? (
                  <>
                    <Text style={[styles.sdVs, { color: colors.mutedForeground }]}>vs</Text>
                    <View style={[styles.sdHandItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.sdHandWho, { color: state.showdownResult === 'villain' ? '#E74C3C' : colors.mutedForeground }]}>
                        {mainVillainPlayer?.name ?? 'VILLAIN'}
                      </Text>
                      <Text style={[styles.sdHandName, { color: villainHandResult ? MADE_HAND_COLORS[villainHandResult.hand] : colors.foreground }]}>
                        {villainHandResult?.hand ?? 'High Card'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sdVs, { color: colors.mutedForeground }]}>vs</Text>
                    <View style={[styles.sdHandItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.sdHandWho, { color: colors.mutedForeground }]}>
                        {mainVillainPlayer?.name ?? 'VILLAIN'}
                      </Text>
                      <Text style={[styles.sdHandName, { color: '#E74C3C' }]}>Folded</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Report + Next hand buttons */}
          <View style={styles.nextHandBar}>
            {state.analysis && (
              <TouchableOpacity
                style={[styles.reportBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                onPress={() => setShowHandReport(true)}
                activeOpacity={0.8}
              >
                <Feather name="clipboard" size={14} color={colors.foreground} />
                <Text style={[styles.reportBtnText, { color: colors.foreground }]}>HAND REPORT</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextHandFixed, { backgroundColor: colors.gold, flex: 1 }]}
              onPress={state.trainingMode === 'custom' ? goIdle : handleNewHand}
              activeOpacity={0.85}
            >
              <Text style={styles.nextHandFixedText}>
                {state.trainingMode === 'custom' ? 'CONFIGURE HAND ↺' : 'NEXT HAND →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ActionPanel />
      <CoachModal />
      <HandReportModal visible={showHandReport} onClose={() => setShowHandReport(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'column',
    paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingsRow: { flexDirection: 'row', gap: 6 },
  appTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  streetBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  streetBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  potBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  potText: { fontSize: 10, fontWeight: '700' },
  modeBtn: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, borderRadius: 8, borderWidth: 1, backgroundColor: '#181818', alignItems: 'center' },
  modeBtnLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: '#888', marginBottom: 1 },
  modeBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  modePicker: { position: 'absolute', zIndex: 100, borderRadius: 10, borderWidth: 1, paddingVertical: 4, minWidth: 130, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  modeOption: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  modeOptionRow: { flexDirection: 'row', alignItems: 'center' },
  modeOptionText: { fontSize: 13, fontWeight: '700' },
  diffBtn: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  diffBtnLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: '#888', marginBottom: 1 },
  diffBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  diffPicker: {
    position: 'absolute', right: 12, zIndex: 100,
    borderRadius: 12, borderWidth: 1, width: 280,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  diffOption: { padding: 12, borderRadius: 8 },
  diffOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffOptionName: { fontSize: 14, fontWeight: '700' },
  diffOptionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  tableBtn: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tableBtnLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: '#888', marginBottom: 1 },
  tableBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  tablePicker: {
    position: 'absolute', right: 12, zIndex: 100,
    borderRadius: 12, borderWidth: 1, width: 260,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  tableOption: { padding: 12, borderRadius: 8 },
  tableOptionRow: { flexDirection: 'row', alignItems: 'center' },
  tableOptionName: { fontSize: 14, fontWeight: '700' },
  tableOptionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  customSizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  customSizeBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  customSizeText: { fontSize: 14, fontWeight: '800' },
  formatBtn: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  formatBtnLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: '#888', marginBottom: 1 },
  formatBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  formatPicker: {
    position: 'absolute', right: 12, zIndex: 100,
    borderRadius: 12, borderWidth: 1, width: 260,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  formatOption: { padding: 12, borderRadius: 8 },
  formatOptionRow: { flexDirection: 'row', alignItems: 'center' },
  formatOptionName: { fontSize: 14, fontWeight: '700' },
  formatOptionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  tourneyChips: {
    borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', minWidth: 200,
  },
  tourneyChipsLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  tourneyChipsValue: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  tourneyElimText: { fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  eliminatedBadge: {
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', gap: 6,
  },
  eliminatedTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  eliminatedSub: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8, paddingTop: 8 },
  actionTrail: { marginHorizontal: 12, marginTop: 6 },
  actionTrailContent: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 2 },
  actionChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, alignItems: 'center', minWidth: 70 },
  chipPos: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  chipAction: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  centerActions: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  dealBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  dealBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  idleSubtext: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

  // Showdown footer (outside ScrollView — always fully visible)
  sdFooter: { borderTopWidth: 1, paddingTop: 2 },
  sdResultSection: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 8 },
  sdWinBadge: {
    borderRadius: 12, borderWidth: 1.5,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', gap: 2,
  },
  sdWinLabel: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  sdWinSub: { fontSize: 12, fontWeight: '600' },
  sdHandRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  sdHandItem: { flex: 1, gap: 2 },
  sdHandWho: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sdHandName: { fontSize: 14, fontWeight: '800' },
  sdVs: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10 },

  // NEXT HAND bar (inside the showdown footer)
  nextHandBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  reportBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  nextHandFixed: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  nextHandFixedText: { fontSize: 17, fontWeight: '900', letterSpacing: 1.5, color: '#0D1B0F' },
});
