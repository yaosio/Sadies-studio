// Lint: catches typos and dead code without style opinions. `npm run lint`.
// Globals are listed by hand so no extra package is needed.
const browser = ['window', 'document', 'navigator', 'location', 'localStorage', 'indexedDB', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'addEventListener', 'removeEventListener', 'innerWidth', 'innerHeight', 'devicePixelRatio',
  'matchMedia', 'URL', 'URLSearchParams', 'Blob', 'File', 'Image', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Int32Array', 'Float32Array', 'AudioContext', 'webkitAudioContext',
  'OffscreenCanvas', 'ImageData', 'console', 'globalThis', 'WeakMap', 'Promise', 'Map', 'Set', 'Math', 'JSON', 'Number', 'String', 'Array', 'Object', 'Date', 'Error', 'Infinity', 'NaN', 'parseInt', 'parseFloat', 'isNaN', 'Symbol', 'Boolean', 'RegExp', 'Intl', 'encodeURIComponent', 'decodeURIComponent', 'getComputedStyle', 'ResizeObserver', 'FileReader', 'DOMException', 'TextEncoder', 'TextDecoder', 'structuredClone', 'queueMicrotask', 'screen', 'visualViewport', 'MediaQueryListEvent', 'Event', 'OfflineAudioContext'];
const node = ['process', 'Buffer', 'console', '__dirname'];
const toGlobals = (names) => Object.fromEntries(names.map((n) => [n, 'readonly']));
const rules = {
  'no-undef': 'error', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-unreachable': 'error', 'no-dupe-keys': 'error',
  'no-dupe-else-if': 'error', 'no-redeclare': 'error', 'no-self-assign': 'error', 'no-sparse-arrays': 'error', 'use-isnan': 'error', 'valid-typeof': 'error',
  'no-const-assign': 'error', 'no-func-assign': 'error', 'no-empty': ['error', { allowEmptyCatch: true }], eqeqeq: ['error', 'always', { null: 'ignore' }],
};
export default [
  { ignores: ['dist/', 'node_modules/', 'tests/visual/'] },
  { files: ['src/**/*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: toGlobals(browser) }, rules },
  { files: ['tools/**/*.mjs', 'tests/**/*.mjs', 'tests/**/*.js', 'eslint.config.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: toGlobals([...node, ...browser]) }, rules },
];
