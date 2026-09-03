import { ref, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
import { customAlphabet } from 'nanoid';
import cloneDeep from 'lodash.clonedeep';
import DroppedNode from '@/utils/editor/DroppedNode';
import EditorCommands from '@/utils/editor/EditorCommands';
import { GraphLayoutService } from '@/services/graphLayout.service';
import { studioState, notifyWorkflowChange } from '../adapters/host-bridge';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 7);

export function useStudioCanvas({ commandManager, isDirty, setAnimateBlocks }) {
  const toast = useToast();
  const editorRef = ref(null);
  const editorInstance = ref(null);
  const autoFocusEnabled = ref(true);
  let editorCommands = null;

  function onEditorInit(editor) {
    editorInstance.value = editor;
    editorCommands = new EditorCommands(editor, commandManager);
  }

  async function autoAlign() {
    if (!editorInstance.value) return;
    try {
      setAnimateBlocks?.(true);
      const nodes = studioState.currentWorkflow?.drawflow?.nodes || [];
      const edges = studioState.currentWorkflow?.drawflow?.edges || [];
      if (!nodes.length) return;

      const { nodes: alignedNodes, edges: alignedEdges } =
        GraphLayoutService.layoutWorkflow(nodes, edges, {
          direction: 'LR',
          nodeSpacing: 50,
          rankSpacing: 80,
        });

      if (editorCommands) {
        editorCommands.updateGraph(alignedNodes, alignedEdges);
      } else {
        studioState.currentWorkflow.drawflow.nodes = alignedNodes;
        studioState.currentWorkflow.drawflow.edges = alignedEdges;
      }

      if (isDirty) isDirty.value = true;
      notifyWorkflowChange(studioState.currentWorkflow);

      await nextTick();
      if (editorInstance.value?.fitView) {
        editorInstance.value.fitView({ padding: 0.2, duration: 400 });
      }
      setTimeout(() => {
        setAnimateBlocks?.(false);
      }, 500);
      toast.success('Auto-aligned workflow graph layout');
    } catch (err) {
      setAnimateBlocks?.(false);
      console.error('[StudioCanvas] Auto-align error:', err);
    }
  }

  function onUpdateNode({ id, data }) {
    const nodes = studioState.currentWorkflow?.drawflow?.nodes;
    if (!nodes) return;
    const target = nodes.find((n) => n.id === id);
    if (target) {
      target.data = { ...target.data, ...data };
      if (isDirty) isDirty.value = true;
      notifyWorkflowChange(studioState.currentWorkflow);
    }
  }

  function onDeleteNode(id) {
    if (!studioState.currentWorkflow?.drawflow) return;
    const nodes = studioState.currentWorkflow.drawflow.nodes || [];
    const edges = studioState.currentWorkflow.drawflow.edges || [];

    studioState.currentWorkflow.drawflow.nodes = nodes.filter(
      (n) => n.id !== id
    );
    studioState.currentWorkflow.drawflow.edges = edges.filter(
      (e) => e.source !== id && e.target !== id
    );

    if (isDirty) isDirty.value = true;
    notifyWorkflowChange(studioState.currentWorkflow);
  }

  function onDragoverEditor(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function onDropInEditor(event) {
    event.preventDefault();
    if (!editorInstance.value || !event.dataTransfer) return;

    try {
      const rawBlock =
        event.dataTransfer.getData('block') ||
        event.dataTransfer.getData('block-type');
      if (!rawBlock) return;

      let block;
      try {
        block = JSON.parse(rawBlock);
      } catch (_) {
        block = { id: rawBlock, component: 'BlockBasic', data: {} };
      }

      if (!block || block.fromBlockBasic) return;

      const { target } = event;
      const nodeEl = DroppedNode.isNode(target);
      if (nodeEl) {
        DroppedNode.replaceNode(editorInstance.value, {
          block,
          target: nodeEl,
        });
        if (isDirty) isDirty.value = true;
        notifyWorkflowChange(studioState.currentWorkflow);
        return;
      }

      const position = editorInstance.value.screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = nanoid();
      const newNode = {
        position,
        label: block.id,
        data: cloneDeep(block.data || {}),
        type: block.component || 'BlockBasic',
        id: block.id === 'blocks-group-2' ? `group-${nodeId}` : nodeId,
      };

      if (editorInstance.value.addNodes) {
        editorInstance.value.addNodes([newNode]);
      }
      if (editorCommands && commandManager) {
        commandManager.add(editorCommands.nodeAdded([newNode]));
      }

      if (studioState.currentWorkflow?.drawflow?.nodes) {
        const existing = studioState.currentWorkflow.drawflow.nodes.find(
          (n) => n.id === newNode.id
        );
        if (!existing) {
          studioState.currentWorkflow.drawflow.nodes.push(newNode);
        }
      }

      const edgeEl = DroppedNode.isEdge(target);
      const handleEl = DroppedNode.isHandle(target);

      if (handleEl) {
        DroppedNode.appendNode(editorInstance.value, {
          target: handleEl,
          nodeId: newNode.id,
        });
      } else if (edgeEl) {
        DroppedNode.insertBetweenNode(editorInstance.value, {
          target: edgeEl,
          nodeId: newNode.id,
          outputs: block.outputs,
        });
      }

      if (isDirty) isDirty.value = true;
      notifyWorkflowChange(studioState.currentWorkflow);
    } catch (err) {
      console.error('[StudioCanvas] Drop node error:', err);
    }
  }

  function goToBlock(blockId) {
    if (!editorInstance.value || !blockId) return;
    const node = studioState.currentWorkflow?.drawflow?.nodes?.find(
      (n) => n.id === blockId
    );
    if (node && editorInstance.value.setCenter) {
      editorInstance.value.setCenter(node.position.x, node.position.y, {
        zoom: 1.2,
        duration: 300,
      });
    }
  }

  return {
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
  };
}
