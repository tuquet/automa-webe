/**
 * Standalone Bridge & Reactive Memory DB for Automa Studio
 * Replaces IndexedDB / chrome.storage with Universal W3C postMessage & window APIs.
 */

import { reactive } from 'vue';

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

class VsCodeHostAdapter {
  constructor() {
    try {
      this.api =
        typeof window !== 'undefined' &&
        typeof window.acquireVsCodeApi === 'function'
          ? window.acquireVsCodeApi()
          : null;
    } catch {
      this.api = null;
    }
  }

  notifyChange(payload) {
    if (this.api) {
      this.api.postMessage({ type: 'saveWorkflow', data: payload });
    }
  }
}

class IframeHostAdapter {
  notifyChange(payload) {
    if (
      typeof window !== 'undefined' &&
      window.parent &&
      window.parent !== window
    ) {
      window.parent.postMessage(
        { type: 'automa:workflow-changed', data: payload },
        '*'
      );
    }
  }
}

class StandaloneHostAdapter {
  notifyChange(payload) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('automa:workflow-changed', { detail: payload })
      );
    }
  }
}

export class HostAdapterRegistry {
  static notifyChange(workflow) {
    const payload = JSON.parse(JSON.stringify(workflow));
    new VsCodeHostAdapter().notifyChange(payload);
    new IframeHostAdapter().notifyChange(payload);
    new StandaloneHostAdapter().notifyChange(payload);
  }
}

export function notifyWorkflowChange(workflow) {
  HostAdapterRegistry.notifyChange(workflow);
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

// Global API
if (typeof window !== 'undefined') {
  window.setAutomaWorkflow = setWorkflowData;
  window.getAutomaWorkflow = () =>
    JSON.parse(JSON.stringify(studioState.currentWorkflow));

  // Listen to postMessage from parent
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'automa:set-workflow' || msg.type === 'setWorkflow') {
      setWorkflowData(msg.data || msg.workflow);
    }
  });
}

// In-memory db mock replacing IndexedDB
export const db = {
  workflows: {
    get: async (id) => studioState.currentWorkflow,
    update: async (id, data) => {
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
    get: async () => null,
    toArray: async () => [],
  },
  variables: {
    get: async () => ({}),
    toArray: async () => [],
  },
  settings: {
    get: async () => ({}),
    update: async () => ({}),
  },
};

export default db;
