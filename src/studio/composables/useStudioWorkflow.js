import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import { getWorkflow, saveWorkflow } from '@automa/types/api';
import { nanoid } from 'nanoid';
import {
  studioState,
  setAutomaWorkflow,
  notifyWorkflowChange,
  defaultWorkflow,
} from '../adapters/host-bridge';

/**
 * Sanitizes workflow AST before loading into VueFlow canvas (Permissive Studio Rule).
 * Auto-injects valid nanoids, ensures drawflow structure, and assigns default node types.
 */
export function sanitizeWorkflowAST(raw) {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(defaultWorkflow));
  }

  const clone = JSON.parse(JSON.stringify(raw));

  if (!clone.drawflow) {
    clone.drawflow = { nodes: [], edges: [] };
  }
  if (!Array.isArray(clone.drawflow.nodes)) {
    clone.drawflow.nodes = [];
  }
  if (!Array.isArray(clone.drawflow.edges)) {
    clone.drawflow.edges = [];
  }

  // Create an ID mapping for replacing legacy IDs (e.g. n1 -> nanoid)
  const idMap = new Map();

  clone.drawflow.nodes.forEach((node) => {
    if (!node.id || node.id.startsWith('n') || node.id.length < 5) {
      if (node.label === 'trigger' || node.type === 'trigger') {
        node.id = 'trigger';
      } else {
        const oldId = node.id || 'unknown';
        const newId = nanoid(10);
        idMap.set(oldId, newId);
        node.id = newId;
      }
    }
    if (!node.type) {
      node.type = 'BlockBasic';
    }
    if (!node.data) {
      node.data = { disableBlock: false };
    }
  });

  // Remap edges if any node IDs changed
  if (idMap.size > 0) {
    clone.drawflow.edges.forEach((edge) => {
      if (edge.source && idMap.has(edge.source)) {
        edge.source = idMap.get(edge.source);
      }
      if (edge.target && idMap.has(edge.target)) {
        edge.target = idMap.get(edge.target);
      }
    });
  }

  // Filter out dangling edges whose source or target nodes do not exist
  const validNodeIds = new Set(clone.drawflow.nodes.map((n) => n.id));
  clone.drawflow.edges = clone.drawflow.edges.filter(
    (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
  );

  return clone;
}

export function useStudioWorkflow(automaCoreState) {
  const toast = useToast();
  const currentFilePath = ref('');
  const isDirty = ref(false);

  function loadWorkflowData(data, filePath = '') {
    const sanitized = sanitizeWorkflowAST(data);
    setAutomaWorkflow(sanitized);
    currentFilePath.value = filePath;
    isDirty.value = false;
    notifyWorkflowChange(studioState.currentWorkflow);
  }

  async function loadWorkflowFromStorage(path) {
    if (!automaCoreState?.baseUrl) return;
    try {
      const res = await getWorkflow({
        baseUrl: automaCoreState.baseUrl,
        query: { path },
      });
      if (res.data && res.data.content) {
        loadWorkflowData(res.data.content, path);
        toast.success(`Loaded workflow from ${path}`);
      } else if (res.error) {
        toast.error(`Failed to load workflow: ${res.error.message || 'Error'}`);
      }
    } catch (e) {
      toast.error(`Error loading workflow: ${e.message}`);
    }
  }

  function exportJson() {
    const workflowJson = JSON.stringify(studioState.currentWorkflow, null, 2);
    const blob = new Blob([workflowJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = studioState.currentWorkflow.name || 'workflow';
    a.download = `${name}.automa.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.info('Exported workflow JSON to Downloads');
  }

  async function saveWorkflowToStorage() {
    if (!automaCoreState || automaCoreState.status !== 'online') {
      toast.warning('Automa Core is offline. Exporting JSON file locally...');
      exportJson();
      return;
    }

    if (!currentFilePath.value) {
      // Default to workflow name in root storage
      const name = studioState.currentWorkflow.name || 'untitled';
      currentFilePath.value = `${name}.workflow.json`;
    }

    try {
      const res = await saveWorkflow({
        baseUrl: automaCoreState.baseUrl,
        body: {
          path: currentFilePath.value,
          content: studioState.currentWorkflow,
        },
      });

      if (res.data) {
        isDirty.value = false;
        toast.success(
          `Saved successfully to Storage (${currentFilePath.value})`
        );
      } else if (res.error) {
        toast.error(`Failed to save: ${res.error.message || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error(`Error saving workflow: ${e.message}`);
    }
  }

  function createNewWorkflow() {
    loadWorkflowData(defaultWorkflow, '');
    toast.info('Created new blank workflow');
  }

  return {
    currentFilePath,
    isDirty,
    loadWorkflowData,
    loadWorkflowFromStorage,
    saveWorkflowToStorage,
    exportJson,
    createNewWorkflow,
  };
}
