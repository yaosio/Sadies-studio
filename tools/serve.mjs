// `npm start`: serve the repo on http://localhost:8000 (ES modules need http, not file://).
import { serve } from '../tests/helpers/server.mjs';
const { url } = await serve(undefined, 8000);
console.log('Sadie\'s Studio at ' + url + '/index.html');
