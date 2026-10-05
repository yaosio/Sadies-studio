// Playwright is a dev-only tool (not shipped). Use the local install if there is
// one, otherwise the global one (the Claude cloud environment has it).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

export async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* try global */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(globalRoot + '/')('playwright');
}

export async function launch() {
  const pw = await loadPlaywright();
  const chromium = pw.chromium || pw.default.chromium;
  return chromium.launch({ args: ['--use-gl=swiftshader', '--no-sandbox'] });
}
