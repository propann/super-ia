import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findVaultContext } from '../dist/web/vault-context.js';

test('Obsidian selects relevant excerpts and excludes hidden and external files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vault-context-'));
  const vault = join(directory, 'vault');
  try {
    await mkdir(vault);
    await mkdir(join(vault, '.private'));
    await writeFile(join(vault, 'Mesh.md'), 'Meshtastic utilise LoRa pour communiquer.');
    await writeFile(join(vault, 'Autre.md'), 'Cuisine et recettes.');
    await writeFile(join(vault, '.private', 'Cache.md'), 'Meshtastic confidentiel');
    await writeFile(join(directory, 'secret.md'), 'Meshtastic externe');
    await symlink(join(directory, 'secret.md'), join(vault, 'externe.md'));
    const matches = await findVaultContext(vault, 'Comment fonctionne Meshtastic ?');
    assert.deepEqual(matches.map(item => item.path), ['Mesh.md']);
    assert.match(matches[0].excerpt, /LoRa/);
    assert.deepEqual(await findVaultContext(vault, 'Inconnu'), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
