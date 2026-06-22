import { getToken } from './api';

export interface RealtimeEvent {
  kind: 'connected' | 'workbenches' | 'shifts';
  workbenchId?: number;
}

type Listener = (event: RealtimeEvent) => void;

let source: EventSource | null = null;
let refCount = 0;
const listeners = new Set<Listener>();

function open() {
  const token = getToken();
  if (!token || source) return;
  source = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);
  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as RealtimeEvent;
      listeners.forEach((l) => l(data));
    } catch {
      /* ignore malformed events */
    }
  };
  // The browser auto-reconnects on error using the server's `retry` hint.
}

function close() {
  source?.close();
  source = null;
}

// Subscribe to realtime events. Opens the shared connection on first subscriber
// and closes it when the last one unsubscribes.
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  refCount += 1;
  open();
  return () => {
    listeners.delete(listener);
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
      close();
    }
  };
}
