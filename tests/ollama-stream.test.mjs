import test from 'node:test';
import assert from 'node:assert/strict';
import { readOllamaEvents } from '../dist/web/ollama-stream.js';

function stream(text, size = 1) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
    controller.close();
  } });
}
async function collect(text, size) {
  const events = [];
  for await (const event of readOllamaEvents(stream(text, size))) events.push(event);
  return events;
}
test('preserves fragmented UTF-8 and the final event without newline', async () => {
  const events = await collect('{"message":{"content":"été 🎵"}}\r\n{"done":true,"done_reason":"length"}');
  assert.equal(events[0].message.content, 'été 🎵');
  assert.equal(events[1].done_reason, 'length');
});
test('surfaces upstream errors even when HTTP succeeded', async () => {
  await assert.rejects(collect('{"error":"mémoire insuffisante"}\n', 20), /mémoire insuffisante/);
});
test('rejects interrupted streams rather than reporting success', async () => {
  await assert.rejects(collect('{"message":{"content":"réponse partielle"}}\n'), /interrompu/);
});
test('rejects malformed final JSON', async () => {
  await assert.rejects(collect('{"done":'), SyntaxError);
});
