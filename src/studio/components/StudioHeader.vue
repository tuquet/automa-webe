<template>
  <header
    data-testid="studio-header"
    class="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 flex items-center justify-between z-30 shrink-0 select-none"
  >
    <!-- Left Section: Sidebar Toggle, New/Open File, & Storage Explorer -->
    <div class="flex items-center space-x-3">
      <button
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

      <!-- File Open & New Buttons -->
      <div class="flex items-center space-x-1">
        <button
          v-if="automaCoreStatus === 'online'"
          data-testid="btn-storage-explorer"
          class="px-2 py-1 text-xs font-medium rounded-md border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent flex items-center space-x-1 transition"
          title="Browse and Open Workflows from Storage workspace"
          @click="$emit('openStorageExplorer')"
        >
          <v-remixicon name="riArchiveLine" size="14" />
          <span class="hidden md:inline">Storage Explorer</span>
        </button>

        <button
          data-testid="btn-open-file"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
          title="Open Workflow JSON File from Computer (or Drag & Drop file onto Canvas)"
          @click="$emit('openFilePicker')"
        >
          <v-remixicon name="riFolderOpenLine" size="14" />
          <span class="hidden md:inline">Open File</span>
        </button>

        <button
          data-testid="btn-new-workflow"
          class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
          title="Create New Blank Workflow"
          @click="$emit('newWorkflow')"
        >
          <v-remixicon name="riAddLine" size="14" />
          <span class="hidden md:inline">New</span>
        </button>
      </div>
    </div>

    <!-- Right Section: Data, Modals, Status & Execution -->
    <div class="flex items-center space-x-2">
      <button
        v-if="automaCoreStatus === 'online'"
        data-testid="btn-live-lint"
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
        <span class="hidden xl:inline">{{
          lintIssuesCount > 0 ? `${lintIssuesCount} Issues` : 'Valid'
        }}</span>
      </button>

      <button
        data-testid="btn-table-data"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Workflow Data Table"
        @click="$emit('openModal', 'table')"
      >
        <v-remixicon name="riFileListLine" size="14" />
        <span class="hidden lg:inline">Table Data</span>
      </button>

      <button
        data-testid="btn-global-data"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Global Data / Variables"
        @click="$emit('openModal', 'global-data')"
      >
        <v-remixicon name="riDatabase2Line" size="14" />
        <span class="hidden lg:inline">Global Data</span>
      </button>

      <button
        data-testid="btn-settings"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Workflow Settings"
        @click="$emit('openModal', 'settings')"
      >
        <v-remixicon name="riSettings3Line" size="14" />
        <span class="hidden lg:inline">Settings</span>
      </button>

      <div
        v-if="automaCoreStatus === 'online'"
        class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"
      ></div>

      <button
        v-if="automaCoreStatus === 'online'"
        data-testid="btn-logs"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Execution Logs & History"
        @click="$emit('openModal', 'logs')"
      >
        <v-remixicon name="riHistoryLine" size="14" />
        <span class="hidden lg:inline">Logs</span>
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

      <button
        v-if="automaCoreStatus === 'online'"
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

      <button
        v-if="automaCoreStatus === 'online'"
        data-testid="btn-export-json"
        class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
        title="Export Workflow JSON"
        @click="$emit('exportJson')"
      >
        <v-remixicon name="riDownloadLine" size="14" />
        <span class="hidden sm:inline">Export</span>
      </button>

      <button
        v-if="automaCoreStatus === 'online'"
        data-testid="btn-run-workflow"
        class="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 shadow-sm transition bg-accent hover:bg-accent/90 text-white"
        title="Execute Workflow via automa-core"
        @click="$emit('runWorkflow')"
      >
        <v-remixicon name="riPlayLine" size="14" />
        <span>Run</span>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  showSidebar: {
    type: Boolean,
    default: true,
  },
  automaCoreStatus: {
    type: String,
    default: 'offline',
  },
  currentFilePath: {
    type: String,
    default: '',
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
});

defineEmits([
  'toggleSidebar',
  'openStorageExplorer',
  'openFilePicker',
  'newWorkflow',
  'triggerLint',
  'openModal',
  'saveWorkflow',
  'exportJson',
  'runWorkflow',
]);
</script>
