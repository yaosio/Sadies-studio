// Fixed numbers of the studio room. Heights vary with the screen (the room is
// stretched taller on tall screens), so positions are given from the floor line.
export const WORLD_W = 1724; // room width in room pixels (three zones side by side)
export const EX = 760; // easel center x
export const MIN_H = 360;
export const BOOK_X = 498; // the book of paintings on the floor, left edge and size in room pixels
export const BOOK_W = 72;
export const BOOK_H = 86;
export const BOARD_W = 144; // easel paper board, in room pixels
export const BOARD_H = 108;

export function studioGeometry(height) {
  const WH = Math.max(MIN_H, height), F = WH - 72;
  return { WH, F, BX: EX - BOARD_W / 2, BY: F - 196, LY: F - 262, SX: EX + 12, SY: F - 196 - 38 };
}
