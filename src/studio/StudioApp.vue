<template>
  <div
    class="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans select-none"
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
      @open-storage-explorer="modals.storageFiles = true"
      @open-file-picker="openFilePicker"
      @import-workflow="triggerImportWorkflow"
      @new-workflow="createNewWorkflow"
      @select-workflow="loadWorkflowFromVault"
      @trigger-lint="triggerManualLint"
      @open-modal="openModal($event)"
      @save-workflow="saveWorkflowToStorage"
      @export-json="exportJson"
      @run-workflow="runWorkflow"
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
        class="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 z-20 flex flex-col shrink-0 overflow-hidden shadow-sm relative text-xs"
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
        class="flex-1 h-full relative overflow-hidden bg-gray-100 dark:bg-gray-900"
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
              class="inline-flex items-center rounded-lg bg-card shadow-2xs border border-border mr-2 p-0.5 gap-0.5"
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
              <div class="inline-block h-4 w-px bg-border my-auto" />
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
            </div>

            <Button
              variant="outline"
              size="icon-sm"
              data-testid="btn-canvas-auto-align"
              class="mr-2"
              title="Auto Align Graph Layout"
              @click="autoAlign"
            >
              <Wand2 class="size-3.5" />
            </Button>

            <Button
              :variant="autoFocusEnabled ? 'secondary' : 'ghost'"
              size="icon-sm"
              data-testid="btn-canvas-auto-focus"
              class="mr-2"
              :title="
                autoFocusEnabled
                  ? 'Auto-focus Active Node (Enabled)'
                  : 'Auto-focus Active Node (Disabled)'
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
    <!-- Table Data Modal -->
    <ui-modal
      v-model="modals.table"
      title="Workflow Table"
      content-class="max-w-2xl"
    >
      <workflow-data-table
        :workflow="workflow"
        @update="updateWorkflowDetails"
        @close="modals.table = false"
      />
    </ui-modal>

    <!-- Global Data Modal -->
    <ui-modal
      v-model="modals.globalData"
      title="Global Data"
      content-class="max-w-2xl"
    >
      <workflow-global-data
        :workflow="workflow"
        @update="updateWorkflowDetails"
        @close="modals.globalData = false"
      />
    </ui-modal>

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
      @execute="submitWorkflowExecution"
    />

    <!-- Execution Logs Modal -->
    <ui-modal
      v-model="modals.logs"
      title="Execution Logs & History"
      custom-content
      content-class="max-w-4xl"
    >
      <div class="h-[600px] flex flex-col p-4 bg-white dark:bg-gray-800">
        <app-logs />
      </div>
    </ui-modal>

    <!-- Storage Workspace Explorer Modal -->
    <ui-modal
      v-model="modals.storageFiles"
      title="Storage Workspace Explorer"
      content-class="max-w-2xl"
    >
      <storage-file-explorer
        @select="onStorageFileSelected"
        @close="modals.storageFiles = false"
      />
    </ui-modal>

    <!-- SQLite Storage Tables Modal -->
    <storage-tables-modal v-model="modals.tables" />

    <!-- Vault Secrets & Encryption Modal -->
    <storage-secrets-modal v-model="modals.secrets" />

    <!-- Browser Fleet Manager Modal -->
    <browsers-quick-modal v-model="modals.browsers" />
  </div>
</template>

<script setup>
import {
  ref,
  watch,
  computed,
  reactive,
  provide,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { customAlphabet } from 'nanoid';
import defu from 'defu';
import {
  getWorkflow,
  saveWorkflow,
  lintWorkflow,
  submitJob,
} from '@automa/types/api';
import { Button } from '@automa/ui';
import { Crosshair, Redo2, Undo2, Wand2 } from 'lucide-vue-next';
import WorkflowEditor from '@/components/newtab/workflow/WorkflowEditor.vue';
import WorkflowEditBlock from '@/components/newtab/workflow/WorkflowEditBlock.vue';
import WorkflowDetailsCard from '@/components/newtab/workflow/WorkflowDetailsCard.vue';
import WorkflowDataTable from '@/components/newtab/workflow/WorkflowDataTable.vue';
import WorkflowGlobalData from '@/components/newtab/workflow/WorkflowGlobalData.vue';
import WorkflowSettings from '@/components/newtab/workflow/WorkflowSettings.vue';
import EditorLocalCtxMenu from '@/components/newtab/workflow/editor/EditorLocalCtxMenu.vue';
import EditorDebugging from '@/components/newtab/workflow/editor/EditorDebugging.vue';
import StudioCoreStatus from '@/components/newtab/workflow/StudioCoreStatus.vue';
import AppLogs from '@/components/newtab/app/AppLogs.vue';
import DroppedNode from '@/utils/editor/DroppedNode';
import EditorCommands from '@/utils/editor/EditorCommands';
import { useCommandManager } from '@/composable/commandManager';
import { useSidebarResize } from '@/composable/useSidebarResize';
import { useWorkflowAutocomplete } from '@/composable/useWorkflowAutocomplete';
import { useAutomaCoreHealth } from '@/composable/useAutomaCoreHealth';
import { useLiveQuery } from '@/composable/liveQuery';
import { useToast } from 'vue-toastification';
import emitter from '@/lib/mitt';
import dbLogs from '@/db/logs';
import { GraphLayoutService } from '@/services/graphLayout.service';
import { getBlocks } from '@/utils/getSharedData';
import { excludeGroupBlocks } from '@/utils/shared';
import { parseJSON } from '@/utils/helper';
import StorageFileExplorer from './components/StorageFileExplorer.vue';
import StudioHeader from './components/StudioHeader.vue';
import RunWorkflowModal from './components/RunWorkflowModal.vue';
import BrowsersQuickModal from './components/BrowsersQuickModal.vue';
import StorageTablesModal from './components/StorageTablesModal.vue';
import StorageSecretsModal from './components/StorageSecretsModal.vue';
import { wsService } from './services/ws.service';
import {
  killAllBrowserProcesses,
  cancelJob,
  fetchBrowsers,
  fetchStorageFiles,
  getDefaultBrowserProfile,
} from './services/storage.service';
import { sanitizeWorkflowAST } from './composables/useStudioWorkflow';
import {
  defaultWorkflow,
  studioState,
  setAutomaWorkflow,
  notifyWorkflowChange,
} from './standalone-bridge';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 7);

const workflow = computed(() => studioState.currentWorkflow);
const editorRef = ref(null);
const editorInstance = ref(null);
const fileInputRef = ref(null);
const importFileInputRef = ref(null);
const availableWorkflows = ref([]);
let editorCommands = null;
const commandManager = useCommandManager();
let internalClipboard = null;
const toast = useToast();
const { state: automaCoreState } = useAutomaCoreHealth();

// Execution & Run Modal State
const runModalState = reactive({
  show: false,
  browserId: 'daemon_worker',
  headless: false,
  closeBrowserOnFinish: false,
  isSubmitting: false,
  parameters: [],
});

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

const currentFilePath = ref('');
const isSaving = ref(false);
const isHeadless = ref(false);
const isDirty = ref(false);
const activeRunningBlockId = ref(null);
const autoFocusEnabled = ref(true);
const lintIssues = ref([]);
const isLinting = ref(false);

// Logs State via Native IndexedDB Dexie
const logsArr = useLiveQuery(() => dbLogs.items.toArray());
const logsCount = computed(() => (logsArr.value || []).length);
const workflowStates = ref([]);

// Dynamic Autocomplete Provider via Composable
const { autocompleteList } = useWorkflowAutocomplete(workflow);
provide('autocompleteData', autocompleteList);

// Sidebar Resize State via Composable
const { sidebarCss, startDrag, stopDrag } = useSidebarResize();

const state = reactive({
  showSidebar: true,
  animateBlocks: false,
});

const modals = reactive({
  table: false,
  tables: false,
  globalData: false,
  secrets: false,
  browsers: false,
  settings: false,
  logs: false,
  storageFiles: false,
});

const activeJobId = ref(null);
const isJobRunning = ref(false);
const isJobPaused = ref(false);

function onPauseJob() {
  if (activeJobId.value) {
    wsService.pauseJob(activeJobId.value);
    isJobPaused.value = true;
    toast.info('Job paused (WebSocket)');
  }
}

function onResumeJob() {
  if (activeJobId.value) {
    wsService.resumeJob(activeJobId.value);
    isJobPaused.value = false;
    toast.info('Job resumed (WebSocket)');
  }
}

async function onStopJob() {
  if (activeJobId.value) {
    wsService.killJob(activeJobId.value);
    try {
      await cancelJob(activeJobId.value);
    } catch (_) {
      // Ignored
    }
    isJobRunning.value = false;
    isJobPaused.value = false;
    activeJobId.value = null;
    activeRunningBlockId.value = null;
    toast.info('Job stopped');
  }
}

async function onKillAllBrowsers() {
  try {
    await killAllBrowserProcesses();
    toast.success('All browser processes terminated cleanly!');
  } catch (err) {
    toast.error(`Kill failed: ${err.message}`);
  }
}

const editState = reactive({
  editing: false,
  blockData: {},
});

watch(activeRunningBlockId, (newId, oldId) => {
  if (typeof document === 'undefined') return;
  if (oldId) {
    const prevEl = document.querySelector(`[data-id="${oldId}"]`);
    if (prevEl) prevEl.classList.remove('node-running');
  }
  if (newId) {
    const nextEl = document.querySelector(`[data-id="${newId}"]`);
    if (nextEl) nextEl.classList.add('node-running');
  }
});

function syncWorkflowFromCanvas() {
  if (!editorInstance.value) return;
  const nodes = editorInstance.value.getNodes?.value || [];
  const edges = editorInstance.value.getEdges?.value || [];
  workflow.value.drawflow = {
    ...(workflow.value.drawflow || {}),
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  };
  notifyWorkflowChange(workflow.value);
}

function openLogsModal() {
  emitter.emit('ui:logs', {
    show: true,
    workflowId: workflow.value?.id || '',
  });
}

function goToBlock(blockId) {
  if (!editorInstance.value) return;
  const allNodes = editorInstance.value.getNodes?.value || [];
  const node = allNodes.find((n) => n.id === blockId);
  if (node && node.position) {
    if (editorInstance.value.setCenter) {
      editorInstance.value.setCenter(node.position.x, node.position.y, {
        zoom: 1.2,
        duration: 800,
      });
    }
  }
}

function openModal(name) {
  if (name === 'table' || name === 'tables') modals.tables = true;
  else if (name === 'global-data') modals.globalData = true;
  else if (name === 'secrets') modals.secrets = true;
  else if (name === 'browsers') modals.browsers = true;
  else if (name === 'settings') modals.settings = true;
  else if (name === 'logs') openLogsModal();
}

function onEditorInit(editor) {
  editorInstance.value = editor;
  window.editorInstance = editor;

  let nodeToConnect = null;

  // 1. Double click edge to remove
  editor.onEdgeDoubleClick?.(({ edge }) => {
    editor.removeEdges([edge]);
    if (workflow.value.drawflow?.edges) {
      const idx = workflow.value.drawflow.edges.findIndex(
        (e) => e.id === edge.id
      );
      if (idx !== -1) workflow.value.drawflow.edges.splice(idx, 1);
    }
    notifyWorkflowChange(workflow.value);
  });

  // 2. Smart Connect (Drag from output handle and drop onto target node body)
  editor.onConnectStart?.(({ nodeId, handleId, handleType }) => {
    if (handleType !== 'source') return;
    nodeToConnect = { nodeId, handleId };
  });

  editor.onConnectEnd?.(({ target }) => {
    if (!nodeToConnect) return;

    if (target?.hasAttribute?.('data-handleid')) {
      const handleId = target.getAttribute('data-handleid');
      if (handleId.includes('-output-')) return;
    }

    const isNotTargetHandle = !target?.closest?.('.vue-flow__handle.target');
    const targetNode =
      isNotTargetHandle && target?.closest?.('.vue-flow__node');

    if (targetNode && targetNode.dataset?.id !== nodeToConnect.nodeId) {
      const nodeId = targetNode.dataset.id;
      const nodeData = editor.getNode?.value
        ? editor.getNode.value(nodeId)
        : editor.findNode?.(nodeId);

      if (nodeData && nodeData.handleBounds?.target?.length >= 1) {
        const targetHandle = nodeData.handleBounds.target.find(
          (item) => item.id
        );
        if (!targetHandle) return;

        const newEdge = {
          id: `vueflow__edge-${nodeToConnect.nodeId}${nodeToConnect.handleId}-${nodeId}${targetHandle.id}`,
          target: nodeId,
          source: nodeToConnect.nodeId,
          targetHandle: targetHandle.id,
          sourceHandle: nodeToConnect.handleId,
          type: 'custom',
          updatable: true,
        };

        editor.addEdges([newEdge]);
        if (workflow.value.drawflow?.edges) {
          workflow.value.drawflow.edges.push(newEdge);
        }
        notifyWorkflowChange(workflow.value);
      }
    }

    nodeToConnect = null;
  });

  // 3. Node Drag Stop (Track position changes in EditorCommands & notify)
  editor.onNodeDragStop?.(({ nodes }) => {
    if (editorCommands?.state?.nodes) {
      nodes.forEach((node) => {
        editorCommands.state.nodes[node.id] = node;
      });
    }
    if (workflow.value.drawflow?.nodes) {
      nodes.forEach((dragged) => {
        const target = workflow.value.drawflow.nodes.find(
          (n) => n.id === dragged.id
        );
        if (target && dragged.position) {
          target.position = { ...dragged.position };
        }
      });
    }
    notifyWorkflowChange(workflow.value);
  });

  // 4. Edges Change (Filter invalid output-to-output and sync edges)
  editor.onEdgesChange?.((changes) => {
    let hasChanges = false;
    changes.forEach(({ type, item }) => {
      if (
        type === 'add' &&
        item?.sourceHandle?.includes('output') &&
        item?.targetHandle?.includes('output')
      ) {
        editor.removeEdges([item.id]);
        return;
      }
      if (type === 'remove' || type === 'add') {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      const currentEdges = editor.getEdges?.value || [];
      if (workflow.value.drawflow) {
        workflow.value.drawflow.edges = currentEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type || 'custom',
          data: e.data || {},
        }));
      }
      notifyWorkflowChange(workflow.value);
    }
  });

  // 5. Initialize CommandManager tracking
  const convertToObj = (array) =>
    (array || []).reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});

  const nodes = editor?.getNodes?.value || [];
  const edges = editor?.getEdges?.value || [];
  const commandInitState = {
    nodes: convertToObj(nodes),
    edges: convertToObj(edges),
  };
  editorCommands = new EditorCommands(editor, commandInitState);
}

function onEditBlock(nodeProps) {
  const blocks = getBlocks();
  const blockType = nodeProps.id || nodeProps.label;
  const blockDef = blocks[blockType] || {};
  const blockData = defu(nodeProps.data || {}, blockDef.data || {});

  editState.blockData = {
    id: blockType,
    blockId: nodeProps.blockId || nodeProps.id,
    data: blockData,
    name: blockDef.name || blockType,
    editComponent: blockDef.editComponent,
    details: {
      id: blockType,
      name: blockDef.name || blockType,
      ...blockDef,
    },
  };

  if (blockType === 'wait-connections' && editorInstance.value) {
    const edges = editorInstance.value.getEdges?.value || [];
    const connections = edges.reduce((acc, { target, sourceNode, source }) => {
      if (target !== editState.blockData.blockId) return acc;

      const sourceLabel = sourceNode?.label || '';
      const blockName = blocks[sourceLabel]?.name || sourceLabel;
      acc.push({
        id: source,
        name: blockName,
      });
      return acc;
    }, []);
    editState.blockData.connections = connections;
  }

  editState.editing = true;
  state.showSidebar = true;
}

function closeEditingSidebar() {
  editState.editing = false;
  editState.blockData = {};
}

function updateBlockData(newData) {
  if (!editState.blockData.blockId) return;

  const nodes = workflow.value.drawflow?.nodes || [];
  const targetNode = nodes.find((n) => n.id === editState.blockData.blockId);
  if (targetNode) {
    targetNode.data = JSON.parse(JSON.stringify(newData));
    editState.blockData.data = targetNode.data;
    notifyWorkflowChange(workflow.value);
  }
}

function updateWorkflowDetails(partial) {
  Object.assign(workflow.value, partial);
  notifyWorkflowChange(workflow.value);
}

function updateWorkflowSettings(settings) {
  workflow.value.settings = Object.assign(
    workflow.value.settings || {},
    settings
  );
  notifyWorkflowChange(workflow.value);
}

function onUpdateNode({ id, data }) {
  const nodes = workflow.value.drawflow?.nodes || [];
  const targetNode = nodes.find((n) => n.id === id);
  if (targetNode) {
    targetNode.data = JSON.parse(JSON.stringify(data));
    notifyWorkflowChange(workflow.value);
  }
}

function onDeleteNode(id) {
  const nodes = workflow.value.drawflow?.nodes || [];
  const index = nodes.findIndex((n) => n.id === id);
  if (index !== -1) {
    nodes.splice(index, 1);
    if (editState.blockData?.blockId === id) {
      closeEditingSidebar();
    }
    notifyWorkflowChange(workflow.value);
  }
}

function onDragoverEditor(event) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

// File Loading & Canvas Drop Handler (with Auto-Sanitization)
async function loadWorkflowData(content) {
  if (!content || typeof content !== 'object') return;
  const sanitized = sanitizeWorkflowAST(content);
  setAutomaWorkflow(sanitized);
  closeEditingSidebar();
  await nextTick();
  const editor = editorRef.value || editorInstance.value;
  if (editor) {
    const nodes = sanitized.drawflow?.nodes || sanitized.nodes || [];
    const edges = sanitized.drawflow?.edges || sanitized.edges || [];
    if (editor.setNodes) editor.setNodes(nodes);
    if (editor.setEdges) editor.setEdges(edges);
    if (editor.fitView) editor.fitView();
  }
}

function openFilePicker() {
  if (window.vscode) {
    window.vscode.postMessage({ type: 'automa:pick-file' });
  } else if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function onFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      loadWorkflowData(parsed);
    } catch (err) {
      console.error('Failed to parse workflow file:', err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function loadAvailableWorkflows() {
  try {
    const files = await fetchStorageFiles();
    if (Array.isArray(files)) {
      availableWorkflows.value = files
        .filter(
          (f) =>
            f.type === 'workflow' ||
            f.name?.endsWith('.workflow.json') ||
            f.path?.endsWith('.workflow.json')
        )
        .map((f) => ({
          name:
            f.name?.replace(/\.workflow\.json$/, '') ||
            f.path
              ?.split('/')
              .pop()
              ?.replace(/\.workflow\.json$/, '') ||
            'Workflow',
          path: f.path || f.name,
        }));
    }
  } catch (_) {
    // Ignored
  }
}

function triggerImportWorkflow() {
  if (importFileInputRef.value) {
    importFileInputRef.value.click();
  }
}

function onImportFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      loadWorkflowData(parsed);
      currentFilePath.value = '';
      toast.success(
        `Workflow "${parsed.name || file.name}" imported successfully!`
      );
      loadAvailableWorkflows();
    } catch (err) {
      toast.error(`Failed to parse workflow file: ${err.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function createNewWorkflow() {
  const newWorkflow = JSON.parse(JSON.stringify(defaultWorkflow));
  newWorkflow.id = `wf_${nanoid()}`;
  if (newWorkflow.drawflow?.nodes?.[0]) {
    newWorkflow.drawflow.nodes[0].id = nanoid();
  }
  loadWorkflowData(newWorkflow);
}

function onDropInEditor(event) {
  event.preventDefault();

  // 1. Handle File Dropped from Desktop / File Explorer
  if (event.dataTransfer?.files?.length > 0) {
    const file = event.dataTransfer.files[0];
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          loadWorkflowData(parsed);
        } catch (err) {
          console.error('Failed to parse dropped workflow file', err);
        }
      };
      reader.readAsText(file);
      return;
    }
  }

  // 2. Handle Block Dropped from Palette
  if (!editorInstance.value) return;

  const rawBlock = event.dataTransfer?.getData('block');
  if (!rawBlock) return;

  const block = parseJSON(rawBlock, null);
  if (!block) return;

  const canvasEl =
    document.querySelector('.vue-flow') ||
    document.querySelector('.vue-flow__transformationpane') ||
    document.querySelector('main');
  const editorRect = canvasEl
    ? canvasEl.getBoundingClientRect()
    : { left: 0, top: 0 };

  const position = editorInstance.value.project({
    x: event.clientX - editorRect.left,
    y: event.clientY - editorRect.top,
  });

  const isTriggerExists =
    block.id === 'trigger' &&
    (editorInstance.value.getNodes?.value || []).some(
      (node) => node.label === 'trigger'
    );
  if (isTriggerExists) return;

  const nodeEl = DroppedNode.isNode(event.target);
  if (nodeEl) {
    DroppedNode.replaceNode(editorInstance.value, { block, target: nodeEl });
    syncWorkflowFromCanvas();
    return;
  }

  const nodeId = nanoid();
  const newNode = {
    id: block.id === 'blocks-group-2' ? `group-${nodeId}` : nodeId,
    label: block.id,
    type: block.component || 'BlockBasic',
    position,
    data: JSON.parse(JSON.stringify(block.data || {})),
  };

  editorInstance.value.addNodes([newNode]);

  const edgeEl = DroppedNode.isEdge(event.target);
  const handleEl = DroppedNode.isHandle(event.target);

  if (handleEl) {
    DroppedNode.appendNode(editorInstance.value, {
      target: handleEl,
      nodeId: newNode.id,
    });
  } else if (edgeEl) {
    DroppedNode.insertBetweenNode(editorInstance.value, {
      target: edgeEl,
      nodeId: newNode.id,
      outputs: block.outputs || 1,
    });
  }

  if (editorCommands) {
    commandManager.add(editorCommands.nodeAdded([newNode]));
  }

  syncWorkflowFromCanvas();
}

// Auto Align with Dagre Graph Layout
function autoAlign() {
  const editor = editorRef.value || editorInstance.value;
  if (!editor) return;

  state.animateBlocks = true;

  const nodes =
    editorRef.value?.getNodes?.() ||
    editorInstance.value?.getNodes?.value ||
    [];
  const edges =
    editorRef.value?.getEdges?.() ||
    editorInstance.value?.getEdges?.value ||
    [];

  const nodeChanges = GraphLayoutService.computeDagreLayout(nodes, edges);

  if (editor.applyNodeChanges) {
    editor.applyNodeChanges(nodeChanges);
  }
  if (editor.fitView) {
    editor.fitView({ padding: 0.1 });
  }
  syncWorkflowFromCanvas();

  setTimeout(() => {
    state.animateBlocks = false;
  }, 500);
}

// Robust Selection Helpers
function getSelectedNodes() {
  if (!editorInstance.value) return [];

  const allNodes =
    editorInstance.value.getNodes?.value ||
    editorInstance.value.nodes?.value ||
    [];

  // 1. Direct getSelectedNodes
  let selected = editorInstance.value.getSelectedNodes?.value;
  if (Array.isArray(selected) && selected.length > 0) return selected;
  if (typeof editorInstance.value.getSelectedNodes === 'function') {
    selected = editorInstance.value.getSelectedNodes();
    if (Array.isArray(selected) && selected.length > 0) return selected;
  }

  // 2. From allNodes .selected property
  selected = allNodes.filter((n) => n.selected);
  if (selected.length > 0) return selected;

  // 3. From DOM .vue-flow__node.selected
  const selectedEls = document.querySelectorAll('.vue-flow__node.selected');
  if (selectedEls.length > 0) {
    const ids = Array.from(selectedEls).map((el) => el.dataset.id);
    const domNodes = allNodes.filter((n) => ids.includes(n.id));
    if (domNodes.length > 0) return domNodes;
  }

  // 4. From active editing block in sidebar
  if (editState.blockData?.blockId) {
    const editNode = allNodes.find((n) => n.id === editState.blockData.blockId);
    if (editNode) return [editNode];
  }

  return [];
}

function getSelectedEdges() {
  if (!editorInstance.value) return [];
  const allEdges =
    editorInstance.value.getEdges?.value ||
    editorInstance.value.edges?.value ||
    [];

  let selected = editorInstance.value.getSelectedEdges?.value;
  if (Array.isArray(selected) && selected.length > 0) return selected;
  if (typeof editorInstance.value.getSelectedEdges === 'function') {
    selected = editorInstance.value.getSelectedEdges();
    if (Array.isArray(selected) && selected.length > 0) return selected;
  }

  return allEdges.filter((e) => e.selected);
}

function selectAllNodes() {
  if (!editorInstance.value) return;
  const allNodes = editorInstance.value.getNodes?.value || [];
  allNodes.forEach((node) => {
    node.selected = true;
  });
  if (editorInstance.value.addSelectedNodes) {
    editorInstance.value.addSelectedNodes(allNodes);
  }
}

// Copy, Duplicate, Paste Elements
function copyElements(nodes, edges, initialPos) {
  const blocks = getBlocks();
  const newIds = new Map();
  let firstNodePos = null;

  const newNodes = (nodes || []).map((node, index) => {
    const newNodeId = nanoid();
    newIds.set(node.id, newNodeId);

    const nodePos = {
      x: (node.position?.x || 0) + 40,
      y: (node.position?.y || 0) + 40,
    };

    if (
      initialPos &&
      (initialPos.clientX !== undefined || initialPos.x !== undefined)
    ) {
      if (index === 0) {
        firstNodePos = { x: node.position?.x || 0, y: node.position?.y || 0 };
        const canvasEl =
          document.querySelector('.vue-flow') || document.querySelector('main');
        const editorRect = canvasEl
          ? canvasEl.getBoundingClientRect()
          : { left: 0, top: 0 };
        const clientX =
          initialPos.clientX !== undefined ? initialPos.clientX : initialPos.x;
        const clientY =
          initialPos.clientY !== undefined ? initialPos.clientY : initialPos.y;
        const projectedPos = editorInstance.value.project({
          x: clientX - editorRect.left,
          y: clientY - editorRect.top,
        });
        Object.assign(nodePos, projectedPos);
      } else {
        const xDistance = (node.position?.x || 0) - firstNodePos.x;
        const yDistance = (node.position?.y || 0) - firstNodePos.y;
        nodePos.x += xDistance;
        nodePos.y += yDistance;
      }
    }

    const label = node.label || node.id;
    const blockDef = blocks[label] || {};

    return {
      id: newNodeId,
      label,
      type: node.type || blockDef.component || 'BlockBasic',
      position: nodePos,
      selected: true,
      data: JSON.parse(JSON.stringify(node.data || {})),
    };
  });

  const newEdges = (edges || []).reduce((acc, edge) => {
    const targetId = newIds.get(edge.target);
    const sourceId = newIds.get(edge.source);
    if (!targetId || !sourceId) return acc;

    acc.push({
      id: `edge-${nanoid()}`,
      selected: true,
      target: targetId,
      source: sourceId,
      targetHandle: edge.targetHandle
        ? edge.targetHandle.replace(edge.target, targetId)
        : `${targetId}-input-1`,
      sourceHandle: edge.sourceHandle
        ? edge.sourceHandle.replace(edge.source, sourceId)
        : `${sourceId}-output-1`,
      class: edge.class || '',
    });
    return acc;
  }, []);

  return { nodes: newNodes, edges: newEdges };
}

function duplicateElements(ctxData) {
  if (!editorInstance.value) return;

  let nodes = ctxData?.nodes;
  let edges = ctxData?.edges;

  if (!nodes || !nodes.length) {
    nodes = getSelectedNodes();
  }
  if (!edges || !edges.length) {
    edges = getSelectedEdges();
  }

  if (!nodes || nodes.length === 0) return;

  const { nodes: newNodes, edges: newEdges } = copyElements(
    nodes,
    edges,
    ctxData?.position
  );

  const allNodes = editorInstance.value.getNodes?.value || [];
  allNodes.forEach((n) => {
    n.selected = false;
  });
  const allEdges = editorInstance.value.getEdges?.value || [];
  allEdges.forEach((e) => {
    e.selected = false;
  });

  editorInstance.value.addNodes(newNodes);
  if (newEdges.length > 0) {
    editorInstance.value.addEdges(newEdges);
  }
  if (editorInstance.value.addSelectedNodes) {
    editorInstance.value.addSelectedNodes(newNodes);
  }

  if (editorCommands) {
    commandManager.add(editorCommands.nodeAdded(newNodes));
  }
  syncWorkflowFromCanvas();
}

function copySelectedElements(ctxData) {
  if (!editorInstance.value) return;

  let nodes = ctxData?.nodes;
  let edges = ctxData?.edges;

  if (!nodes || !nodes.length) {
    nodes = getSelectedNodes();
  }
  if (!edges || !edges.length) {
    edges = getSelectedEdges();
  }

  if (!nodes || nodes.length === 0) return;

  const payload = {
    name: 'automa-blocks',
    data: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges || [])),
    },
  };

  internalClipboard = payload;

  try {
    const text = JSON.stringify(payload);
    navigator.clipboard?.writeText(text).catch(() => {});
  } catch (e) {
    // Ignored
  }
}

async function pasteCopiedElements(position) {
  if (!editorInstance.value) return;

  let clipboardData = internalClipboard;

  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      const parsed = parseJSON(text, null);
      if (parsed && parsed.name === 'automa-blocks' && parsed.data) {
        clipboardData = parsed;
      }
    }
  } catch (err) {
    // Ignored
  }

  if (
    !clipboardData ||
    !clipboardData.data ||
    !clipboardData.data.nodes?.length
  )
    return;

  const { nodes: sourceNodes, edges: sourceEdges } = clipboardData.data;
  const { nodes: newNodes, edges: newEdges } = copyElements(
    sourceNodes,
    sourceEdges,
    position
  );

  const allNodes = editorInstance.value.getNodes?.value || [];
  allNodes.forEach((n) => {
    n.selected = false;
  });
  const allEdges = editorInstance.value.getEdges?.value || [];
  allEdges.forEach((e) => {
    e.selected = false;
  });

  editorInstance.value.addNodes(newNodes);
  if (newEdges.length > 0) {
    editorInstance.value.addEdges(newEdges);
  }
  if (editorInstance.value.addSelectedNodes) {
    editorInstance.value.addSelectedNodes(newNodes);
  }

  if (editorCommands) {
    commandManager.add(editorCommands.nodeAdded(newNodes));
  }
  syncWorkflowFromCanvas();
}

function groupBlocks(ctxData) {
  if (!editorInstance.value) return;

  const position = ctxData?.position;
  const nodes =
    ctxData?.nodes && ctxData.nodes.length > 0
      ? ctxData.nodes
      : getSelectedNodes();
  if (!nodes || nodes.length === 0) return;

  const nodesToDelete = [];
  const groupBlocksList = nodes.reduce((acc, node) => {
    const label = node.label || node.id;
    if (excludeGroupBlocks.includes(label)) return acc;

    acc.push({
      id: label,
      itemId: node.id,
      data: JSON.parse(JSON.stringify(node.data || {})),
    });
    nodesToDelete.push(node);

    return acc;
  }, []);

  if (groupBlocksList.length === 0) return;

  const blocks = getBlocks();
  const { component, data } = blocks['blocks-group'] || {
    component: 'BlockGroup',
    data: {},
  };

  let projectedPos = { x: 100, y: 100 };
  if (position && position.clientX !== undefined) {
    const canvasEl =
      document.querySelector('.vue-flow') || document.querySelector('main');
    const editorRect = canvasEl
      ? canvasEl.getBoundingClientRect()
      : { left: 0, top: 0 };
    projectedPos = editorInstance.value.project({
      x: position.clientX - editorRect.left,
      y: position.clientY - editorRect.top,
    });
  } else if (nodesToDelete[0]?.position) {
    projectedPos = { ...nodesToDelete[0].position };
  }

  const groupNode = {
    id: nanoid(),
    type: component || 'BlockGroup',
    label: 'blocks-group',
    data: { ...data, blocks: groupBlocksList },
    position: projectedPos,
  };

  editorInstance.value.removeNodes(nodesToDelete);
  editorInstance.value.addNodes([groupNode]);
  if (editorCommands) {
    commandManager.add(editorCommands.nodeAdded([groupNode]));
  }
  syncWorkflowFromCanvas();
}

function ungroupBlocks(ctxData) {
  if (!editorInstance.value) return;

  const nodes =
    ctxData?.nodes && ctxData.nodes.length > 0
      ? ctxData.nodes
      : getSelectedNodes();
  const [node] = nodes || [];
  if (!node || node.label !== 'blocks-group') return;

  const blocks = getBlocks();
  const edges = [];
  const position = { ...(node.position || { x: 100, y: 100 }) };
  const copyBlocks = JSON.parse(JSON.stringify(node.data?.blocks || []));

  const groupBlocksList = copyBlocks.map((item, index) => {
    const nextNode = copyBlocks[index + 1];
    if (nextNode) {
      edges.push({
        id: `edge-${nanoid()}`,
        source: item.itemId,
        target: nextNode.itemId,
        sourceHandle: `${item.itemId}-output-1`,
        targetHandle: `${nextNode.itemId}-input-1`,
      });
    }

    const label = item.id;
    const blockDef = blocks[label] || {};
    const restoredNode = {
      id: item.itemId,
      label,
      type: blockDef.component || 'BlockBasic',
      position: { ...position },
      data: item.data || {},
    };

    position.x += 250;
    return restoredNode;
  });

  editorInstance.value.removeNodes([node]);
  editorInstance.value.addNodes(groupBlocksList);
  if (edges.length > 0) {
    editorInstance.value.addEdges(edges);
  }
  if (editorCommands) {
    commandManager.add(editorCommands.nodeAdded(groupBlocksList));
  }
  syncWorkflowFromCanvas();
}

function exportJson() {
  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(workflow.value, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute(
    'download',
    `${workflow.value.name || 'workflow'}.automa.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

async function loadWorkflowFromStorage(path) {
  if (!path) return;
  currentFilePath.value = path;
  try {
    const res = await getWorkflow({
      baseUrl: automaCoreState.baseUrl,
      query: { path },
    });
    if (res.data) {
      loadWorkflowData(res.data);
      toast.success(
        `Loaded workflow from Storage: ${path.split(/[\\/]/).pop()}`
      );
    } else {
      const errMsg = res.error?.message || 'Unknown error';
      toast.error(`Failed to load workflow: ${errMsg}`);
    }
  } catch (e) {
    toast.error(`Error loading workflow: ${e.message}`);
  }
}

async function saveWorkflowToStorage() {
  if (automaCoreState.status !== 'online') {
    toast.warning('Automa Core is offline. Exporting JSON file locally...');
    exportJson();
    return;
  }
  if (!currentFilePath.value) {
    exportJson();
    return;
  }
  isSaving.value = true;
  syncWorkflowFromCanvas();
  try {
    const res = await saveWorkflow({
      baseUrl: automaCoreState.baseUrl,
      body: {
        path: currentFilePath.value,
        content: workflow.value,
      },
    });
    if (res.data !== undefined && !res.error) {
      isDirty.value = false;
      toast.success(
        `Saved to Storage: ${currentFilePath.value.split(/[\\/]/).pop()}`
      );
      loadAvailableWorkflows();
    } else {
      toast.error(`Failed to save: ${res.error?.message || 'Unknown error'}`);
    }
  } catch (e) {
    toast.error(`Error saving workflow: ${e.message}`);
  } finally {
    isSaving.value = false;
  }
}

function onStorageFileSelected(file) {
  if (!file) return;
  currentFilePath.value = file.path;
  loadWorkflowFromStorage(file.path);
  modals.storageFiles = false;
}

// Backward compatibility alias
const loadWorkflowFromVault = loadWorkflowFromStorage;
const saveWorkflowToVault = saveWorkflowToStorage;

function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

const runLiveLint = debounce(async () => {
  if (automaCoreState.status !== 'online' || !workflow.value?.drawflow) return;
  isLinting.value = true;
  try {
    const res = await lintWorkflow({
      baseUrl: automaCoreState.baseUrl,
      body: {
        nodes: workflow.value.drawflow.nodes || [],
        edges: workflow.value.drawflow.edges || [],
        drawflow: workflow.value.drawflow,
      },
    });
    if (res.data) {
      lintIssues.value = res.data.issues || [];
    }
  } catch (_) {
    // Ignored
  } finally {
    isLinting.value = false;
  }
}, 800);

function triggerManualLint() {
  runLiveLint();
  if (lintIssues.value.length === 0) {
    toast.success('Lint Check: Workflow schema and DAG structure are valid!');
  } else {
    toast.warning(
      `Lint Check: ${lintIssues.value.length} potential issue(s) detected.`
    );
  }
}

watch(
  () => workflow.value?.drawflow,
  () => {
    runLiveLint();
  },
  { deep: true }
);

function resolveParamDefault(p) {
  if (p.value !== undefined && p.value !== '') {
    return p.value;
  }
  if (p.defaultValue !== undefined) {
    return p.defaultValue;
  }
  if (p.type === 'checkbox') {
    return false;
  }
  return '';
}

async function submitWorkflowExecution() {
  runModalState.isSubmitting = true;
  try {
    // Clone workflow to inject runtime parameters
    const clonedWf = JSON.parse(JSON.stringify(workflow.value));
    if (runModalState.parameters && runModalState.parameters.length > 0) {
      const triggerNode = clonedWf.drawflow?.nodes?.find(
        (n) => n.label === 'trigger' || n.type === 'trigger'
      );
      if (triggerNode) {
        if (!triggerNode.data) triggerNode.data = {};
        triggerNode.data.parameters = runModalState.parameters;
      }
    }

    const payload = {
      workflowData: clonedWf,
      options: {
        browserId: runModalState.browserId,
        headless: runModalState.headless,
        closeBrowserOnFinish: runModalState.closeBrowserOnFinish,
        checkParams: false,
      },
    };
    if (currentFilePath.value) {
      payload.workflowPath = currentFilePath.value;
    }

    const res = await submitJob({
      baseUrl: automaCoreState.baseUrl,
      body: payload,
    });

    const { data } = res;
    if (data && data.jobId) {
      activeJobId.value = data.jobId;
      isJobRunning.value = true;
      isJobPaused.value = false;
      toast.success(`Workflow job started! (ID: ${data.jobId.slice(0, 8)})`);
      runModalState.show = false;

      // Save initial running record to Dexie dbLogs
      await dbLogs.items.put({
        id: data.jobId,
        name: workflow.value?.name || 'Workflow Run',
        startedAt: Date.now(),
        endedAt: 0,
        workflowId: workflow.value?.id || '',
        status: 'running',
      });

      // Initialize Dexie sub-tables
      await Promise.all([
        dbLogs.histories.put({ logId: data.jobId, data: [] }),
        dbLogs.logsData.put({
          logId: data.jobId,
          data: { table: [], variables: {} },
        }),
        dbLogs.ctxData.put({ logId: data.jobId, data: {} }),
      ]);

      // Trigger full native Automa logs modal
      openLogsModal();
    } else {
      toast.error(data.message || 'Failed to submit workflow execution job');
    }
  } catch (err) {
    toast.error(`Execution error: ${err.message}`);
  } finally {
    runModalState.isSubmitting = false;
  }
}

async function runWorkflow() {
  if (automaCoreState.status === 'online') {
    // Extract parameters from Trigger block if defined
    const triggerNode = workflow.value?.drawflow?.nodes?.find(
      (n) => n.label === 'trigger' || n.type === 'trigger'
    );
    const params = triggerNode?.data?.parameters || [];
    const hasRequiredParams = params.some(
      (p) => p.data?.required && (p.value === undefined || p.value === '')
    );

    // Pre-flight Cascading & Browser Resolution Waterfall
    let defaultProfileId = null;
    let availableBrowsers = [];
    try {
      [defaultProfileId, availableBrowsers] = await Promise.all([
        getDefaultBrowserProfile(),
        fetchBrowsers(),
      ]);
    } catch (_) {
      // Fallback
    }

    // Level 3: Zero browser profiles configured -> Open Master Resolver Sheet
    if (!availableBrowsers || availableBrowsers.length === 0) {
      toast.warning(
        'No browser profiles found. Opening Master Browser Resolver...'
      );
      modals.browsers = true;
      return;
    }

    // Level 1: Fast Path (Happy flow) - If default browser exists and no required input params
    if (defaultProfileId && !hasRequiredParams && params.length === 0) {
      runModalState.browserId = defaultProfileId;
      runModalState.parameters = [];
      await submitWorkflowExecution();
      return;
    }

    // Level 2: Selection Prompt - Show Run Modal to pick browser / fill params
    runModalState.parameters = JSON.parse(JSON.stringify(params)).map((p) => ({
      ...p,
      value: resolveParamDefault(p),
    }));
    if (defaultProfileId) {
      runModalState.browserId = defaultProfileId;
    } else if (availableBrowsers.length > 0) {
      runModalState.browserId = availableBrowsers[0].id;
    }
    runModalState.show = true;
    return;
  }

  if (window.vscode) {
    window.vscode.postMessage({
      type: 'automa:run-workflow',
      data: workflow.value,
    });
    toast.info('Run request sent to VS Code Extension');
    return;
  }

  toast.error(
    'Automa Core is offline. Please launch the backend server (task: "Serve: Live Studio" or pnpm run dev:all) to run workflows.'
  );
}

// Global Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+A, Ctrl+Z, Ctrl+Y, Ctrl+S)
function onKeydown(e) {
  if (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
    e.target.isContentEditable
  )
    return;

  const isMod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (isMod && key === 's') {
    saveWorkflowToVault();
    e.preventDefault();
  } else if (isMod && key === 'c') {
    copySelectedElements();
    e.preventDefault();
  } else if (isMod && key === 'v') {
    pasteCopiedElements();
    e.preventDefault();
  } else if (isMod && key === 'd') {
    duplicateElements();
    e.preventDefault();
  } else if (isMod && key === 'a') {
    selectAllNodes();
    e.preventDefault();
  } else if (isMod && key === 'z') {
    if (e.shiftKey) {
      commandManager.redo();
    } else {
      commandManager.undo();
    }
    e.preventDefault();
  } else if (isMod && key === 'y') {
    commandManager.redo();
    e.preventDefault();
  }
}

function onWindowMessage(e) {
  if (!e || !e.data || typeof e.data !== 'object') return;
  if (
    e.data.type === 'automa:load-workflow' &&
    e.data.data &&
    typeof e.data.data === 'object'
  ) {
    loadWorkflowData(e.data.data);
  } else if (e.data.type === 'automa:set-headless') {
    isHeadless.value = Boolean(e.data.headless);
  }
}

let cleanupEventListener = null;
let unsubscribeWs = null;

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('message', onWindowMessage);

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('headless') === 'true') {
      isHeadless.value = true;
    }
    const fileParam = urlParams.get('file') || urlParams.get('path');
    if (fileParam) {
      currentFilePath.value = fileParam;
      loadWorkflowFromVault(fileParam);
    }
  }

  // Initial live lint check & available workflows
  runLiveLint();
  loadAvailableWorkflows();

  // Connect WebSocket for live debugger
  wsService.connect(automaCoreState.baseUrl);
  unsubscribeWs = wsService.subscribe((msg) => {
    if (!msg) return;
    if (msg.type === 'JOB_STARTED') {
      activeJobId.value = msg.jobId;
      isJobRunning.value = true;
      isJobPaused.value = false;
    } else if (msg.type === 'JOB_PAUSED') {
      isJobPaused.value = true;
    } else if (msg.type === 'JOB_RESUMED') {
      isJobPaused.value = false;
    } else if (
      msg.type === 'JOB_FINISHED' ||
      msg.type === 'JOB_STOPPED' ||
      msg.type === 'JOB_KILLED'
    ) {
      isJobRunning.value = false;
      isJobPaused.value = false;
      activeJobId.value = null;
      activeRunningBlockId.value = null;
    }
  });

  const { addEventListener } = useAutomaCoreHealth();
  cleanupEventListener = addEventListener(async (data) => {
    if (!data) return;
    const blockId = data.blockId || data.data?.blockId || data.data?.block_id;
    if (blockId) {
      activeRunningBlockId.value = blockId;
      if (autoFocusEnabled.value) {
        goToBlock(blockId);
      }
    }
    const jobId = data.jobId || data.job_id;
    if (jobId) {
      const msg = data.message || data.data?.message;
      if (msg) {
        try {
          const entry = (await dbLogs.histories.get(jobId)) || {
            logId: jobId,
            data: [],
          };
          const list = Array.isArray(entry.data) ? entry.data : [];
          list.push({
            id: String(list.length + 1),
            name: data.name || data.data?.name || 'Block Step',
            blockId: blockId || '',
            type: data.type === 'error' ? 'error' : 'success',
            timestamp: Date.now(),
            message: msg,
            description: data.description || data.data?.description || '',
          });
          await dbLogs.histories.put({ logId: jobId, data: list });
        } catch (_) {
          // Ignored
        }
      }

      if (
        data.event_type === 'workflow_finished' ||
        data.type === 'finished' ||
        data.status === 'completed' ||
        data.status === 'error'
      ) {
        activeRunningBlockId.value = null;
        isJobRunning.value = false;
        isJobPaused.value = false;
        activeJobId.value = null;
        try {
          await dbLogs.items.update(jobId, {
            endedAt: Date.now(),
            status:
              data.status === 'error' || data.type === 'error'
                ? 'error'
                : 'success',
          });
        } catch (_) {
          // Ignored
        }
      }
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('message', onWindowMessage);
  if (cleanupEventListener) cleanupEventListener();
  if (unsubscribeWs) unsubscribeWs();
  wsService.disconnect();
  stopDrag();
});
</script>

<style>
.custom-drag {
  position: absolute;
  width: 6px;
  height: 100%;
  right: 0;
  top: 0;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.2s, background-color 0.2s;
  background-color: rgb(59, 130, 246);
  z-index: 50;
}
.custom-drag:hover {
  opacity: 1;
}

.vue-flow__node.node-running {
  box-shadow: 0 0 0 3px #10b981, 0 0 15px rgba(16, 185, 129, 0.5) !important;
  animation: pulse-node 1.5s infinite;
  border-radius: 8px;
}
@keyframes pulse-node {
  0%,
  100% {
    box-shadow: 0 0 0 3px #10b981, 0 0 15px rgba(16, 185, 129, 0.5);
  }
  50% {
    box-shadow: 0 0 0 5px #34d399, 0 0 25px rgba(52, 211, 153, 0.8);
  }
}
</style>
