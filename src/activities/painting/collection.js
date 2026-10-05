// Where finished paintings live: the clothesline (a few, in the room) and the
// book (any number). Pure logic on two arrays of paintings, oldest first.
// Nothing here ever drops a painting except `remove`, which is the child's own
// delete. See docs/painting.md.
import { MAX_HUNG } from './grid.js';

export const lineIsFull = (hung) => hung.length >= MAX_HUNG;

// A newly finished painting goes on the line while there is room, else into the
// book. Returns where it went and its index there.
export function addFinished(hung, book, p) {
  const dest = lineIsFull(hung) ? 'book' : 'line';
  const list = dest === 'line' ? hung : book;
  list.push(p);
  return { dest, index: list.length - 1 };
}

// Takes painting i off the line and puts it at the end of the book.
export function lineToBook(hung, book, i) {
  if (i < 0 || i >= hung.length) return false;
  book.push(hung.splice(i, 1)[0]);
  return true;
}

// Takes painting i out of the book and hangs it, if the line has room.
export function bookToLine(hung, book, i) {
  if (i < 0 || i >= book.length || lineIsFull(hung)) return false;
  hung.push(book.splice(i, 1)[0]);
  return true;
}

// Deletes painting i from a list (the child's own choice). Returns it, or null.
export function remove(list, i) {
  return i >= 0 && i < list.length ? list.splice(i, 1)[0] : null;
}

// Loading: more than the line can hold (never saved by the app, but a save may
// say so) keeps the newest on the line and the rest at the front of the book.
export function splitLoaded(hung, book) {
  const extra = hung.length > MAX_HUNG ? hung.splice(0, hung.length - MAX_HUNG) : [];
  return { hung, book: [...extra, ...book] };
}
