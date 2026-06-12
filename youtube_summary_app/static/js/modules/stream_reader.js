export async function readEventStream(response, handlers = {}) {
  if (!response.ok || !response.body) throw new Error("Stream failed.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  function processEvent(eventText) {
    const dataLines = eventText
      .split(/\r?\n/)
      .filter((item) => item.startsWith("data: "))
      .map((item) => item.slice(6));
    if (!dataLines.length) return;
    const eventData = JSON.parse(dataLines.join("\n"));
    if (eventData.error) throw new Error(eventData.error);
    if (eventData.delta && handlers.onDelta) handlers.onDelta(eventData.delta);
    if (eventData.done && handlers.onDone) handlers.onDone(eventData);
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";
    for (const eventText of events) {
      processEvent(eventText);
    }
  }
  if (buffer.trim()) processEvent(buffer);
}
