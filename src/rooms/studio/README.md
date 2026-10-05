# Sadie's studio

The only room: three zones side by side (left side room, studio, right side
room) drawn as a dollhouse cutaway, 1724 room pixels wide.

- `room.js`: the data (anchors, hotspots, lines, which painter to call).
- `geometry.js`: fixed numbers; positions come from the floor line so the room
  stretches to tall screens.
- `art.js`: draws the room once into a bitmap (dense, on purpose).
- `lines.js`: what Sadie says about each object.

The side rooms are "in progress" placeholders (ladders, paint cans, signs). To
make one real, give it its own room data and a way to switch rooms in
`src/world/world.js`. The easel board and clothesline positions are anchors here;
the painting activity draws their contents.
