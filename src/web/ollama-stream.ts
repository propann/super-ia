/** Décode les événements NDJSON indépendamment des frontières réseau. */
export async function* readOllamaEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<any> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    while (true) {
      const part = await reader.read();
      buffer += decoder.decode(part.value ?? new Uint8Array(), { stream: !part.done });
      let boundary: number;
      while ((boundary = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (line) {
          const event = JSON.parse(line);
          if (event.error) throw new Error(String(event.error));
          completed ||= event.done === true;
          yield event;
        }
      }
      if (part.done) break;
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer);
      if (event.error) throw new Error(String(event.error));
      completed ||= event.done === true;
      yield event;
    }
    if (!completed) throw new Error("Flux Ollama interrompu avant la fin de la réponse.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
