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
});

let isChecking = false;
let checkInterval = null;

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
    // Ignore fetch error
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
    // Ignore fetch error
  }
}

function startPolling(intervalMs = 5000) {
  checkHealth();
  if (!checkInterval) {
    checkInterval = setInterval(checkHealth, intervalMs);
  }
}

function stopPolling() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export function useDaemonHealth() {
  return {
    state: readonly(state),
    rawState: state,
    checkHealth,
    fetchBrowsers,
    fetchMetrics,
    startPolling,
    stopPolling,
  };
}
