/**
 * Host Bridge & Adapters for Automa Studio
 * Handles IPC and state synchronization across VS Code Webview, Iframe, and Standalone browser.
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

// Singleton instance for VS Code Webview API (acquireVsCodeApi can only be called once per session)
let vsCodeApiInstance = null;
function getVsCodeApi() {
  if (
    !vsCodeApiInstance &&
    typeof window !== 'undefined' &&
    typeof window.acquireVsCodeApi === 'function'
  ) {
    try {
      vsCodeApiInstance = window.acquireVsCodeApi();
    } catch (_) {
      // Ignored
    }
  }
  return vsCodeApiInstance;
}

/**
 * Dispatch workflow changes to parent hosts (VS Code Webview, Iframe, Standalone Window)
 */
export function notifyWorkflowChange(workflow) {
  const payload = JSON.parse(JSON.stringify(workflow));

  if (typeof window === 'undefined') return;

  // 1. VS Code Webview (standardized to automa:workflow-changed)
  const vscode = getVsCodeApi();
  if (vscode) {
    vscode.postMessage({ type: 'automa:workflow-changed', data: payload });
  }

  // 2. Embedded Iframe
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      { type: 'automa:workflow-changed', data: payload },
      '*'
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
  for (const key of Object.keys(studioState.currentWorkflow)) {
    if (!(key in clone)) {
      delete studioState.currentWorkflow[key];
    }
  }
  Object.assign(studioState.currentWorkflow, clone);
}

export const setAutomaWorkflow = setWorkflowData;

// Global API & Window message listener
if (typeof window !== 'undefined') {
  window.setAutomaWorkflow = setWorkflowData;
  window.getAutomaWorkflow = () =>
    JSON.parse(JSON.stringify(studioState.currentWorkflow));
}
