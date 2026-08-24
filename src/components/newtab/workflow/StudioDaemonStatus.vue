<template>
  <div class="relative inline-flex items-center">
    <button
      data-testid="btn-daemon-status"
      class="px-2 py-1 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition-colors shadow-sm"
      :class="statusClasses"
      :title="tooltipText"
      @click="handleStatusClick"
    >
      <!-- Status LED Indicator -->
      <span class="relative flex h-2 w-2">
        <span
          v-if="state.status === 'online'"
          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
        ></span>
        <span
          class="relative inline-flex rounded-full h-2 w-2"
          :class="dotClasses"
        ></span>
      </span>

      <span class="font-semibold text-[11px]">
        {{ labelText }}
      </span>

      <span
        v-if="state.status === 'online' && state.latency > 0"
        class="text-[10px] opacity-70 hidden sm:inline"
      >
        {{ state.latency }}ms
      </span>
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useDaemonHealth } from '@/composable/useDaemonHealth';
import { useToast } from 'vue-toastification';

const { state, checkHealth, startPolling, stopPolling } = useDaemonHealth();
const toast = useToast();

onMounted(() => {
  startPolling(4000);
});

onUnmounted(() => {
  stopPolling();
});

const labelText = computed(() => {
  if (state.status === 'online') return 'Daemon Online';
  if (state.status === 'checking') return 'Connecting...';
  return 'Daemon Offline';
});

const tooltipText = computed(() => {
  if (state.status === 'online') {
    const browsersCount = state.browsers?.length || 0;
    return `Rust Core Daemon Connected (${state.baseUrl}) | Latency: ${state.latency}ms | Browser Profiles: ${browsersCount}`;
  }
  return `Cannot connect to Rust Daemon at ${state.baseUrl}. Please ensure "Serve: Live Studio" or automa-core is running. Click to re-check.`;
});

const statusClasses = computed(() => {
  if (state.status === 'online') {
    return 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';
  }
  if (state.status === 'checking') {
    return 'border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
  }
  return 'border-rose-200 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50';
});

const dotClasses = computed(() => {
  if (state.status === 'online') return 'bg-emerald-500';
  if (state.status === 'checking') return 'bg-amber-500 animate-pulse';
  return 'bg-rose-500';
});

async function handleStatusClick() {
  toast.info('Checking Rust Daemon connection...');
  await checkHealth();
  if (state.status === 'online') {
    toast.success(`Daemon connected (${state.latency}ms)`);
  } else {
    toast.error(`Daemon unreachable at ${state.baseUrl}`);
  }
}
</script>
