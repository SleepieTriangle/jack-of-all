/* Jack of All — background worker. Runs the slow parts (the chess computer's
   thinking and building hard Sudoku grids) off the main thread so the screen
   never freezes. It loads the same game code the page uses. */
self.window = self;
importScripts('core.js', 'games/chess.js', 'games/sudoku.js');

const J = self.JOA;
const TASKS = {
  chessMove: ({ state, level, seed }) => J._chess.chooseMove(state, level, J.makeRng(seed)),
  sudoku: ({ clues, seed }) => J._sudoku.generate(J.makeRng(seed), clues),
};

self.onmessage = (e) => {
  const { id, task, payload } = e.data;
  try {
    self.postMessage({ id, result: TASKS[task](payload) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
