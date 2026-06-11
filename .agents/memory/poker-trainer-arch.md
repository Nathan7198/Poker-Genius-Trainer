---
name: Poker Trainer Architecture
description: Game state machine, phase transitions, and key file layout for the Poker Trainer Expo app.
---

# Game State Machine

Phase flow: `idle → preflop → flop → turn → river → showdown`

## Key transitions (GameContext reducer)

- `START_HAND` → phase=`preflop`, deal 2 hero cards + 5 face-down community cards, simulate bot preflop actions
- `HERO_ACT(fold)` → phase=`showdown`, showAnalysis=true (preflop HandAnalysis shown)
- `HERO_ACT(call/raise)` → phase=`flop`, reveal 3 community cards, simulate villain flop action, showAnalysis=true (preflop analysis shown first)
- `DISMISS_ANALYSIS` (while phase=`flop`) → showAnalysis=false → ActionPanel shows post-flop buttons
- `HERO_POSTFLOP_ACT` → stay on current phase, set postFlopAnalysis, showAnalysis=true
- `ADVANCE_PHASE` (from flop) → reveal turn card, simulate villain turn action, phase=`turn`, showAnalysis=false
- `ADVANCE_PHASE` (from turn) → reveal all river cards, simulate villain, phase=`river`
- `ADVANCE_PHASE` (from river) → phase=`showdown`, showAnalysis=false

## CoachModal button label logic
- phase=`showdown` → "NEW HAND" (calls dismissAnalysis)
- isPreflopModal (analysis≠null, postFlopAnalysis=null) → "VIEW FLOP" (calls dismissAnalysis)
- phase=`flop` + postFlopAnalysis → "DEAL TURN" (calls advancePhase)
- phase=`turn` + postFlopAnalysis → "DEAL RIVER" (calls advancePhase)
- phase=`river` + postFlopAnalysis → "SHOWDOWN" (calls advancePhase)

## Key state fields
- `heroIsAggressor`: set true when HERO_ACT raises preflop — used for c-bet recommendation
- `villainPostFlopAction`: simulated each street in HERO_ACT (flop) and ADVANCE_PHASE
- `mainVillainType`: most aggressive active player type — drives villain simulation
- `postFlopStreetsDone`: array of completed streets shown on showdown screen
- `postFlopAnalysis` vs `analysis`: CoachModal checks postFlopAnalysis≠null first to pick modal type

## ActionPanel visibility
- Shows when `(phase=preflop OR phase in [flop,turn,river]) AND !showAnalysis`
- Preflop: fold/call/raise with BB sizing presets
- Post-flop: if villain bet → fold/call/raise; if villain checked → check/bet with % pot presets

## Post-flop analysis logic (buildPostFlopAnalysis)
- Mistakes mapped to existing MistakeType: missed_value, bad_bluff, folded_too_tight, ignored_pot_odds
- Board texture from analyzeBoardTexture(faceUp community cards)
- Made hand from evaluateMadeHand(holeCards, board) — full 7-card evaluation
- getCbetRecommendation determines GTO action based on texture + made hand rank + isAggressor + facingBet

**Why:** Keeping postFlopAnalysis separate from analysis (preflop HandAnalysis) avoids breaking the preflop modal while adding per-street post-flop coaching.
