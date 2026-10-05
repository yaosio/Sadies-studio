// Builds dist/index.html (and dist/artifact.html, the same without the html/head/body
// wrapper): the whole app in ONE self-contained file (script, css
// and font inlined), for places that host a single page such as a claude.ai
// artifact. No dependencies. It works because source modules follow three rules,
// which the build checks:
//   - imports are one line each: import { a, b } from './x.js';
//   - exports are `export const|function|class name` (no default, no `export let`)
//   - no circular imports
// Each module is wrapped in a function and gets its imports from a registry.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const order = [], seen = new Set(), sources = {};

function visit(path, stack = []) {
  if (stack.includes(path)) throw new Error('circular import: ' + [...stack, path].join(' -> '));
  if (seen.has(path)) return;
  let src = read(path);
  const exportsList = [];
  src = src.replace(/^import \{([^}]*)\} from '(\.[^']+)';?[ \t]*$/gm, (m, names, spec) => {
    const dep = relative(ROOT, resolve(ROOT, dirname(path), spec)).replaceAll('\\', '/');
    visit(dep, [...stack, path]);
    const bind = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^(\S+) as (\S+)$/, '$1: $2')).join(', ');
    return `const { ${bind} } = __require(${JSON.stringify(dep)});`;
  });
  if (/^import /m.test(src)) throw new Error(path + ': unsupported import form');
  if (/^export (default|let|\{)/m.test(src)) throw new Error(path + ': unsupported export form');
  src = src.replace(/^export (const|function|class) ([A-Za-z0-9_$]+)/gm, (m, kind, name) => { exportsList.push(name); return `${kind} ${name}`; });
  sources[path] = `${src}\nreturn { ${exportsList.join(', ')} };`;
  seen.add(path);
  order.push(path);
}
visit('src/main.js');

const font = readFileSync(join(ROOT, 'assets/fonts/PixelifySans.woff2')).toString('base64');
const css = read('src/style.css').replace(/url\("\.\.\/assets\/fonts\/PixelifySans\.woff2"\)/, `url(data:font/woff2;base64,${font})`);
const modules = order.map((p) => `__define(${JSON.stringify(p)}, function () {\n'use strict';\n${sources[p]}\n});`).join('\n');
const script = `(function () {
'use strict';
const defs = {}, cache = {};
const __define = (id, fn) => { defs[id] = fn; };
const __require = (id) => cache[id] || (cache[id] = defs[id]());
${modules}
__require('src/main.js');
})();`;

const html = read('index.html')
  .replace('<link rel="stylesheet" href="src/style.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${script.replaceAll('</script', '<\\/script')}\n</script>`);
if (html.includes('src/main.js"></script>')) throw new Error('index.html changed shape; update tools/build.mjs');
mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist/index.html'), html);
// Artifact page: the artifact host wraps the file in its own doctype/head/body, so
// give it just the title, style and body content.
const grab = (re) => (html.match(re) || [])[1];
const page = `<title>${grab(/<title>([^<]*)<\/title>/)}</title>\n<style>\n${css}\n</style>\n${grab(/<body>([\s\S]*)<\/body>/).trim()}\n`;
writeFileSync(join(ROOT, 'dist/artifact.html'), page);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB  (${order.length} modules)`);
