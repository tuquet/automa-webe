<template>
  <div
    class="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans select-none"
  >
    <!-- Top Header Bar -->
    <header
      data-testid="studio-header"
      class="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 flex items-center justify-between z-30 shrink-0"
    >
      <!-- Left Section: Sidebar Toggle, New/Open File, & Workflow Name -->
      <div class="flex items-center space-x-3">
        <button
          data-testid="btn-toggle-sidebar"
          class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          :title="state.showSidebar ? 'Hide Sidebar' : 'Show Sidebar'"
          @click="state.showSidebar = !state.showSidebar"
        >
          <v-remixicon
            :name="state.showSidebar ? 'riSideBarFill' : 'riSideBarLine'"
            size="18"
          />
        </button>

        <!-- File Open & New Buttons -->
        <div class="flex items-center space-x-1">
          <button
            data-testid="btn-open-file"
            class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            title="Open Workflow JSON File from Computer (or Drag & Drop file onto Canvas)"
            @click="openFilePicker"
          >
            <v-remixicon name="riFolderOpenLine" size="14" />
            <span class="hidden md:inline">Open File</span>
          </button>
          <input
            ref="fileInputRef"
            data-testid="file-picker-input"
            type="file"
            accept=".json,.automa.json"
            class="hidden"
            @change="onFileSelected"
          />

          <button
            data-testid="btn-new-workflow"
            class="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            title="Create New Blank Workflow"
            @click="createNewWorkflow"
          >
            <v-remixicon name="riAddLine" size="14" />
            <span class="hidden md:inline">New</span>
          </button>
        </div>
      </div>

      <!-- Right Section: Data, Modals & Execution -->
      <div class="flex items-center space-x-2">
        <button
          data-testid="btn-table-data"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
          title="Workflow Data Table"
          @click="openModal('table')"
        >
          <v-remixicon name="riFileListLine" size="14" />
          <span class="hidden lg:inline">Table Data</span>
        </button>

        <button
          data-testid="btn-global-data"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
          title="Global Data / Variables"
          @click="openModal('global-data')"
        >
          <v-remixicon name="riDatabase2Line" size="14" />
          <span class="hidden lg:inline">Global Data</span>
        </button>

        <button
          data-testid="btn-settings"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
          title="Workflow Settings"
          @click="openModal('settings')"
        >
          <v-remixicon name="riSettings3Line" size="14" />
          <span class="hidden lg:inline">Settings</span>
        </button>

        <button
          data-testid="btn-logs"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
          title="Execution Logs & History"
          @click="openLogsModal"
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

        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        <studio-daemon-status />

        <button
          data-testid="btn-save-workflow"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition"
          :class="[
            daemonState.status === 'online'
              ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
              : 'opacity-50 cursor-not-allowed text-gray-400 border-gray-200 dark:border-gray-800',
          ]"
          :disabled="daemonState.status !== 'online'"
          :title="
            daemonState.status === 'online'
              ? currentFilePath
                ? `Save to Vault (${currentFilePath}) [Ctrl+S]`
                : 'Save to Vault / Export [Ctrl+S]'
              : 'Daemon Offline - Cannot save to Vault'
          "
          @click="saveWorkflowToVault"
        >
          <v-remixicon name="riSaveLine" size="14" />
          <span class="hidden sm:inline">Save</span>
        </button>

        <button
          data-testid="btn-export-json"
          class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1.5"
          title="Export Workflow JSON"
          @click="exportJson"
        >
          <v-remixicon name="riDownloadLine" size="14" />
          <span class="hidden sm:inline">Export</span>
        </button>

        <button
          data-testid="btn-run-workflow"
          class="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 shadow-sm transition"
          :class="[
            daemonState.status === 'online'
              ? 'bg-accent hover:bg-accent/90 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600',
          ]"
          :title="
            daemonState.status === 'online'
              ? 'Execute Workflow via Automa Core Daemon'
              : 'Daemon Offline - Cannot execute'
          "
          @click="runWorkflow"
        >
          <v-remixicon name="riPlayLine" size="14" />
          <span>Run</span>
        </button>
      </div>
    </header>

    <!-- Offline Preview Mode Banner -->
    <div
      v-if="daemonState.status === 'offline'"
      data-testid="banner-offline-preview"
      class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0"
    >
      <div class="flex items-center space-x-2">
        <v-remixicon name="riAlertLine" size="14" class="text-amber-500" />
        <span>
          Automa Core Daemon is offline. You are currently in
          <strong>Preview / View-Only Mode</strong>. Backend execution and Vault
          saving are disabled.
        </span>
      </div>
    </div>

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
              class="inline-flex items-center rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 mr-2"
            >
              <button
                data-testid="btn-canvas-undo"
                class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                :disabled="!commandManager.state.value.canUndo"
                title="Undo (Ctrl+Z)"
                @click="commandManager.undo"
              >
                <v-remixicon name="riArrowGoBackLine" />
              </button>
              <hr
                class="inline-block h-6 border-r border-gray-200 dark:border-gray-700"
              />
              <button
                data-testid="btn-canvas-redo"
                class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                :disabled="!commandManager.state.value.canRedo"
                title="Redo (Ctrl+Y)"
                @click="commandManager.redo"
              >
                <v-remixicon name="riArrowGoForwardLine" />
              </button>
            </div>

            <button
              data-testid="btn-canvas-auto-align"
              class="control-button mr-2"
              title="Auto Align Graph Layout"
              @click="autoAlign"
            >
              <v-remixicon name="riMagicLine" />
            </button>
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

    <!-- Run Workflow Modal -->
    <ui-modal
      v-model="runModalState.show"
      title="Execute Workflow"
      content-class="max-w-md"
    >
      <div class="space-y-4 py-1 text-xs">
        <div
          class="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
        >
          <p
            class="font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5 flex items-center"
          >
            <span
              class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"
            ></span>
            Automa Core Daemon (Online)
          </p>
          <p class="text-emerald-700/80 dark:text-emerald-400 text-[11px]">
            Target endpoint:
            <span class="font-mono">{{ daemonState.baseUrl }}/api/jobs</span>
          </p>
        </div>

        <div>
          <label
            class="block font-semibold mb-1 text-gray-700 dark:text-gray-300"
          >
            Target Browser Profile
          </label>
          <select
            v-model="runModalState.browserId"
            class="w-full px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-accent text-gray-800 dark:text-gray-100"
          >
            <option value="daemon_worker">
              ⚡ Default Chromium (Daemon Worker)
            </option>
            <option v-for="b in daemonState.browsers" :key="b.id" :value="b.id">
              🌐 {{ b.name || b.id }} {{ b.isOnline ? '(Online)' : '' }}
            </option>
          </select>
        </div>

        <div class="space-y-2 pt-1">
          <ui-checkbox v-model="runModalState.headless">
            Run in Headless Mode (Hidden Browser)
          </ui-checkbox>
          <ui-checkbox v-model="runModalState.closeBrowserOnFinish">
            Close Browser when Workflow Finishes
          </ui-checkbox>
        </div>

        <div
          class="flex justify-end space-x-2 pt-3 border-t border-gray-100 dark:border-gray-700"
        >
          <ui-button @click="runModalState.show = false">Cancel</ui-button>
          <ui-button
            variant="accent"
            :loading="runModalState.isSubmitting"
            @click="submitWorkflowExecution"
          >
            <v-remixicon name="riPlayLine" class="mr-1.5" size="14" />
            <span>Execute Workflow</span>
          </ui-button>
        </div>
      </div>
    </ui-modal>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  reactive,
  provide,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { customAlphabet } from 'nanoid';
import defu from 'defu';
import WorkflowEditor from '@/components/newtab/workflow/WorkflowEditor.vue';
import WorkflowEditBlock from '@/components/newtab/workflow/WorkflowEditBlock.vue';
import WorkflowDetailsCard from '@/components/newtab/workflow/WorkflowDetailsCard.vue';
import WorkflowDataTable from '@/components/newtab/workflow/WorkflowDataTable.vue';
import WorkflowGlobalData from '@/components/newtab/workflow/WorkflowGlobalData.vue';
import WorkflowSettings from '@/components/newtab/workflow/WorkflowSettings.vue';
import EditorLocalCtxMenu from '@/components/newtab/workflow/editor/EditorLocalCtxMenu.vue';
import EditorDebugging from '@/components/newtab/workflow/editor/EditorDebugging.vue';
import StudioDaemonStatus from '@/components/newtab/workflow/StudioDaemonStatus.vue';
import AppLogs from '@/components/newtab/app/AppLogs.vue';
import DroppedNode from '@/utils/editor/DroppedNode';
import EditorCommands from '@/utils/editor/EditorCommands';
import { useCommandManager } from '@/composable/commandManager';
import { useSidebarResize } from '@/composable/useSidebarResize';
import { useWorkflowAutocomplete } from '@/composable/useWorkflowAutocomplete';
import { useDaemonHealth } from '@/composable/useDaemonHealth';
import { useLiveQuery } from '@/composable/liveQuery';
import { useToast } from 'vue-toastification';
import emitter from '@/lib/mitt';
import dbLogs from '@/db/logs';
import { GraphLayoutService } from '@/services/graphLayout.service';
import { getBlocks } from '@/utils/getSharedData';
import { excludeGroupBlocks } from '@/utils/shared';
import { parseJSON } from '@/utils/helper';
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
let editorCommands = null;
const commandManager = useCommandManager();
let internalClipboard = null;
const toast = useToast();
const { state: daemonState } = useDaemonHealth();

// Execution & Run Modal State
const runModalState = reactive({
  show: false,
  browserId: 'daemon_worker',
  headless: false,
  closeBrowserOnFinish: false,
  isSubmitting: false,
});

const currentFilePath = ref('');
const isSaving = ref(false);
const activeRunningBlockId = ref(null);

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
  globalData: false,
  settings: false,
  logs: false,
});

const editState = reactive({
  editing: false,
  blockData: {},
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
  if (name === 'table') modals.table = true;
  else if (name === 'global-data') modals.globalData = true;
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

// File Loading & Canvas Drop Handler
async function loadWorkflowData(content) {
  if (!content || typeof content !== 'object') return;
  setAutomaWorkflow(content);
  closeEditingSidebar();
  await nextTick();
  const editor = editorRef.value || editorInstance.value;
  if (editor) {
    const nodes = content.drawflow?.nodes || content.nodes || [];
    const edges = content.drawflow?.edges || content.edges || [];
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

async function loadWorkflowFromVault(path) {
  if (!path) return;
  currentFilePath.value = path;
  try {
    const res = await fetch(
      `${daemonState.baseUrl}/api/vault/workflow?path=${encodeURIComponent(
        path
      )}`
    );
    if (res.ok) {
      const data = await res.json();
      loadWorkflowData(data);
      toast.success(`Loaded workflow from Vault: ${path.split(/[\\/]/).pop()}`);
    } else {
      const err = await res.json();
      toast.error(`Failed to load workflow: ${err.message || 'Unknown error'}`);
    }
  } catch (e) {
    toast.error(`Error loading workflow: ${e.message}`);
  }
}

async function saveWorkflowToVault() {
  if (daemonState.status !== 'online') {
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
    const res = await fetch(`${daemonState.baseUrl}/api/vault/workflow`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentFilePath.value,
        content: workflow.value,
      }),
    });
    if (res.ok) {
      toast.success(
        `Saved to Vault: ${currentFilePath.value.split(/[\\/]/).pop()}`
      );
    } else {
      const err = await res.json();
      toast.error(`Failed to save: ${err.message || 'Unknown error'}`);
    }
  } catch (e) {
    toast.error(`Error saving workflow: ${e.message}`);
  } finally {
    isSaving.value = false;
  }
}

function runWorkflow() {
  if (daemonState.status === 'online') {
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
    'Rust Daemon is offline. Please launch the backend server (task: "Serve: Live Studio") to run workflows.'
  );
}

async function syncJobLogs(jobId, baseUrl) {
  let finished = false;
  let pollCount = 0;

  const interval = setInterval(async () => {
    pollCount += 1;
    if (pollCount > 180 || finished) {
      clearInterval(interval);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/jobs/${jobId}/logs`);
      if (res.ok) {
        const logs = await res.json();
        if (Array.isArray(logs)) {
          for (let i = 0; i < logs.length; i += 1) {
            const item = logs[i];
            const historyId = `${jobId}_${i}`;
            const existing = await dbLogs.histories.get(historyId);
            if (!existing) {
              await dbLogs.histories.put({
                id: historyId,
                logId: jobId,
                name: item.block_name || item.name || 'Block',
                blockId: item.block_id || item.blockId || '',
                description: item.description || '',
                duration: item.duration || 0,
                status: item.type === 'error' ? 'error' : 'success',
                message: item.message || '',
                startedAt: item.timestamp || Date.now(),
                endedAt: (item.timestamp || Date.now()) + (item.duration || 0),
              });
            }
          }
        }
      }

      const jobRes = await fetch(`${baseUrl}/api/jobs/${jobId}`);
      if (jobRes.ok) {
        const job = await jobRes.json();
        if (['completed', 'error', 'failed', 'stopped'].includes(job.status)) {
          finished = true;
          clearInterval(interval);
          await dbLogs.items.update(jobId, {
            endedAt: Date.now(),
            status: job.status === 'completed' ? 'success' : 'error',
            message: job.error_message || '',
          });
        }
      }
    } catch (_) {
      // Ignored
    }
  }, 1000);
}

async function submitWorkflowExecution() {
  runModalState.isSubmitting = true;
  try {
    const payload = {
      workflowData: workflow.value,
      options: {
        browserId: runModalState.browserId,
        headless: runModalState.headless,
        closeBrowserOnFinish: runModalState.closeBrowserOnFinish,
      },
    };
    if (currentFilePath.value) {
      payload.workflowPath = currentFilePath.value;
    }

    const res = await fetch(`${daemonState.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.jobId) {
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

      // Trigger full native Automa logs modal
      openLogsModal();

      // Background log synchronizer
      syncJobLogs(data.jobId, daemonState.baseUrl);
    } else {
      toast.error(data.message || 'Failed to submit workflow execution job');
    }
  } catch (err) {
    toast.error(`Execution error: ${err.message}`);
  } finally {
    runModalState.isSubmitting = false;
  }
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
  }
}

let cleanupEventListener = null;

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('message', onWindowMessage);

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get('file') || urlParams.get('path');
    if (fileParam) {
      currentFilePath.value = fileParam;
      loadWorkflowFromVault(fileParam);
    }
  }

  const { addEventListener } = useDaemonHealth();
  cleanupEventListener = addEventListener((data) => {
    if (data?.blockId) {
      activeRunningBlockId.value = data.blockId;
      goToBlock(data.blockId);
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('message', onWindowMessage);
  if (cleanupEventListener) cleanupEventListener();
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
</style>
