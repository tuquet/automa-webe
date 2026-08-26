<template>
  <ui-modal
    :model-value="modelValue"
    title="Browser Fleet Manager"
    content-class="max-w-2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4 py-1 text-xs text-gray-800 dark:text-gray-200">
      <!-- Top Action Bar -->
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-3"
      >
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            data-testid="btn-create-browser"
            class="px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center space-x-1 transition shadow-xs"
            @click="showCreateForm = !showCreateForm"
          >
            <v-remixicon name="riAddLine" size="14" />
            <span>New Browser</span>
          </button>

          <button
            data-testid="btn-autodetect-browsers"
            class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            title="Auto-detect host Chrome, Edge, Brave, Chromium instances"
            :disabled="isDetecting"
            @click="onAutoDetect"
          >
            <v-remixicon
              name="riSearch2Line"
              size="14"
              :class="{ 'animate-spin': isDetecting }"
            />
            <span>Auto-Detect</span>
          </button>

          <button
            data-testid="btn-download-chromium"
            class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            title="Download portable managed Chromium binary"
            :disabled="isDownloading"
            @click="onDownloadChromium"
          >
            <v-remixicon
              name="riDownloadLine"
              size="14"
              :class="{ 'animate-spin': isDownloading }"
            />
            <span>Download Chromium</span>
          </button>

          <button
            data-testid="btn-refresh-browsers"
            class="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition text-gray-500"
            @click="loadBrowsers"
          >
            <v-remixicon
              name="riRefreshLine"
              size="14"
              :class="{ 'animate-spin': isLoading }"
            />
          </button>
        </div>

        <button
          data-testid="btn-kill-all-browsers"
          class="px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-medium flex items-center space-x-1 transition"
          title="Force terminate all Chrome instances and child workers"
          @click="onKillAllBrowsers"
        >
          <v-remixicon name="riStopCircleLine" size="14" />
          <span>Kill All</span>
        </button>
      </div>

      <!-- Create New Browser Form (Collapsible) -->
      <div
        v-if="showCreateForm"
        class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-3"
      >
        <h4
          class="font-semibold text-xs text-gray-900 dark:text-gray-100 flex items-center"
        >
          <v-remixicon
            name="riAddCircleLine"
            size="14"
            class="mr-1 text-accent"
          />
          Create Anti-Detect Browser Profile
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Browser Name *</label
            >
            <input
              v-model="newBrowser.name"
              data-testid="input-browser-name"
              type="text"
              placeholder="e.g. Chrome Profile 1"
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Browser Type</label
            >
            <select
              v-model="newBrowser.browser_type"
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="chromium">Chromium</option>
              <option value="chrome">Google Chrome</option>
              <option value="firefox">Firefox</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-1">
          <button
            class="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="showCreateForm = false"
          >
            Cancel
          </button>
          <button
            data-testid="btn-submit-create-browser"
            class="px-3 py-1 text-xs rounded-md bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
            :disabled="!newBrowser.name || isSubmitting"
            @click="onCreateBrowser"
          >
            Create Profile
          </button>
        </div>
      </div>

      <!-- Browsers List -->
      <div class="max-h-72 overflow-y-auto space-y-2 pr-1">
        <div v-if="isLoading" class="py-8 text-center text-gray-400">
          <v-remixicon
            name="riLoader2Line"
            size="20"
            class="animate-spin inline-block mb-1"
          />
          <p>Loading browser profiles from SQLite...</p>
        </div>

        <!-- Level 3 Master Resolver / Self-Healing Empty State -->
        <div
          v-else-if="browsers.length === 0"
          class="p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center bg-gray-50/50 dark:bg-gray-850/40 space-y-3"
        >
          <v-remixicon
            name="riGlobalLine"
            size="28"
            class="inline-block text-accent"
          />
          <div>
            <p class="font-semibold text-gray-800 dark:text-gray-200">
              No Browser Profiles Configured
            </p>
            <p class="text-[11px] text-gray-400 max-w-sm mx-auto mt-1">
              Choose an action below to self-heal and configure runtime browsers
              for workflow executions:
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              data-testid="btn-autodetect-browsers-empty"
              class="px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center space-x-1.5 shadow-xs transition"
              @click="onAutoDetect"
            >
              <v-remixicon name="riSearch2Line" size="14" />
              <span>Auto-Detect Host Browsers</span>
            </button>

            <button
              data-testid="btn-download-chromium-empty"
              class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium flex items-center space-x-1.5 transition"
              @click="onDownloadChromium"
            >
              <v-remixicon name="riDownloadLine" size="14" />
              <span>Download Managed Chromium</span>
            </button>
          </div>
        </div>

        <!-- Profiles List -->
        <div
          v-for="b in browsers"
          :key="b.id"
          class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600 transition flex items-center justify-between"
        >
          <div class="flex items-center space-x-2.5 min-w-0 pr-2">
            <div
              class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              :class="
                b.isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              "
            >
              <v-remixicon name="riGlobalLine" size="16" />
            </div>

            <div class="flex flex-col min-w-0">
              <div class="flex items-center space-x-1.5">
                <span
                  class="font-medium text-xs text-gray-900 dark:text-gray-100 truncate"
                  >{{ b.name || b.id }}</span
                >
                <span
                  v-if="b.id === defaultBrowserId"
                  class="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                >
                  ⭐ Default
                </span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold"
                  :class="
                    b.isOnline
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  "
                >
                  {{ b.isOnline ? 'Online' : 'Offline' }}
                </span>
              </div>
              <span class="text-[10px] text-gray-400 font-mono truncate"
                >ID: {{ b.id }}</span
              >
            </div>
          </div>

          <div class="flex items-center space-x-1.5 shrink-0">
            <!-- Set as Default Button -->
            <button
              data-testid="btn-set-default-browser"
              class="p-1 rounded-md transition"
              :class="
                b.id === defaultBrowserId
                  ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              "
              :title="
                b.id === defaultBrowserId
                  ? 'Default Browser (Auto-selected for runs)'
                  : 'Set as Default Browser'
              "
              @click="onSetDefault(b.id)"
            >
              <v-remixicon
                :name="b.id === defaultBrowserId ? 'riStarFill' : 'riStarLine'"
                size="15"
              />
            </button>

            <!-- Launch / Stop Session -->
            <button
              v-if="!b.isOnline"
              data-testid="btn-launch-browser"
              class="px-2 py-1 text-xs rounded-md border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
              title="Launch browser session"
              @click="onLaunchBrowser(b.id)"
            >
              Launch
            </button>
            <button
              v-else
              data-testid="btn-stop-browser"
              class="px-2 py-1 text-xs rounded-md border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition"
              title="Close browser session"
              @click="onCloseBrowser(b.id)"
            >
              Close
            </button>

            <!-- Delete Profile -->
            <button
              data-testid="btn-delete-browser"
              class="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
              title="Delete browser profile"
              @click="onDeleteBrowser(b.id)"
            >
              <v-remixicon name="riDeleteBin7Line" size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </ui-modal>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import {
  fetchBrowsers,
  createBrowserProfile,
  deleteBrowserProfile,
  launchBrowserSession,
  closeBrowserSession,
  killAllBrowserProcesses,
  autoDetectHostBrowsers,
  downloadChromiumBinary,
  setDefaultBrowserProfile,
  getDefaultBrowserProfile,
} from '../services/storage.service';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
const toast = useToast();

const browsers = ref([]);
const defaultBrowserId = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isDetecting = ref(false);
const isDownloading = ref(false);
const showCreateForm = ref(false);

const newBrowser = reactive({
  name: '',
  browser_type: 'chromium',
});

async function loadBrowsers() {
  isLoading.value = true;
  try {
    const [browserList, defId] = await Promise.all([
      fetchBrowsers(),
      getDefaultBrowserProfile(),
    ]);
    browsers.value = browserList;
    defaultBrowserId.value = defId;
  } catch (err) {
    toast.error(`Failed to load browsers: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function onSetDefault(id) {
  try {
    await setDefaultBrowserProfile(id);
    defaultBrowserId.value = id;
    toast.success('Set as default browser!');
  } catch (err) {
    toast.error(`Failed to set default: ${err.message}`);
  }
}

async function onAutoDetect() {
  isDetecting.value = true;
  try {
    const res = await autoDetectHostBrowsers();
    toast.success(
      `Auto-detection complete! Found ${res.length || 0} browser(s).`
    );
    await loadBrowsers();
  } catch (err) {
    toast.error(`Auto-detection failed: ${err.message}`);
  } finally {
    isDetecting.value = false;
  }
}

async function onDownloadChromium() {
  isDownloading.value = true;
  try {
    toast.info('Starting managed Chromium download...');
    await downloadChromiumBinary();
    toast.success('Managed Chromium installed successfully!');
    await loadBrowsers();
  } catch (err) {
    toast.error(`Download failed: ${err.message}`);
  } finally {
    isDownloading.value = false;
  }
}

async function onCreateBrowser() {
  if (!newBrowser.name) return;
  isSubmitting.value = true;
  try {
    await createBrowserProfile({
      name: newBrowser.name,
      browser_type: newBrowser.browser_type,
    });
    toast.success('Browser profile created successfully!');
    newBrowser.name = '';
    showCreateForm.value = false;
    await loadBrowsers();
  } catch (err) {
    toast.error(`Create failed: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function onLaunchBrowser(id) {
  try {
    await launchBrowserSession(id);
    toast.success('Browser launched!');
    await loadBrowsers();
  } catch (err) {
    toast.error(`Launch failed: ${err.message}`);
  }
}

async function onCloseBrowser(id) {
  try {
    await closeBrowserSession(id);
    toast.info('Browser session closed.');
    await loadBrowsers();
  } catch (err) {
    toast.error(`Close failed: ${err.message}`);
  }
}

async function onDeleteBrowser(id) {
  try {
    await deleteBrowserProfile(id);
    toast.success('Browser profile deleted.');
    await loadBrowsers();
  } catch (err) {
    toast.error(`Delete failed: ${err.message}`);
  }
}

async function onKillAllBrowsers() {
  try {
    await killAllBrowserProcesses();
    toast.success('All browser processes terminated cleanly!');
    await loadBrowsers();
  } catch (err) {
    toast.error(`Kill failed: ${err.message}`);
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadBrowsers();
  }
);

onMounted(() => {
  if (props.modelValue) loadBrowsers();
});
</script>
