/**
 * Host Bridge & Adapters for Automa Studio
 * Handles IPC and state synchronization across VS Code Webview, Iframe, and Standalone browser.
 */

import { reactive } from 'vue';
import {
  fetchStorageTables,
  createStorageTable,
  deleteStorageTable,
  fetchStorageVariables,
  createStorageVariable,
  deleteStorageVariable,
  fetchStorageCredentials,
  flushSyncQueue,
} from '../services/storage.service';

export const defaultWorkflow = {
  extVersion: '1.30.02',
  name: 'new-workflow',
  icon: 'riGlobalLine',
  table: [],
  version: '1.30.02',
  drawflow: {
    edges: [],
    zoom: 1.3,
    nodes: [
      {
        position: {
          x: 100,
          y: 504.5,
        },
        id: 'trigger',
        label: 'trigger',
        data: {
          disableBlock: false,
          description: '',
          type: 'manual',
          interval: 60,
          delay: 5,
          date: '',
          time: '00:00',
          url: '',
          shortcut: '',
          activeInInput: false,
          isUrlRegex: false,
          days: [],
          contextMenuName: '',
          contextTypes: [],
          parameters: [],
          preferParamsInTab: false,
          observeElement: {
            selector: '',
            baseSelector: '',
            matchPattern: '',
            targetOptions: {
              subtree: false,
              childList: true,
              attributes: false,
              attributeFilter: [],
              characterData: false,
            },
            baseElOptions: {
              subtree: false,
              childList: true,
              attributes: false,
              attributeFilter: [],
              characterData: false,
            },
          },
        },
        type: 'BlockBasic',
      },
    ],
  },
  settings: {
    publicId: '',
    aipowerToken: '',
    blockDelay: 0,
    saveLog: true,
    debugMode: false,
    restartTimes: 3,
    notification: true,
    execContext: 'popup',
    reuseLastState: false,
    inputAutocomplete: true,
    onError: 'stop-workflow',
    executedBlockOnWeb: false,
    insertDefaultColumn: false,
    defaultColumnName: 'column',
  },
  globalData: '{\n\t"key": "value"\n}',
  description: '',
  includedWorkflows: {},
};

export const sampleWorkflow = defaultWorkflow;

// Check if initial workflow was injected
const getInitialWorkflow = () => {
  if (typeof window !== 'undefined' && window.__AUTOMA_WORKFLOW__) {
    return JSON.parse(JSON.stringify(window.__AUTOMA_WORKFLOW__));
  }
  return JSON.parse(JSON.stringify(defaultWorkflow));
};

export const studioState = reactive({
  currentWorkflow: getInitialWorkflow(),
  activeBlockId: null,
});

/**
 * Dispatch workflow changes to parent hosts (VS Code Webview, Iframe, Standalone Window)
 */
export function notifyWorkflowChange(workflow) {
  const payload = JSON.parse(JSON.stringify(workflow));

  if (typeof window === 'undefined') return;

  // 1. VS Code Webview
  if (typeof window.acquireVsCodeApi === 'function') {
    try {
      const vscode = window.acquireVsCodeApi();
      if (vscode) {
        vscode.postMessage({ type: 'saveWorkflow', data: payload });
      }
    } catch (_) {
      // Ignored
    }
  }

  // 2. Embedded Iframe
  if (window.parent && window.parent !== window) {
    const targetOrigin =
      window.location.origin === 'null' ? '*' : window.location.origin;
    window.parent.postMessage(
      { type: 'automa:workflow-changed', data: payload },
      targetOrigin
    );
  }

  // 3. Standalone Browser Window
  window.dispatchEvent(
    new CustomEvent('automa:workflow-changed', { detail: payload })
  );
}

export function setWorkflowData(newWorkflow) {
  if (!newWorkflow) return;
  const clone = JSON.parse(JSON.stringify(newWorkflow));
  if (!clone.drawflow) {
    clone.drawflow = { nodes: [], edges: [] };
  }
  Object.assign(studioState.currentWorkflow, clone);
}

export const setAutomaWorkflow = setWorkflowData;

// Global API & Window message listener
if (typeof window !== 'undefined') {
  window.setAutomaWorkflow = setWorkflowData;
  window.getAutomaWorkflow = () =>
    JSON.parse(JSON.stringify(studioState.currentWorkflow));

  // Listen to postMessage from parent host with validation
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'automa:set-workflow' || msg.type === 'setWorkflow') {
      setWorkflowData(msg.data || msg.workflow);
    }
  });
}

// In-memory DB interface connected to Storage Service
export const db = {
  workflows: {
    get: async () => studioState.currentWorkflow,
    update: async (_id, data) => {
      Object.assign(studioState.currentWorkflow, data);
      notifyWorkflowChange(studioState.currentWorkflow);
      return studioState.currentWorkflow;
    },
    put: async (data) => {
      setWorkflowData(data);
      notifyWorkflowChange(studioState.currentWorkflow);
      return studioState.currentWorkflow;
    },
    toArray: async () => [studioState.currentWorkflow],
  },
  tables: {
    get: async (id) => {
      const tables = await fetchStorageTables();
      return tables.find((t) => t.id === id) || null;
    },
    add: async (data) => createStorageTable(data),
    put: async (data) => createStorageTable(data),
    delete: async (id) => deleteStorageTable(id),
    toArray: async () => fetchStorageTables(),
  },
  variables: {
    get: async (name) => {
      const vars = await fetchStorageVariables();
      return vars.find((v) => v.name === name || v.id === name) || null;
    },
    add: async (data) => createStorageVariable(data),
    put: async (data) => createStorageVariable(data),
    delete: async (id) => deleteStorageVariable(id),
    toArray: async () => fetchStorageVariables(),
  },
  credentials: {
    toArray: async () => fetchStorageCredentials(),
  },
  settings: {
    get: async () => ({}),
    update: async () => ({}),
  },
  sync: {
    flush: () => flushSyncQueue(),
  },
};

export default db;
