<template>
  <header
    data-testid="studio-header"
    class="h-11 border-b border-border bg-card px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none relative text-foreground"
  >
    <!-- Left Section: Sidebar Toggle, New/Import/Open File, Storage Explorer & Browsers -->
    <div class="flex items-center gap-1.5 shrink-0">
      <Button
        variant="ghost"
        size="icon-sm"
        data-testid="btn-toggle-sidebar"
        :title="showSidebar ? 'Hide Sidebar' : 'Show Sidebar'"
        @click="$emit('toggleSidebar')"
      >
        <PanelLeft v-if="!showSidebar" class="size-3.5" />
        <PanelLeftClose v-else class="size-3.5" />
      </Button>

      <!-- Storage Explorer & Workspace Actions -->
      <Button
        v-if="automaCoreStatus === 'online'"
        variant="outline"
        size="sm"
        data-testid="btn-storage-explorer"
        title="Browse and Open Workflows from Storage workspace"
        @click="$emit('openStorageExplorer')"
      >
        <FolderTree class="size-3.5 mr-1 text-primary" />
        <span class="hidden lg:inline">Storage</span>
      </Button>

      <!-- New, Import & Open Workflow Group -->
      <div class="flex items-center gap-1">
        <AutomaButton
          id="btn.workflow.create"
          size="sm"
          variant="outline"
          title="Create New Blank Workflow"
          @click="$emit('newWorkflow')"
        />

        <AutomaButton
          id="btn.workflow.import"
          size="sm"
          variant="outline"
          title="Import Workflow JSON file from computer"
          @click="$emit('importWorkflow')"
        />

        <Button
          variant="outline"
          size="sm"
          data-testid="btn-open-file"
          title="Open Workflow JSON File from Computer"
          @click="$emit('openFilePicker')"
        >
          <FolderOpen class="size-3.5 mr-1" />
          <span class="hidden md:inline">Open</span>
        </Button>
      </div>

      <div
        v-if="automaCoreStatus === 'online'"
        class="h-3.5 w-px bg-border mx-0.5 hidden sm:block"
      ></div>

      <!-- Browsers Fleet & Kill All Quick Actions -->
      <div v-if="automaCoreStatus === 'online'" class="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          data-testid="btn-browsers-menu"
          title="Browser Fleet Manager"
          @click="$emit('openModal', 'browsers')"
        >
          <Globe class="size-3.5 mr-1" />
          <span class="hidden xl:inline">Browsers</span>
        </Button>

        <AutomaButton
          id="btn.browser.kill_all"
          size="sm"
          variant="destructive"
          icon-only
          title="Kill All Chrome / Worker Processes"
          @click="$emit('killAllBrowsers')"
        />
      </div>
    </div>

    <!-- Center Section: Selected Workflow Dropdown Switcher (Responsive) -->
    <div
      ref="workflowDropdownRef"
      class="flex-1 flex justify-center max-w-[160px] sm:max-w-xs md:max-w-md mx-1 sm:mx-2 relative"
      data-testid="select-storage-workflow"
    >
      <button
        id="btn.workflow.select_dropdown"
        type="button"
        data-testid="btn-selected-workflow"
        class="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-muted/50 hover:bg-muted transition flex items-center gap-1.5 truncate max-w-full text-foreground shadow-2xs cursor-pointer"
        :title="`Current Workflow: ${currentWorkflowName} ${
          currentFilePath ? `(${currentFilePath})` : ''
        } - Click to switch`"
        @click="toggleWorkflowDropdown"
      >
        <GitBranch class="size-3.5 text-primary shrink-0" />
        <span class="truncate font-semibold text-xs">{{
          currentWorkflowName
        }}</span>

        <!-- Unsaved changes dirty badge -->
        <Badge
          v-if="isDirty"
          variant="warning"
          class="shrink-0 px-1 py-0 text-[10px]"
        >
          Unsaved
        </Badge>

        <Badge
          v-if="currentWorkflowBlocksCount !== undefined"
          variant="outline"
          class="hidden md:inline-flex shrink-0 px-1 py-0 text-[10px] font-mono"
        >
          {{ currentWorkflowBlocksCount }} blocks
        </Badge>

        <ChevronDown
          class="size-3.5 text-muted-foreground shrink-0 transition-transform duration-150"
          :class="{ 'rotate-180': isDropdownOpen }"
        />
      </button>

      <!-- Dropdown Quick Switcher Menu -->
      <div
        v-if="isDropdownOpen"
        data-testid="dropdown-workflows-menu"
        class="absolute top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-border bg-card shadow-xl py-2 z-50 text-xs text-foreground animate-in fade-in slide-in-from-top-2 duration-150"
      >
        <!-- Search Filter -->
        <div class="px-2.5 pb-2 border-b border-border">
          <div class="relative flex items-center">
            <Search class="size-3.5 absolute left-2.5 text-muted-foreground" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              data-testid="input-workflow-search"
              type="text"
              placeholder="Filter workflows..."
              class="w-full pl-7 pr-2.5 py-1 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              @click.stop
            />
          </div>
        </div>

        <!-- Workflows List -->
        <div class="max-h-60 overflow-y-auto py-1 px-1 space-y-0.5">
          <div
            v-if="filteredWorkflows.length === 0"
            class="py-6 text-center text-muted-foreground text-[11px]"
          >
            No matching workflows found
          </div>

          <button
            v-for="wf in filteredWorkflows"
            :key="wf.path || wf.id || wf.name"
            type="button"
            class="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition hover:bg-muted cursor-pointer"
            :class="{
              'bg-primary/10 text-primary font-semibold':
                wf.name === currentWorkflowName || wf.path === currentFilePath,
            }"
            @click="onSelectWorkflow(wf)"
          >
            <div class="flex items-center gap-2 min-w-0 pr-2">
              <GitBranch
                class="size-3.5 shrink-0"
                :class="
                  wf.name === currentWorkflowName || wf.path === currentFilePath
                    ? 'text-primary'
                    : 'text-muted-foreground'
                "
              />
              <div class="flex flex-col min-w-0">
                <span class="truncate font-medium text-xs">{{ wf.name }}</span>
                <span
                  v-if="wf.path"
                  class="text-[10px] text-muted-foreground font-mono truncate"
                >
                  {{ wf.path }}
                </span>
              </div>
            </div>

            <Check
              v-if="
                wf.name === currentWorkflowName || wf.path === currentFilePath
              "
              class="size-3.5 text-primary shrink-0"
            />
          </button>
        </div>

        <!-- Bottom Actions -->
        <div
          class="pt-1.5 border-t border-border px-2 flex items-center justify-between text-[11px]"
        >
          <button
            type="button"
            class="text-primary hover:underline flex items-center gap-1 py-1 px-1.5 rounded hover:bg-primary/10 cursor-pointer"
            @click="
              $emit('newWorkflow');
              isDropdownOpen = false;
            "
          >
            <Plus class="size-3" />
            <span>New Blank</span>
          </button>

          <button
            type="button"
            class="text-muted-foreground hover:underline flex items-center gap-1 py-1 px-1.5 rounded hover:bg-muted cursor-pointer"
            @click="
              $emit('importWorkflow');
              isDropdownOpen = false;
            "
          >
            <Upload class="size-3" />
            <span>Import File</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Right Section: Data, Secrets, Linter, Status & Live Debug Controls -->
    <div class="flex items-center gap-1 shrink-0">
      <!-- Live Lint Button -->
      <Button
        v-if="automaCoreStatus === 'online'"
        variant="ghost"
        size="sm"
        data-testid="btn-lint-workflow"
        :class="
          lintIssuesCount > 0
            ? 'text-amber-500 hover:bg-amber-500/10'
            : 'text-emerald-500 hover:bg-emerald-500/10'
        "
        :title="
          lintIssuesCount > 0
            ? `Lint: ${lintIssuesCount} issue(s) detected`
            : 'Lint: All schema checks passed'
        "
        @click="$emit('triggerLint')"
      >
        <AlertCircle v-if="lintIssuesCount > 0" class="size-3.5 mr-1" />
        <Check v-else class="size-3.5 mr-1" />
        <span class="hidden 2xl:inline">{{
          lintIssuesCount > 0 ? `${lintIssuesCount} Issues` : 'Valid'
        }}</span>
      </Button>

      <!-- Tables Modal -->
      <Button
        variant="outline"
        size="sm"
        data-testid="btn-table-data"
        title="SQLite Storage Tables"
        @click="$emit('openModal', 'tables')"
      >
        <Table class="size-3.5 mr-1" />
        <span class="hidden xl:inline">Tables</span>
      </Button>

      <!-- Variables Modal -->
      <Button
        variant="outline"
        size="sm"
        data-testid="btn-global-data"
        title="Global Variables"
        @click="$emit('openModal', 'global-data')"
      >
        <Database class="size-3.5 mr-1" />
        <span class="hidden xl:inline">Variables</span>
      </Button>

      <!-- Secrets Modal -->
      <Button
        v-if="automaCoreStatus === 'online'"
        variant="outline"
        size="sm"
        data-testid="btn-secrets"
        title="Vault Secrets & AES Encryption"
        @click="$emit('openModal', 'secrets')"
      >
        <KeyRound class="size-3.5 mr-1" />
        <span class="hidden xl:inline">Secrets</span>
      </Button>

      <!-- Settings Modal -->
      <Button
        variant="outline"
        size="sm"
        data-testid="btn-settings"
        title="Workflow Settings"
        @click="$emit('openModal', 'settings')"
      >
        <Settings class="size-3.5 mr-1" />
        <span class="hidden xl:inline">Settings</span>
      </Button>

      <!-- Logs Modal -->
      <Button
        v-if="automaCoreStatus === 'online'"
        variant="outline"
        size="sm"
        data-testid="btn-view-job-logs"
        title="Execution Logs & History"
        @click="$emit('openModal', 'logs')"
      >
        <History class="size-3.5 mr-1" />
        <span class="hidden xl:inline">Logs</span>
        <Badge
          v-if="logsCount > 0"
          variant="secondary"
          data-testid="logs-count-badge"
          class="ml-1 px-1 py-0 text-[10px]"
        >
          {{ logsCount }}
        </Badge>
      </Button>

      <!-- Slot for Studio Core Status Indicator -->
      <slot name="status" />

      <!-- Save Button -->
      <AutomaButton
        v-if="automaCoreStatus === 'online'"
        id="btn.workflow.save"
        size="sm"
        variant="outline"
        :title="
          currentFilePath
            ? `Save to Storage (${currentFilePath}) [Ctrl+S]`
            : 'Save to Storage / Export [Ctrl+S]'
        "
        @click="$emit('saveWorkflow')"
      />

      <!-- Export Button -->
      <Button
        v-if="automaCoreStatus === 'online'"
        variant="outline"
        size="sm"
        data-testid="btn-export-json"
        title="Export Workflow JSON"
        @click="$emit('exportJson')"
      >
        <Download class="size-3.5 mr-1" />
        <span class="hidden sm:inline">Export</span>
      </Button>

      <!-- Live Execution Controls / Run Button -->
      <div v-if="automaCoreStatus === 'online'" class="flex items-center gap-1">
        <!-- If Job is currently running, show Pause/Resume and Stop buttons -->
        <template v-if="isJobRunning">
          <Button
            variant="outline"
            size="sm"
            class="border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
            :title="
              isJobPaused ? 'Resume Job (WebSocket)' : 'Pause Job (WebSocket)'
            "
            @click="isJobPaused ? $emit('resumeJob') : $emit('pauseJob')"
          >
            <Play v-if="isJobPaused" class="size-3.5 mr-1" />
            <Pause v-else class="size-3.5 mr-1" />
            <span>{{ isJobPaused ? 'Resume' : 'Pause' }}</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            title="Stop Job Immediately (WebSocket /api/v1/ws)"
            @click="$emit('stopJob')"
          >
            <Square class="size-3.5 mr-1" />
            <span>Stop</span>
          </Button>
        </template>

        <!-- Standard Run Button -->
        <AutomaButton
          v-else
          id="btn.workflow.run"
          size="sm"
          variant="primary"
          title="Execute Workflow via automa-core"
          @click="$emit('runWorkflow')"
        />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { AutomaButton, Button, Badge } from '@automa/ui';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Database,
  Download,
  FolderOpen,
  FolderTree,
  GitBranch,
  Globe,
  History,
  KeyRound,
  PanelLeft,
  PanelLeftClose,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  Table,
  Upload,
} from 'lucide-vue-next';

const props = defineProps({
  showSidebar: {
    type: Boolean,
    default: true,
  },
  automaCoreStatus: {
    type: String,
    default: 'offline',
  },
  currentWorkflowName: {
    type: String,
    default: 'Untitled Workflow',
  },
  currentWorkflowBlocksCount: {
    type: Number,
    default: 0,
  },
  currentFilePath: {
    type: String,
    default: '',
  },
  availableWorkflows: {
    type: Array,
    default: () => [],
  },
  lintIssuesCount: {
    type: Number,
    default: 0,
  },
  logsCount: {
    type: Number,
    default: 0,
  },
  isDirty: {
    type: Boolean,
    default: false,
  },
  isJobRunning: {
    type: Boolean,
    default: false,
  },
  isJobPaused: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'toggleSidebar',
  'openStorageExplorer',
  'openFilePicker',
  'importWorkflow',
  'newWorkflow',
  'selectWorkflow',
  'triggerLint',
  'openModal',
  'saveWorkflow',
  'exportJson',
  'runWorkflow',
  'killAllBrowsers',
  'pauseJob',
  'resumeJob',
  'stopJob',
]);

const isDropdownOpen = ref(false);
const searchQuery = ref('');
const workflowDropdownRef = ref(null);
const searchInputRef = ref(null);

const filteredWorkflows = computed(() => {
  const list = props.availableWorkflows || [];
  if (!searchQuery.value) return list;
  const q = searchQuery.value.toLowerCase();
  return list.filter(
    (wf) =>
      wf.name?.toLowerCase().includes(q) || wf.path?.toLowerCase().includes(q)
  );
});

function toggleWorkflowDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    searchQuery.value = '';
    setTimeout(() => {
      if (searchInputRef.value) searchInputRef.value.focus();
    }, 50);
  }
}

function onSelectWorkflow(wf) {
  isDropdownOpen.value = false;
  emit('selectWorkflow', wf.path || wf);
}

function handleClickOutside(e) {
  if (
    workflowDropdownRef.value &&
    !workflowDropdownRef.value.contains(e.target)
  ) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>
