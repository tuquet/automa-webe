import { reactive, readonly } from 'vue';

const state = reactive({
  status: 'checking', // 'online' | 'offline' | 'checking'
  version: '',
  latency: 0,
  port: 8765,
  baseUrl: 'http://127.0.0.1:8765',
  browsers: [],
  metrics: null,
  lastChecked: null,
  activeBlockId: null,
});

let isChecking = false;
let eventSource = null;
const eventListeners = new Set();

async function fetchBrowsers() {
  try {
    const res = await fetch(`${state.baseUrl}/api/browsers`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      state.browsers = Array.isArray(data) ? data : [];
    }
  } catch (_) {
    // Ignored
  }
}

async function fetchMetrics() {
  try {
    const res = await fetch(`${state.baseUrl}/api/system/metrics`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      state.metrics = await res.json();
    }
  } catch (_) {
    // Ignored
  }
}

async function checkHealth() {
  if (isChecking) return;
  isChecking = true;

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${state.baseUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      state.latency = Math.round(performance.now() - start);
      state.status = 'online';
      state.version = data.version || '0.1.0';
      state.lastChecked = new Date();

      // Fetch active browser profiles in background
      fetchBrowsers();
      fetchMetrics();
    } else {
      state.status = 'offline';
    }
  } catch (_) {
    clearTimeout(timeoutId);
    state.status = 'offline';
    state.latency = 0;
  } finally {
    isChecking = false;
  }
}

function initEventStream() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (eventSource) return;

  try {
    eventSource = new EventSource(`${state.baseUrl}/api/events`);

    eventSource.onopen = () => {
      state.status = 'online';
      state.lastChecked = new Date();
      fetchBrowsers();
      fetchMetrics();
    };

    eventSource.onerror = () => {
      state.status = 'offline';
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.blockId) {
          state.activeBlockId = payload.blockId;
        }
        eventListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (_) {
            // Ignored
          }
        });
      } catch (_) {
        // Ignored
      }
    };
  } catch (_) {
    state.status = 'offline';
  }
}

function closeEventStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function addEventListener(cb) {
  eventListeners.add(cb);
  return () => eventListeners.delete(cb);
}

export function useDaemonHealth() {
  return {
    state: readonly(state),
    rawState: state,
    checkHealth,
    fetchBrowsers,
    fetchMetrics,
    initEventStream,
    closeEventStream,
    addEventListener,
  };
}

export const useAutomaCoreHealth = useDaemonHealth;
export const useCoreHealth = useDaemonHealth;
