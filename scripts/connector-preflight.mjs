import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('.', import.meta.url).pathname, '..');
const registry = JSON.parse(readFileSync(resolve(root, 'config/connectors.json'), 'utf8'));

const checks = [
  { id: 'node', candidates: ['node'], required: true },
  { id: 'docker', candidates: ['docker'], required: true },
  { id: 'git', candidates: ['git'], required: false },
  { id: 'gh', candidates: ['gh'], required: false },
  { id: 'chromium', candidates: ['chromium', 'chromium-browser', 'google-chrome'], required: false }
];

function commandExists(command) {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0;
}

console.log('=== SUPER IA / CONNECTEURS ===');
console.log(`ordre: ${registry.mode_order.join(' -> ')}`);
console.log('');

let missingRequired = false;
for (const check of checks) {
  const found = check.candidates.find(commandExists);
  const state = found ? `présent (${found})` : 'absent';
  console.log(`${check.id.padEnd(10)} ${state}`);
  if (check.required && !found) missingRequired = true;
}

console.log('');
console.log('Connecteurs déclarés :');
for (const connector of registry.connectors) {
  console.log(`- ${connector.label}: ${connector.preferred_modes.join(' / ')}`);
}

if (missingRequired) {
  console.error('\nUn outil requis manque : Docker et Node sont nécessaires au socle.');
  process.exitCode = 1;
}
