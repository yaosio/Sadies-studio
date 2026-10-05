# Art style

Reference look: the approved mockup ([mockup.md](mockup.md)).

## The look

90s 2D activity-center, modernized. Rich, bright, saturated pixel art with
**ordered dithering** (Bayer 4x4) for shading and soft transitions. Higher
resolution and more detail than the 90s originals, but still unmistakably
pixels.

## Hard rules

- **Never smooth pixel art.** Integer scale factors only. Canvas uses
  `imageSmoothingEnabled = false`; CSS uses `image-rendering: pixelated`.
- **Dither, don't gradient.** Fake gradients with the Bayer pattern.
- **Dark outlines** in a deep purple ink (mockup uses `#4b3a5e`), not black.
- **Bright and warm** in every setting. The scene does not follow
  light/dark mode.
- **Not office software, not baby.** No flat grey chrome, no thick rounded
  primary-color frames.

## Palette (from the mockup, authoritative until a palette file exists)

- Ink `#4b3a5e`, paper `#fffaf0`
- Studio wall mint `#86ddd0`; side rooms warm yellow and soft lilac
- Floor warm wood `#e9a866`; trim cream `#fff1dc`
- Paint colors (10, the child's full set): red `#ec3b3b`, orange `#ff8c1a`,
  yellow `#ffd60a`, green `#3cc24a`, blue `#2e7cf6`, purple `#8b4fe0`,
  pink `#ff6fb5`, brown `#9a5a2c`, black `#2a2238`, white `#ffffff`

When code exists, the palette lives in one file and everything imports it.
Do not hardcode colors in new code.

## Type

Pixelify Sans for Sadie's speech, hosted in the app (no third-party requests). Fall back to system sans.

## Sadie

A grey and white cat with pink ears and green eyes, drawn as a small sprite
with a tail that sways and a blink. She appears in the room and in a speech
bubble face. She is dry, a bit grumpy, secretly kind ("Hmph. That's actually
very good."). Keep lines short.

## Source of art

All art is drawn in code with the pixel toolkit, no image files (see
[decisions.md](decisions.md)).
