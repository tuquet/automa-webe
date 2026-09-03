import { ref, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
import DroppedNode from '@/utils/editor/DroppedNode';
import EditorCommands from '@/utils/editor/EditorCommands';
import { GraphLayoutService } from '@/services/graphLayout.service';
import { studioState, notifyWorkflowChange } from '../adapters/host-bridge';

export function useStudioCanvas({ commandManager, isDirty }) {
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
      toast.success('Auto-aligned workflow graph layout');
    } catch (err) {
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
      const blockType = event.dataTransfer.getData('block-type');
      if (!blockType) return;

      const position = editorInstance.value.screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = new DroppedNode(blockType, position).getNode();
      if (!newNode) return;

      if (editorCommands) {
        editorCommands.addNode(newNode);
      } else if (studioState.currentWorkflow?.drawflow?.nodes) {
        studioState.currentWorkflow.drawflow.nodes.push(newNode);
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
