// The tools a child can hold. radius is in paint cells. chance < 1 makes a tool
// dab only some cells (the sponge). erase puts bare paper back (the cloth).
export const TOOLS = {
  brushS: { radius: 1, chance: 1, erase: false },
  brushB: { radius: 2, chance: 1, erase: false },
  sponge: { radius: 3, chance: 0.32, erase: false },
  cloth: { radius: 3, chance: 1, erase: true },
};
export const TOOL_IDS = Object.keys(TOOLS);
export const DEFAULT_TOOL = 'brushB';
