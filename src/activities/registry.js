// Every activity the world knows about. To add one: write the module in its own
// folder under src/activities/, then list its factory here and give the room an
// object that opens it (see docs/architecture.md).
import { createPainting } from './painting/index.js';

export const ACTIVITIES = { painting: createPainting };
