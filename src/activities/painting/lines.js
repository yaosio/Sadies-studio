// What Sadie says while the child paints. Strings are one line; arrays are picked
// from at random. Short and simple: nothing may depend on reading them.
export const PAINTING_LINES = {
  easel: ['Pick a paint pot, then paint on the paper.', "Paper's ready. Show me what you've got.", 'Brush, sponge, cloth. Everything is on the shelf.'],
  colors: {
    red: 'Red! Like a tomato.', orange: 'Orange. My favorite food color.', yellow: 'Yellow, like the sun.',
    green: 'Green. Like Fern!', blue: "Blue like the sky. Or a fish's dream.", purple: 'Purple. Very fancy.',
    pink: 'Pink, like my nose. Excellent choice.', brown: 'Brown, like a cozy tree.', black: 'Black. Good for outlines.', white: 'White! Good for clouds.',
  },
  tools: {
    brushS: 'The little brush. For tiny details.', brushB: 'The big brush. For big ideas.',
    sponge: 'The sponge goes dab, dab, dab.', cloth: 'The cloth wipes paint away.',
  },
  gridOn: 'Grid on. A little dot in every square.',
  gridOff: 'Grid off. Clean paper.',
  zoomed: 'Pinch to zoom. Tap twice to see the whole paper.',
  tabs: 'Pull a tab out for more paper. Push it in for less.',
  tabsDone: 'Your painting stays right where it is.',
  paper: {
    screen: 'A sheet that fits the screen.', big: 'A big sheet. Room for tiny details.', tall: 'A tall sheet. Pinch to look closer, slide with two fingers.',
    wide: 'A wide sheet. Pinch to look closer, slide with two fingers.', small: 'A small sheet. Chunky and quick.',
  },
  first: 'Oh! You started. Good.',
  praise: ['Hmm. Not bad at all.', 'Ooh. I see what you are doing.', 'Keep going. I am watching.', 'That part is my favorite.', "Hmph. That's actually very good.", 'Bold! I like bold.'],
  many: 'So many colors. Very brave.',
  wipe: 'Wiping is fine. Real artists do it all the time.',
  empty: 'The paper is empty! Paint something first.',
  hung: ["Hmph. It's wonderful. Don't tell anyone I said so.", 'Up it goes! The studio looks better already.', "A masterpiece. I'll allow it."],
  saving: 'Saving it for you. Hold still. I mean, the painting.',
  bye: 'Your painting will wait on the easel.',
  art: ['I remember this one. Still good.', 'Hanging art is the best part.', "Very nice. I'd sniff it."],
};
