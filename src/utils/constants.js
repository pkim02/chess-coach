export const SAMPLE_GAMES = [
  {
    label: 'Kasparov vs Deep Blue (1997, Game 6)',
    pgn: `[Event "IBM Man-Machine, New York USA"]
[Site "New York"]
[Date "1997.05.11"]
[Round "6"]
[White "Deep Blue"]
[Black "Garry Kasparov"]
[Result "1-0"]

1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6
8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5
14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4 1-0`
  },
  {
    label: 'Morphy vs Duke & Count (Opera Game, 1858)',
    pgn: `[Event "Paris Opera"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke of Brunswick and Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`
  },
  {
    label: 'Byrne vs Fischer (Game of the Century, 1956)',
    pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York"]
[Date "1956.10.17"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[Result "0-1"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6
8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4
14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+
20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1
26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4
32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+
39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`
  }
];

export const MOVE_CLASSIFICATIONS = {
  brilliant: { label: 'Brilliant', symbol: '!!', color: 'var(--brilliant)', icon: '💎' },
  great: { label: 'Great', symbol: '!', color: 'var(--great)', icon: '🔵' },
  best: { label: 'Best', symbol: '★', color: 'var(--best)', icon: '⭐' },
  excellent: { label: 'Excellent', symbol: '✓', color: 'var(--excellent)', icon: '✅' },
  good: { label: 'Good', symbol: '', color: 'var(--good)', icon: '🟢' },
  book: { label: 'Book', symbol: '📖', color: 'var(--book)', icon: '📖' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'var(--inaccuracy)', icon: '🟡' },
  mistake: { label: 'Mistake', symbol: '?', color: 'var(--mistake)', icon: '🟠' },
  miss: { label: 'Missed Win', symbol: '??', color: 'var(--miss)', icon: '🔴' },
  blunder: { label: 'Blunder', symbol: '??', color: 'var(--blunder)', icon: '❌' },
};

// Critical moment types and their targeted reflection prompts
export const CRITICAL_MOMENT_PROMPTS = {
  blunder: {
    label: 'Significant Error',
    reasoning: [
      "This was a critical moment. What were you thinking here?",
      "The engine flags this as a turning point. What was your plan?",
      "This position needed more care. Walk me through your thought process.",
    ],
    candidates: [
      "What alternatives did you calculate?",
      "What other moves did you seriously consider?",
    ],
    threats: [
      "What opponent threats did you check for before playing this?",
      "Did you look at what your opponent could do in response?",
    ],
  },
  missed_tactic: {
    label: 'Missed Tactical Opportunity',
    reasoning: [
      "There was a strong tactical idea here. Did you sense something was possible?",
      "A forcing continuation existed in this position. What did you look at?",
      "This was a moment where calculation mattered. How deep did you look?",
    ],
    candidates: [
      "Did you consider any aggressive or forcing moves?",
      "What captures, checks, or threats did you look at?",
    ],
    threats: [
      "What was the tactical theme you were looking for (or missed)?",
      "Were you aware of any tactical motifs in this position?",
    ],
  },
  positional: {
    label: 'Positional Decision Point',
    reasoning: [
      "This was a key strategic decision. What plan did you choose and why?",
      "The position called for a clear plan. What was yours?",
      "This was a moment where long-term thinking mattered. What guided your choice?",
    ],
    candidates: [
      "What different plans did you weigh against each other?",
      "Were there any piece maneuvers or pawn breaks you considered?",
    ],
    threats: [
      "How did you assess the pawn structure and piece activity here?",
      "What positional factors were you weighing?",
    ],
  },
  turning_point: {
    label: 'Game Turning Point',
    reasoning: [
      "The game swung here. What was going through your mind?",
      "This is where the advantage shifted. What was your assessment of the position?",
      "A key moment in the game. Were you aware the balance was changing?",
    ],
    candidates: [
      "What moves did you consider at this critical juncture?",
      "What was your main candidate move, and what made you choose it?",
    ],
    threats: [
      "Did you feel the position was getting dangerous for either side?",
      "What was the biggest concern you had in this position?",
    ],
  },
};

// Thresholds for identifying critical moments (centipawn loss)
export const CRITICAL_MOMENT_THRESHOLD = 80; // cp loss to trigger reflection
export const OPENING_PHASE_HALF_MOVES = 16; // skip reflection for first ~8 full moves

export const STOCKFISH_DEPTH = 18;
export const STOCKFISH_MULTIPV = 3;

export const CENTIPAWN_THRESHOLDS = {
  brilliant: -50,
  great: 0,
  best: 10,
  excellent: 25,
  good: 50,
  inaccuracy: 100,
  mistake: 200,
  blunder: 300,
};
