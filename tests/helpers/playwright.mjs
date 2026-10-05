// Playwright is a dev-only tool (not shipped). Use the local install if there is
// one, otherwise the global one (the Claude cloud environment has it).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

export async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* try global */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(globalRoot + '/')('playwright');
}

export async function launch(extraArgs = []) {
  const pw = await loadPlaywright();
  const engines = pw.chromium ? pw : pw.default;
  const name = process.env.BROWSER || 'chromium'; // chromium (default), webkit or firefox: see tests/engines.mjs
  return name === 'chromium' ? engines.chromium.launch({ args: ['--use-gl=swiftshader', '--no-sandbox', ...extraArgs] }) : engines[name].launch();
}
