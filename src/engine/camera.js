import { clamp } from '../art/px.js';

// Keep the left edge x of a view W canvas pixels wide (at zoom z) inside a room
// worldW pixels wide. If the room is narrower than the view, center it.
export function clampCamX(x, z, W, worldW) {
  const vw = W / z;
  if (vw >= worldW) return (worldW - vw) / 2;
  return clamp(x, 0, worldW - vw);
}
