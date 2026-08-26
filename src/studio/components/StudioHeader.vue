<template>
  <header
    data-testid="studio-header"
    class="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none relative"
  >
    <!-- Left Section: Sidebar Toggle, New/Import/Open File, Storage Explorer & Browsers -->
    <div class="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
      <button
        id="btn.canvas.toggle_sidebar"
        data-testid="btn-toggle-sidebar"
        class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        :title="showSidebar ? 'Hide Sidebar' : 'Show Sidebar'"
        @click="$emit('toggleSidebar')"
      >
        <v-remixicon
          :name="showSidebar ? 'riSideBarFill' : 'riSideBarLine'"
          size="18"
        />
      </button>

      <!-- Storage Explorer & Workspace Actions -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.storage.explorer"
        data-testid="btn-storage-explorer"
        class="px-2 py-1 text-xs font-medium rounded-md border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent flex items-center space-x-1 transition"
        title="Browse and Open Workflows from Storage workspace"
        @click="$emit('openStorageExplorer')"
      >
        <v-remixicon name="riFolderZipLine" size="14" />
        <span class="hidden lg:inline">Storage</span>
      </button>

      <!-- New, Import & Open Workflow Group -->
      <div class="flex items-center space-x-0.5 sm:space-x-1">
        <button
          id="btn.workflow.create"
          data-testid="btn-create-workflow"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
          title="Create New Blank Workflow"
          @click="$emit('newWorkflow')"
        >
          <v-remixicon name="riAddLine" size="14" />
          <span class="hidden md:inline">New</span>
        </button>

        <button
          id="btn.workflow.import"
          data-testid="btn-import-workflow"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
          title="Import Workflow JSON file from computer"
          @click="$emit('importWorkflow')"
        >
          <v-remixicon name="riUploadLine" size="14" />
          <span class="hidden md:inline">Import</span>
        </button>

        <button
          id="btn.workflow.open"
          data-testid="btn-open-file"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
          title="Open Workflow JSON File from Computer"
          @click="$emit('openFilePicker')"
        >
          <v-remixicon name="riFolderOpenLine" size="14" />
          <span class="hidden md:inline">Open</span>
        </button>
      </div>

      <div
        v-if="automaCoreStatus === 'online'"
        class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5 hidden sm:block"
      ></div>

      <!-- Browsers Fleet & Kill All Quick Actions -->
      <div
        v-if="automaCoreStatus === 'online'"
        class="flex items-center space-x-0.5"
      >
        <button
          id="btn.browser.menu"
          data-testid="btn-browsers-menu"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition text-gray-700 dark:text-gray-300"
          title="Browser Fleet Manager"
          @click="$emit('openModal', 'browsers')"
        >
          <v-remixicon name="riGlobalLine" size="14" />
          <span class="hidden xl:inline">Browsers</span>
        </button>

        <button
          id="btn.browser.kill_all"
          data-testid="btn-kill-all-browsers"
          class="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition"
          title="Kill All Chrome / Worker Processes (DELETE /api/v1/browsers/sessions)"
          @click="$emit('killAllBrowsers')"
        >
          <v-remixicon name="riStopCircleLine" size="14" />
        </button>
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
        data-testid="btn-selected-workflow"
        class="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center space-x-1.5 truncate max-w-full text-gray-800 dark:text-gray-200 shadow-2xs"
        :title="`Current Workflow: ${currentWorkflowName} ${
          currentFilePath ? `(${currentFilePath})` : ''
        } - Click to switch`"
        @click="toggleWorkflowDropdown"
      >
        <v-remixicon
          name="riFlowChartLine"
          size="14"
          class="text-accent shrink-0"
        />
        <span class="truncate font-semibold">{{ currentWorkflowName }}</span>

        <!-- Unsaved changes dirty dot -->
        <span
          v-if="isDirty"
          class="w-2 h-2 rounded-full bg-amber-500 shrink-0"
          title="Unsaved changes"
        ></span>

        <span
          v-if="currentWorkflowBlocksCount !== undefined"
          class="hidden md:inline px-1 py-0.2 rounded text-[10px] bg-gray-200/80 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 shrink-0 font-mono"
        >
          {{ currentWorkflowBlocksCount }} blocks
        </span>

        <v-remixicon
          name="riArrowDownSLine"
          size="14"
          class="text-gray-400 shrink-0 transition-transform duration-150"
          :class="{ 'rotate-180': isDropdownOpen }"
        />
      </button>

      <!-- Dropdown Quick Switcher Menu -->
      <div
        v-if="isDropdownOpen"
        data-testid="dropdown-workflows-menu"
        class="absolute top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-2 z-50 text-xs text-gray-800 dark:text-gray-200 animate-in fade-in slide-in-from-top-2 duration-150"
      >
        <!-- Search Filter -->
        <div class="px-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div class="relative">
            <v-remixicon
              name="riSearch2Line"
              size="13"
              class="absolute left-2.5 top-2 text-gray-400"
            />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              data-testid="input-workflow-search"
              type="text"
              placeholder="Filter workflows..."
              class="w-full pl-7 pr-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
              @click.stop
            />
          </div>
        </div>

        <!-- Workflows List -->
        <div class="max-h-60 overflow-y-auto py-1 px-1 space-y-0.5">
          <div
            v-if="filteredWorkflows.length === 0"
            class="py-6 text-center text-gray-400 text-[11px]"
          >
            No matching workflows found
          </div>

          <button
            v-for="wf in filteredWorkflows"
            :key="wf.path || wf.id || wf.name"
            class="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition hover:bg-gray-100 dark:hover:bg-gray-700/70"
            :class="{
              'bg-accent/10 text-accent font-semibold':
                wf.name === currentWorkflowName || wf.path === currentFilePath,
            }"
            @click="onSelectWorkflow(wf)"
          >
            <div class="flex items-center space-x-2 min-w-0 pr-2">
              <v-remixicon
                name="riFlowChartLine"
                size="14"
                :class="
                  wf.name === currentWorkflowName || wf.path === currentFilePath
                    ? 'text-accent'
                    : 'text-gray-400'
                "
              />
              <div class="flex flex-col min-w-0">
                <span class="truncate font-medium text-xs">{{ wf.name }}</span>
                <span
                  v-if="wf.path"
                  class="text-[10px] text-gray-400 font-mono truncate"
                >
                  {{ wf.path }}
                </span>
              </div>
            </div>

            <v-remixicon
              v-if="
                wf.name === currentWorkflowName || wf.path === currentFilePath
              "
              name="riCheckLine"
              size="14"
              class="text-accent shrink-0"
            />
          </button>
        </div>

        <!-- Bottom Actions -->
        <div
          class="pt-1.5 border-t border-gray-100 dark:border-gray-700 px-2 flex items-center justify-between text-[11px]"
        >
          <button
            class="text-accent hover:underline flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-accent/10"
            @click="
              $emit('newWorkflow');
              isDropdownOpen = false;
            "
          >
            <v-remixicon name="riAddLine" size="13" />
            <span>New Blank</span>
          </button>

          <button
            class="text-gray-600 dark:text-gray-400 hover:underline flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="
              $emit('importWorkflow');
              isDropdownOpen = false;
            "
          >
            <v-remixicon name="riUploadLine" size="13" />
            <span>Import File</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Right Section: Data, Secrets, Linter, Status & Live Debug Controls -->
    <div class="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
      <!-- Live Lint Button -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.workflow.lint"
        data-testid="btn-lint-workflow"
        class="px-2 py-1 text-xs font-medium rounded-md border flex items-center space-x-1 transition"
        :class="
          lintIssuesCount > 0
            ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
            : 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
        "
        :title="
          lintIssuesCount > 0
            ? `Lint: ${lintIssuesCount} issue(s) detected`
            : 'Lint: All schema checks passed'
        "
        @click="$emit('triggerLint')"
      >
        <v-remixicon
          :name="lintIssuesCount > 0 ? 'riAlertLine' : 'riCheckLine'"
          size="13"
        />
        <span class="hidden 2xl:inline">{{
          lintIssuesCount > 0 ? `${lintIssuesCount} Issues` : 'Valid'
        }}</span>
      </button>

      <!-- Tables Modal -->
      <button
        id="btn.storage.table"
        data-testid="btn-table-data"
        class="p-1.5 lg:px-2 lg:py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
        title="SQLite Storage Tables"
        @click="$emit('openModal', 'tables')"
      >
        <v-remixicon name="riTable2" size="14" />
        <span class="hidden xl:inline">Tables</span>
      </button>

      <!-- Variables Modal -->
      <button
        id="btn.storage.var"
        data-testid="btn-global-data"
        class="p-1.5 lg:px-2 lg:py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
        title="Global Variables"
        @click="$emit('openModal', 'global-data')"
      >
        <v-remixicon name="riDatabase2Line" size="14" />
        <span class="hidden xl:inline">Variables</span>
      </button>

      <!-- Secrets Modal -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.storage.cred"
        data-testid="btn-secrets"
        class="p-1.5 lg:px-2 lg:py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
        title="Vault Secrets & AES Encryption"
        @click="$emit('openModal', 'secrets')"
      >
        <v-remixicon name="riKey2Line" size="14" />
        <span class="hidden xl:inline">Secrets</span>
      </button>

      <!-- Settings Modal -->
      <button
        id="btn.workflow.settings"
        data-testid="btn-settings"
        class="p-1.5 lg:px-2 lg:py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
        title="Workflow Settings"
        @click="$emit('openModal', 'settings')"
      >
        <v-remixicon name="riSettings3Line" size="14" />
        <span class="hidden xl:inline">Settings</span>
      </button>

      <!-- Logs Modal -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.history.view_logs"
        data-testid="btn-view-job-logs"
        class="p-1.5 lg:px-2 lg:py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
        title="Execution Logs & History"
        @click="$emit('openModal', 'logs')"
      >
        <v-remixicon name="riHistoryLine" size="14" />
        <span class="hidden xl:inline">Logs</span>
        <span
          v-if="logsCount > 0"
          data-testid="logs-count-badge"
          class="px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold"
        >
          {{ logsCount }}
        </span>
      </button>

      <!-- Slot for Studio Core Status Indicator -->
      <slot name="status" />

      <!-- Save Button -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.workflow.save"
        data-testid="btn-save-workflow"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
        :title="
          currentFilePath
            ? `Save to Storage (${currentFilePath}) [Ctrl+S]`
            : 'Save to Storage / Export [Ctrl+S]'
        "
        @click="$emit('saveWorkflow')"
      >
        <v-remixicon name="riSaveLine" size="14" />
        <span class="hidden sm:inline">Save</span>
      </button>

      <!-- Export Button -->
      <button
        v-if="automaCoreStatus === 'online'"
        id="btn.workflow.export"
        data-testid="btn-export-json"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Export Workflow JSON"
        @click="$emit('exportJson')"
      >
        <v-remixicon name="riDownloadLine" size="14" />
        <span class="hidden sm:inline">Export</span>
      </button>

      <!-- Live Execution Controls / Run Button -->
      <div
        v-if="automaCoreStatus === 'online'"
        class="flex items-center space-x-1"
      >
        <!-- If Job is currently running, show Pause/Resume and Stop buttons -->
        <template v-if="isJobRunning">
          <button
            :id="isJobPaused ? 'btn.workflow.resume' : 'btn.workflow.pause'"
            :data-testid="
              isJobPaused ? 'btn-resume-workflow' : 'btn-pause-workflow'
            "
            class="px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1 transition border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
            :title="
              isJobPaused ? 'Resume Job (WebSocket)' : 'Pause Job (WebSocket)'
            "
            @click="isJobPaused ? $emit('resumeJob') : $emit('pauseJob')"
          >
            <v-remixicon
              :name="isJobPaused ? 'riPlayLine' : 'riPauseLine'"
              size="14"
            />
            <span>{{ isJobPaused ? 'Resume' : 'Pause' }}</span>
          </button>

          <button
            id="btn.workflow.stop"
            data-testid="btn-stop-workflow"
            class="px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1 transition border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
            title="Stop Job Immediately (WebSocket /api/v1/ws)"
            @click="$emit('stopJob')"
          >
            <v-remixicon name="riStopLine" size="14" />
            <span>Stop</span>
          </button>
        </template>

        <!-- Standard Run Button -->
        <button
          v-else
          id="btn.workflow.run"
          data-testid="btn-run-workflow"
          class="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 shadow-sm transition bg-accent hover:bg-accent/90 text-white"
          title="Execute Workflow via automa-core"
          @click="$emit('runWorkflow')"
        >
          <v-remixicon name="riPlayLine" size="14" />
          <span>Run</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

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
