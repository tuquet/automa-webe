<template>
  <div
    class="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans select-none"
  >
    <!-- Top Header Bar Component (Hidden in Headless Mode) -->
    <studio-header
      v-if="!isHeadless"
      :show-sidebar="state.showSidebar"
      :automa-core-status="automaCoreState.status"
      :current-workflow-name="workflow?.name || 'Untitled Workflow'"
      :current-workflow-blocks-count="(workflow?.drawflow?.nodes || []).length"
      :current-file-path="currentFilePath"
      :available-workflows="availableWorkflows"
      :lint-issues-count="lintIssues.length"
      :logs-count="logsCount"
      :is-dirty="isDirty"
      :is-job-running="isJobRunning"
      :is-job-paused="isJobPaused"
      @toggle-sidebar="state.showSidebar = !state.showSidebar"
      @open-storage-explorer="modals.storage = true"
      @open-file-picker="openFilePicker"
      @import-workflow="triggerImportWorkflow"
      @new-workflow="createNewWorkflow"
      @select-workflow="loadWorkflowFromVault"
      @trigger-lint="triggerManualLint(workflow)"
      @open-modal="openModal($event)"
      @save-workflow="saveWorkflowToStorage"
      @export-json="exportJson"
      @run-workflow="onRunWorkflow"
      @kill-all-browsers="onKillAllBrowsers"
      @pause-job="onPauseJob"
      @resume-job="onResumeJob"
      @stop-job="onStopJob"
    >
      <template #status>
        <studio-core-status />
      </template>
    </studio-header>

    <input
      ref="fileInputRef"
      data-testid="file-picker-input"
      type="file"
      accept=".json,.automa.json"
      class="hidden"
      @change="onFileSelected"
    />

    <input
      ref="importFileInputRef"
      data-testid="file-import-input"
      type="file"
      accept=".json,.automa.json"
      class="hidden"
      @change="onImportFileSelected"
    />

    <!-- Main Studio Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Left Resizable Sidebar (Palette or Edit Block) -->
      <aside
        v-if="state.showSidebar"
        data-testid="studio-sidebar"
        :style="{ width: `${sidebarCss.width}px` }"
        class="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20 flex flex-col shrink-0 overflow-hidden shadow-sm relative text-xs"
      >
        <!-- Block Form Editor -->
        <workflow-edit-block
          v-if="editState.editing"
          data-testid="sidebar-edit-block"
          :data="editState.blockData"
          :workflow="workflow"
          :editor="editorInstance"
          @update="updateBlockData"
          @close="closeEditingSidebar"
        />

        <!-- Workflow Details & Block Palette -->
        <workflow-details-card
          v-else
          data-testid="sidebar-details-card"
          :workflow="workflow"
          @update="updateWorkflowDetails"
        />

        <!-- Resizable Drag Handle -->
        <div
          data-testid="sidebar-resize-handle"
          class="custom-drag"
          title="Drag to resize sidebar"
          @mousedown="startDrag"
        ></div>
      </aside>

      <!-- VueFlow Canvas Area -->
      <main
        data-testid="studio-canvas-main"
        class="flex-1 h-full relative overflow-hidden bg-gray-100 dark:bg-gray-950"
        @dragover.prevent="onDragoverEditor"
        @drop="onDropInEditor"
      >
        <workflow-editor
          v-if="workflow.drawflow"
          ref="editorRef"
          data-testid="workflow-editor-canvas"
          :data="workflow.drawflow"
          :class="{ 'animate-blocks': state.animateBlocks }"
          @init="onEditorInit"
          @edit="onEditBlock"
          @update:node="onUpdateNode"
          @delete:node="onDeleteNode"
        >
          <template #controls-prepend>
            <div
              class="inline-flex items-center rounded-lg bg-card shadow-xs border border-border mr-2 p-0.5 gap-0.5"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                data-testid="btn-canvas-undo"
                :disabled="!commandManager.state.value.canUndo"
                title="Undo (Ctrl+Z)"
                @click="commandManager.undo"
              >
                <Undo2 class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                data-testid="btn-canvas-redo"
                :disabled="!commandManager.state.value.canRedo"
                title="Redo (Ctrl+Y)"
                @click="commandManager.redo"
              >
                <Redo2 class="size-3.5" />
              </Button>
              <div class="inline-block h-3.5 w-px bg-border my-auto mx-0.5" />
              <Button
                variant="ghost"
                size="icon-sm"
                data-testid="btn-canvas-auto-align"
                class="hover:bg-accent text-foreground"
                title="Auto Align Layout"
                @click="autoAlign"
              >
                <Wand2 class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                data-testid="btn-canvas-auto-focus"
                class="hover:bg-accent"
                :title="
                  autoFocusEnabled
                    ? 'Auto-focus Node (On)'
                    : 'Auto-focus Node (Off)'
                "
                @click="autoFocusEnabled = !autoFocusEnabled"
              >
                <Crosshair
                  class="size-3.5"
                  :class="
                    autoFocusEnabled ? 'text-primary' : 'text-muted-foreground'
                  "
                />
              </Button>
            </div>
          </template>
        </workflow-editor>

        <!-- In-canvas Debugging Dock -->
        <editor-debugging
          v-if="workflowStates && workflowStates.length > 0"
          :states="workflowStates"
          @goToBlock="goToBlock"
        />

        <!-- Canvas Context Menu -->
        <editor-local-ctx-menu
          v-if="editorInstance"
          :editor="editorInstance"
          @copy="copySelectedElements"
          @duplicate="duplicateElements"
          @paste="pasteCopiedElements"
          @group="groupBlocks"
          @ungroup="ungroupBlocks"
        />
      </main>
    </div>

    <!-- Modals -->
    <!-- Unified Storage & Vault Hub (Tables / Variables / Secrets) -->
    <unified-storage-modal
      v-model="modals.storage"
      :workflow="workflow"
      :initial-tab="storageInitialTab"
      @update:workflow="updateWorkflowDetails"
    />

    <!-- Settings Modal -->
    <ui-modal
      v-model="modals.settings"
      custom-content
      content-class="max-w-2xl"
    >
      <workflow-settings
        :workflow="workflow"
        @update="updateWorkflowSettings"
        @close="modals.settings = false"
      />
    </ui-modal>

    <!-- Full-featured Native Automa Logs Dialog -->
    <app-logs />

    <!-- Run Workflow Modal Component -->
    <run-workflow-modal
      v-model="runModalState.show"
      :automa-core-state="automaCoreState"
      :run-modal-state="runModalState"
      :is-params-valid="isParamsValid"
      @update:browser-id="runModalState.browserId = $event"
      @update:headless="runModalState.headless = $event"
      @update:close-browser-on-finish="
        runModalState.closeBrowserOnFinish = $event
      "
      @update:param="onUpdateParam"
      @execute="executeWorkflowFromModal"
    />

    <!-- Browsers Quick Management Modal -->
    <browsers-quick-modal v-model="modals.browsers" />

    <!-- Workflows Vault Library Modal -->
    <workflow-library-modal
      v-model="modals.library"
      :workflows="availableWorkflows"
      @select="loadWorkflowFromVault"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { Button } from '@automa/ui';
import { Crosshair, Redo2, Undo2, Wand2 } from 'lucide-vue-next';
import defu from 'defu';

import WorkflowEditor from '@/components/newtab/workflow/WorkflowEditor.vue';
import WorkflowEditBlock from '@/components/newtab/workflow/WorkflowEditBlock.vue';
import WorkflowDetailsCard from '@/components/newtab/workflow/WorkflowDetailsCard.vue';
import WorkflowSettings from '@/components/newtab/workflow/WorkflowSettings.vue';
import EditorLocalCtxMenu from '@/components/newtab/workflow/editor/EditorLocalCtxMenu.vue';
import EditorDebugging from '@/components/newtab/workflow/editor/EditorDebugging.vue';
import StudioCoreStatus from '@/components/newtab/workflow/StudioCoreStatus.vue';
import AppLogs from '@/components/newtab/app/AppLogs.vue';

import { useCommandManager } from '@/composable/commandManager';
import { useSidebarResize } from '@/composable/useSidebarResize';
import { useAutomaCoreHealth } from '@/composable/useAutomaCoreHealth';
import { useLiveQuery } from '@/composable/liveQuery';
import emitter from '@/lib/mitt';
import dbLogs from '@/db/logs';

import WorkflowLibraryModal from './components/WorkflowLibraryModal.vue';
import StudioHeader from './components/StudioHeader.vue';
import RunWorkflowModal from './components/RunWorkflowModal.vue';
import BrowsersQuickModal from './components/BrowsersQuickModal.vue';
import UnifiedStorageModal from './components/UnifiedStorageModal.vue';

import { wsService } from './services/ws.service';
import {
  killAllBrowserProcesses,
  cancelJob,
  fetchStorageFiles,
  getDefaultBrowserProfile,
} from './services/storage.service';
import { studioState, notifyWorkflowChange } from './adapters/host-bridge';

// Modular Studio Composables
import { useStudioWorkflow } from './composables/useStudioWorkflow';
import { useStudioRunner } from './composables/useStudioRunner';
import { useStudioCanvas } from './composables/useStudioCanvas';
import { useStudioClipboard } from './composables/useStudioClipboard';
import { useStudioKeyboardShortcuts } from './composables/useStudioKeyboardShortcuts';
import { useStudioHostIpc } from './composables/useStudioHostIpc';

const toast = useToast();
const { state: automaCoreState } = useAutomaCoreHealth();
const commandManager = useCommandManager();
const { sidebar: sidebarCss, startDrag } = useSidebarResize();

// Core Workflow State
const workflow = computed(() => studioState.currentWorkflow);
const fileInputRef = ref(null);
const importFileInputRef = ref(null);
const availableWorkflows = ref([]);
const workflowStates = ref([]);

// Modals State Hub
const modals = reactive({
  settings: false,
  storage: false,
  browsers: false,
  library: false,
});
const storageInitialTab = ref('tables');

// UI State
const state = reactive({
  showSidebar: true,
  animateBlocks: true,
});

const editState = reactive({
  editing: false,
  blockData: null,
});

// Logs Count Query via Dexie
const logsList = useLiveQuery(() => dbLogs.logs.toArray(), []);
const logsCount = computed(() => logsList.value?.length || 0);

// Job Status States
const activeJobId = ref(null);
const isJobRunning = ref(false);
const isJobPaused = ref(false);

// 1. Workflow Lifecycle Composable
const {
  currentFilePath,
  isDirty,
  loadWorkflowData,
  loadWorkflowFromStorage,
  saveWorkflowToStorage,
  exportJson,
  createNewWorkflow,
} = useStudioWorkflow(automaCoreState);

// 2. Runner & Execution Composable
const {
  lintIssues,
  runModalState,
  runLiveLint,
  triggerManualLint,
  openRunModal,
  submitWorkflowExecution,
} = useStudioRunner(automaCoreState);

const isParamsValid = computed(() => {
  if (!runModalState.parameters || !runModalState.parameters.length) {
    return true;
  }
  for (const param of runModalState.parameters) {
    const isMissing =
      param.value === undefined || param.value === '' || param.value === null;
    if (param.data?.required && isMissing) {
      return false;
    }
  }
  return true;
});

// 3. Canvas Composable
const {
  editorRef,
  editorInstance,
  autoFocusEnabled,
  onEditorInit,
  autoAlign,
  onUpdateNode,
  onDeleteNode,
  onDragoverEditor,
  onDropInEditor,
  goToBlock,
} = useStudioCanvas({ commandManager, isDirty });

// 4. Clipboard Composable
const {
  copySelectedElements,
  pasteCopiedElements,
  duplicateElements,
  groupBlocks,
  ungroupBlocks,
} = useStudioClipboard({ editorInstance, isDirty });

// 5. Host IPC Composable
const { isHeadless, resetNodeHighlights } = useStudioHostIpc({
  onLoadWorkflow: (data) => loadWorkflowData(data),
  onToggleSidebar: (show) => {
    state.showSidebar = show;
  },
  goToBlock,
});

// 6. Global Keyboard Shortcuts Composable
useStudioKeyboardShortcuts({
  onSave: saveWorkflowToStorage,
  onCopy: copySelectedElements,
  onPaste: pasteCopiedElements,
  onDuplicate: duplicateElements,
  onUndo: () => commandManager.undo(),
  onRedo: () => commandManager.redo(),
  onToggleSidebar: () => {
    state.showSidebar = !state.showSidebar;
  },
});

// Sidebar & Block Editing Handlers
function onEditBlock(data) {
  editState.blockData = data;
  editState.editing = true;
  state.showSidebar = true;
}

function closeEditingSidebar() {
  editState.editing = false;
  editState.blockData = null;
}

function updateBlockData({ id, data }) {
  onUpdateNode({ id, data });
  if (editState.blockData && editState.blockData.id === id) {
    editState.blockData.data = { ...editState.blockData.data, ...data };
  }
}

function updateWorkflowDetails(updated) {
  Object.assign(studioState.currentWorkflow, updated);
  isDirty.value = true;
  notifyWorkflowChange(studioState.currentWorkflow);
}

function updateWorkflowSettings(newSettings) {
  studioState.currentWorkflow.settings = defu(
    newSettings,
    studioState.currentWorkflow.settings || {}
  );
  isDirty.value = true;
  notifyWorkflowChange(studioState.currentWorkflow);
}

function onUpdateParam({ index, value }) {
  if (runModalState.parameters && runModalState.parameters[index]) {
    runModalState.parameters[index].value = value;
  }
}

// Vault / Library Handlers
async function loadAvailableWorkflows() {
  try {
    const files = await fetchStorageFiles();
    availableWorkflows.value = files.filter(
      (f) => f.name?.endsWith('.json') || f.path?.endsWith('.json')
    );
  } catch (_) {
    availableWorkflows.value = [];
  }
}

function loadWorkflowFromVault(file) {
  const filePath = typeof file === 'string' ? file : file?.path || file?.name;
  if (filePath) {
    loadWorkflowFromStorage(filePath);
    modals.library = false;
  }
}

// File Picker & Import Handlers
function openFilePicker() {
  fileInputRef.value?.click();
}

function triggerImportWorkflow() {
  importFileInputRef.value?.click();
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      loadWorkflowData(parsed, file.name);
      toast.success(`Opened workflow file: ${file.name}`);
    } catch (err) {
      toast.error(`Invalid workflow JSON: ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function onImportFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      loadWorkflowData(parsed);
      toast.success(`Imported workflow: ${file.name}`);
    } catch (err) {
      toast.error(`Invalid workflow JSON: ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function openModal(modalName) {
  if (modalName === 'storage') {
    modals.storage = true;
  } else if (
    modalName === 'tables' ||
    modalName === 'variables' ||
    modalName === 'secrets'
  ) {
    storageInitialTab.value = modalName;
    modals.storage = true;
  } else if (modalName === 'settings') {
    modals.settings = true;
  } else if (modalName === 'logs') {
    emitter.emit('open:logs-modal');
  } else if (modalName === 'browsers') {
    modals.browsers = true;
  } else if (modalName === 'library') {
    modals.library = true;
  }
}

// Execution & Job Control Handlers
async function onRunWorkflow() {
  const triggerNode = workflow.value?.drawflow?.nodes?.find(
    (n) => n.label === 'trigger' || n.type === 'trigger'
  );
  const triggerParams = triggerNode?.data?.parameters || [];
  runModalState.parameters = triggerParams.map((p) => ({
    name: p.name,
    value: p.defaultValue || '',
    type: p.type || 'string',
    description: p.description || '',
    data: { required: p.required || false },
  }));

  const defaultBrowser = await getDefaultBrowserProfile();
  runModalState.browserId = defaultBrowser || 'daemon_worker';
  openRunModal();
}

function executeWorkflowFromModal() {
  submitWorkflowExecution(workflow.value, currentFilePath.value, (jobId) => {
    activeJobId.value = jobId;
    isJobRunning.value = true;
    isJobPaused.value = false;
  });
}

async function onKillAllBrowsers() {
  try {
    await killAllBrowserProcesses();
    toast.success('Terminated all browser processes');
  } catch (err) {
    toast.error(`Kill browsers failed: ${err.message}`);
  }
}

async function onPauseJob() {
  if (!activeJobId.value) return;
  try {
    await wsService.send('PAUSE_JOB', { jobId: activeJobId.value });
    isJobPaused.value = true;
    toast.info(`Paused job ${activeJobId.value.slice(0, 8)}`);
  } catch (err) {
    toast.error(`Pause failed: ${err.message}`);
  }
}

async function onResumeJob() {
  if (!activeJobId.value) return;
  try {
    await wsService.send('RESUME_JOB', { jobId: activeJobId.value });
    isJobPaused.value = false;
    toast.info(`Resumed job ${activeJobId.value.slice(0, 8)}`);
  } catch (err) {
    toast.error(`Resume failed: ${err.message}`);
  }
}

async function onStopJob() {
  if (!activeJobId.value) return;
  try {
    await cancelJob(activeJobId.value);
    isJobRunning.value = false;
    isJobPaused.value = false;
    activeJobId.value = null;
    resetNodeHighlights();
    toast.info('Job cancelled');
  } catch (err) {
    toast.error(`Stop failed: ${err.message}`);
  }
}

// Watchers
watch(
  () => workflow.value?.drawflow?.nodes,
  () => {
    runLiveLint(workflow.value);
  },
  { deep: true }
);

onMounted(() => {
  loadAvailableWorkflows();
  runLiveLint(workflow.value);
});
</script>

<style scoped>
.custom-drag {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 30;
  transition: background-color 0.15s;
}
.custom-drag:hover {
  background-color: var(--primary, #3b82f6);
}
</style>
