---
name: Hand evaluator tiebreaker bug
description: The original evaluateHandWinner tiebreaker was wrong; replaced with _handScore for correct lexicographic comparison.
---

## Rule
Never use "sort all 7 cards by value, compare top 5" as a poker tiebreaker. It fails when the board dominates positions 0-4 (e.g. A,K,Q,J,T board with pocket 7s vs pocket 5s → wrongly returns tie).

**Why:** Both players share the same board cards. If all 5 board cards outrank both players' hole cards, the top-5 sorted arrays are identical → tie returned instead of the correct winner.

**How to apply:** Use `_handScore()` which builds a typed comparison tuple per hand category:
- One Pair: [2, pair-rank, k1, k2, k3]
- Two Pair: [3, high-pair, low-pair, kicker] — handles 3-pair boards by picking top 2
- Three of a Kind: [4, trips, k1, k2]
- Straight/Straight Flush: [rank, high-card-of-straight]
- Full House: [7, trips-rank, pair-rank]
- Flush: [6, c1..c5 in flush suit]
- Four of a Kind: [8, quad, kicker]

## Legitimate case user may confuse as a bug
Pocket 5s legitimately beats pocket 7s when the board has a 5 → villain has Three of a Kind (rank 4) vs hero's One Pair (rank 2). This is CORRECT behavior; the user just missed the 5 on board.
