<template>
  <div
    class="storage-file-explorer flex flex-col h-[520px] text-xs text-gray-800 dark:text-gray-200"
  >
    <!-- Search and Action Bar -->
    <div
      class="flex items-center space-x-2 pb-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="relative flex-1">
        <v-remixicon
          name="riSearchLine"
          size="14"
          class="absolute left-2.5 top-2.5 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search workflows & campaigns in Storage..."
          class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <button
        class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 font-medium transition"
        title="Refresh Storage Files List"
        @click="loadFiles"
      >
        <v-remixicon
          name="riRefreshLine"
          size="14"
          :class="{ 'animate-spin': isLoading }"
        />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>

    <!-- Files List Area -->
    <div class="flex-1 overflow-y-auto py-3 space-y-4">
      <div v-if="isLoading" class="py-12 text-center text-gray-400">
        <v-remixicon
          name="riLoader4Line"
          size="20"
          class="animate-spin inline-block mb-1"
        />
        <p>Scanning Storage workspace...</p>
      </div>

      <div
        v-else-if="filteredFiles.length === 0"
        class="py-12 text-center text-gray-400"
      >
        <v-remixicon
          name="riFolderOpenLine"
          size="24"
          class="inline-block mb-2 text-gray-300 dark:text-gray-600"
        />
        <p class="font-medium">No matching files found in Storage</p>
        <p class="text-[11px] text-gray-400 mt-1">
          Make sure automa-core is running and files exist in workspace
        </p>
      </div>

      <div v-else class="space-y-3">
        <!-- Workflows Section -->
        <div v-if="workflows.length > 0">
          <div
            class="flex items-center space-x-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-1"
          >
            <v-remixicon name="riFlowChart" size="13" class="text-accent" />
            <span>Workflows ({{ workflows.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-1.5">
            <div
              v-for="file in workflows"
              :key="file.path"
              class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-accent hover:shadow-xs transition flex items-center justify-between group cursor-pointer"
              @click="$emit('select', file)"
            >
              <div class="flex items-center space-x-2.5 min-w-0 pr-2">
                <div
                  class="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/60 text-accent flex items-center justify-center shrink-0"
                >
                  <v-remixicon name="riFlowChart" size="16" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="font-medium text-xs text-gray-900 dark:text-gray-100 truncate group-hover:text-accent transition"
                  >
                    {{ file.name }}
                  </span>
                  <span
                    class="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate"
                  >
                    {{ file.relative_path }}
                  </span>
                </div>
              </div>

              <div class="flex items-center space-x-1 shrink-0">
                <button
                  class="px-2.5 py-1 text-[11px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 transition shadow-xs"
                  @click.stop="$emit('select', file)"
                >
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Campaigns Section -->
        <div v-if="campaigns.length > 0">
          <div
            class="flex items-center space-x-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-1 pt-2"
          >
            <v-remixicon
              name="riRocketLine"
              size="13"
              class="text-emerald-500"
            />
            <span>Campaigns ({{ campaigns.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-1.5">
            <div
              v-for="file in campaigns"
              :key="file.path"
              class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-emerald-500 hover:shadow-xs transition flex items-center justify-between group"
            >
              <div class="flex items-center space-x-2.5 min-w-0 pr-2">
                <div
                  class="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center shrink-0"
                >
                  <v-remixicon name="riRocketLine" size="16" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="font-medium text-xs text-gray-900 dark:text-gray-100 truncate"
                  >
                    {{ file.name }}
                  </span>
                  <span
                    class="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate"
                  >
                    {{ file.relative_path }}
                  </span>
                </div>
              </div>

              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
              >
                Campaign
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Bar -->
    <div
      class="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-gray-500"
    >
      <span class="text-[11px]">
        Total: {{ filteredFiles.length }} file(s) in Storage
      </span>
      <button
        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchStorageFiles } from './storage-service';

defineEmits(['select', 'close']);

const files = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);

async function loadFiles() {
  isLoading.value = true;
  try {
    const list = await fetchStorageFiles();
    files.value = Array.isArray(list) ? list : [];
  } catch (_) {
    files.value = [];
  } finally {
    isLoading.value = false;
  }
}

const filteredFiles = computed(() => {
  if (!searchQuery.value.trim()) return files.value;
  const q = searchQuery.value.toLowerCase().trim();
  return files.value.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.relative_path.toLowerCase().includes(q)
  );
});

const workflows = computed(() =>
  filteredFiles.value.filter((f) => f.file_type === 'workflow')
);

const campaigns = computed(() =>
  filteredFiles.value.filter((f) => f.file_type === 'campaign')
);

onMounted(() => {
  loadFiles();
});
</script>
