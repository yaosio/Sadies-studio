// Screen-to-canvas sizing. The game draws on a small canvas that is blown up by
// a whole number, so pixels stay crisp. All sizes below are in device pixels in,
// canvas pixels out.

// Whole-number scale: aim for about 360 canvas pixels of height, never fewer
// than 150 across, never below 1.
export function chooseScale(dw, dh) {
  let S = Math.max(1, Math.min(Math.floor(dh / 360), Math.max(Math.floor(dh / 460), Math.floor(dw / 280))));
  while (S > 1 && dw / S < 150) S--;
  return S;
}

// Size of one pixel of tray art, so a paint pot is about 44 CSS pixels wide
// (a comfortable target for small fingers) whatever the screen.
export function uiUnit(S, dpr) {
  return Math.max(1, Math.round((44 * dpr) / (22 * S)));
}
