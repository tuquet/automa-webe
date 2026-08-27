<template>
  <ui-modal
    :model-value="modelValue"
    title="Browser Fleet Manager"
    content-class="max-w-2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4 py-1 text-xs text-foreground">
      <!-- Top Action Bar -->
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3"
      >
        <div class="flex flex-wrap items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            data-testid="btn-create-browser"
            @click="showCreateForm = !showCreateForm"
          >
            <Plus class="size-3.5 mr-1" />
            <span>New Browser</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            data-testid="btn-autodetect-browsers"
            title="Auto-detect host Chrome, Edge, Brave, Chromium instances"
            :disabled="isDetecting"
            @click="onAutoDetect"
          >
            <Search
              class="size-3.5 mr-1"
              :class="{ 'animate-spin': isDetecting }"
            />
            <span>Auto-Detect</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            data-testid="btn-download-chromium"
            title="Download portable managed Chromium binary"
            :disabled="isDownloading"
            @click="onDownloadChromium"
          >
            <Download
              class="size-3.5 mr-1"
              :class="{ 'animate-spin': isDownloading }"
            />
            <span>Download Chromium</span>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            data-testid="btn-refresh-browsers"
            @click="loadBrowsers"
          >
            <RefreshCw
              class="size-3.5"
              :class="{ 'animate-spin': isLoading }"
            />
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          data-testid="btn-kill-all-browsers"
          title="Force terminate all Chrome instances and child workers"
          @click="onKillAllBrowsers"
        >
          <Square class="size-3.5 mr-1" />
          <span>Kill All</span>
        </Button>
      </div>

      <!-- Create New Browser Form (Collapsible) -->
      <div
        v-if="showCreateForm"
        class="p-3 rounded-lg bg-muted/40 border border-border space-y-3"
      >
        <h4
          class="font-semibold text-xs text-foreground flex items-center gap-1.5"
        >
          <Plus class="size-3.5 text-primary" />
          <span>Create Anti-Detect Browser Profile</span>
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Browser Name *
            </label>
            <Input
              v-model="newBrowser.name"
              data-testid="input-browser-name"
              type="text"
              placeholder="e.g. Chrome Profile 1"
              class="h-8 text-xs"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Browser Type
            </label>
            <select
              v-model="newBrowser.browser_type"
              data-testid="select-browser-type"
              class="w-full h-8 px-2.5 py-1 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground text-xs"
            >
              <option value="chromium">Chromium</option>
              <option value="chrome">Google Chrome</option>
              <option value="firefox">Firefox</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" size="xs" @click="showCreateForm = false">
            Cancel
          </Button>
          <Button
            variant="default"
            size="xs"
            data-testid="btn-submit-create-browser"
            :disabled="!newBrowser.name || isSubmitting"
            @click="onCreateBrowser"
          >
            Create Profile
          </Button>
        </div>
      </div>

      <!-- Browsers List -->
      <div class="max-h-72 overflow-y-auto space-y-2 pr-1">
        <div v-if="isLoading" class="py-8 text-center text-muted-foreground">
          <Loader2 class="size-5 animate-spin inline-block mb-1 text-primary" />
          <p>Loading browser profiles from SQLite...</p>
        </div>

        <!-- Level 3 Master Resolver / Self-Healing Empty State -->
        <div
          v-else-if="browsers.length === 0"
          class="p-5 rounded-xl border border-dashed border-border text-center bg-muted/20 space-y-3"
        >
          <Globe class="size-7 inline-block text-primary" />
          <div>
            <p class="font-semibold text-foreground">
              No Browser Profiles Configured
            </p>
            <p class="text-[11px] text-muted-foreground max-w-sm mx-auto mt-1">
              Choose an action below to self-heal and configure runtime browsers
              for workflow executions:
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              data-testid="btn-autodetect-browsers-empty"
              @click="onAutoDetect"
            >
              <Search class="size-3.5 mr-1" />
              <span>Auto-Detect Host Browsers</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              data-testid="btn-download-chromium-empty"
              @click="onDownloadChromium"
            >
              <Download class="size-3.5 mr-1" />
              <span>Download Managed Chromium</span>
            </Button>
          </div>
        </div>

        <!-- Profiles List -->
        <div
          v-for="b in browsers"
          :key="b.id"
          class="p-2.5 rounded-lg border border-border bg-card hover:border-border/80 transition flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5 min-w-0 pr-2">
            <div
              class="size-7 rounded-md flex items-center justify-center shrink-0"
              :class="
                b.isOnline
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-muted text-muted-foreground'
              "
            >
              <Globe class="size-4" />
            </div>

            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-medium text-xs text-foreground truncate">
                  {{ b.name || b.id }}
                </span>
                <Badge
                  v-if="b.id === defaultBrowserId"
                  variant="warning"
                  class="text-[9px] px-1 py-0"
                >
                  ⭐ Default
                </Badge>
                <Badge
                  :variant="b.isOnline ? 'success' : 'outline'"
                  class="text-[9px] px-1 py-0"
                >
                  {{ b.isOnline ? 'Online' : 'Offline' }}
                </Badge>
              </div>
              <span
                class="text-[10px] text-muted-foreground font-mono truncate"
              >
                ID: {{ b.id }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Set as Default Button -->
            <Button
              variant="ghost"
              size="icon-sm"
              data-testid="btn-set-default-browser"
              :class="
                b.id === defaultBrowserId
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-muted-foreground'
              "
              :title="
                b.id === defaultBrowserId ? 'Default Browser' : 'Set as Default'
              "
              @click="onSetDefault(b.id)"
            >
              <Star
                class="size-3.5"
                :class="{ 'fill-amber-500': b.id === defaultBrowserId }"
              />
            </Button>

            <!-- Launch / Stop Session -->
            <Button
              v-if="!b.isOnline"
              variant="outline"
              size="xs"
              data-testid="btn-launch-browser"
              class="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              title="Launch browser session"
              @click="onLaunchBrowser(b.id)"
            >
              Launch
            </Button>
            <Button
              v-else
              variant="outline"
              size="xs"
              data-testid="btn-stop-browser"
              class="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
              title="Close browser session"
              @click="onCloseBrowser(b.id)"
            >
              Close
            </Button>

            <!-- Delete Profile -->
            <Button
              variant="ghost"
              size="icon-sm"
              data-testid="btn-delete-browser"
              class="text-muted-foreground hover:text-destructive"
              title="Delete browser profile"
              @click="onDeleteBrowser(b.id)"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </ui-modal>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { Badge, Button, Input } from '@automa/ui';
import {
  Download,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Square,
  Star,
  Trash2,
} from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import { useDaemonHealth } from '../../composable/useDaemonHealth';
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
const daemonHealth = useDaemonHealth();

const browsers = ref([]);
const defaultBrowserId = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isDetecting = ref(false);
const isDownloading = ref(false);
const showCreateForm = ref(false);
let unsubSse = null;

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
    await downloadChromiumBinary();
    toast.success('Managed Chromium downloaded successfully!');
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
    toast.success('Browser profile created!');
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

  // SSE Real-time Reactive Invalidation for Browser Fleet & Sessions
  if (daemonHealth?.addEventListener) {
    unsubSse = daemonHealth.addEventListener((payload) => {
      if (
        !payload ||
        payload.type === 'browser_created' ||
        payload.type === 'browser_deleted' ||
        payload.type === 'browser_online' ||
        payload.type === 'browser_offline' ||
        payload.type === 'browser_session_started' ||
        payload.type === 'browser_session_stopped' ||
        payload.type === 'settings_updated' ||
        (payload.message && payload.message.toLowerCase().includes('browser'))
      ) {
        if (props.modelValue) {
          loadBrowsers();
        }
      }
    });
  }
});

onUnmounted(() => {
  if (unsubSse) {
    unsubSse();
    unsubSse = null;
  }
});
</script>
