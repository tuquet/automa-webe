import { customAlphabet } from 'nanoid';
import { parseJSON } from '@/utils/helper';
import { getBlocks } from '@/utils/getSharedData';
import { excludeGroupBlocks } from '@/utils/shared';
import { studioState, notifyWorkflowChange } from '../adapters/host-bridge';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 7);

export function useStudioClipboard({ editorInstance, isDirty }) {
  let internalClipboard = null;

  function getSelectedNodes() {
    if (!editorInstance.value) return [];
    const all = editorInstance.value.getNodes?.value || [];
    return all.filter((n) => n.selected);
  }

  function getSelectedEdges() {
    if (!editorInstance.value) return [];
    const all = editorInstance.value.getEdges?.value || [];
    return all.filter((e) => e.selected);
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
    } catch (_) {
      // Ignored
    }
  }

  function copyElements(sourceNodes, sourceEdges, targetPosition) {
    const idMap = new Map();
    const minX = Math.min(...sourceNodes.map((n) => n.position?.x || 0));
    const minY = Math.min(...sourceNodes.map((n) => n.position?.y || 0));

    const newNodes = sourceNodes.map((node) => {
      const newId = nanoid();
      idMap.set(node.id, newId);

      let pos = {
        x: (node.position?.x || 0) + 40,
        y: (node.position?.y || 0) + 40,
      };
      if (
        targetPosition &&
        targetPosition.x !== undefined &&
        targetPosition.y !== undefined
      ) {
        const offsetX = (node.position?.x || 0) - minX;
        const offsetY = (node.position?.y || 0) - minY;
        pos = { x: targetPosition.x + offsetX, y: targetPosition.y + offsetY };
      }

      return {
        ...JSON.parse(JSON.stringify(node)),
        id: newId,
        position: pos,
        selected: true,
      };
    });

    const newEdges = (sourceEdges || []).map((edge) => {
      const newSource = idMap.get(edge.source) || edge.source;
      const newTarget = idMap.get(edge.target) || edge.target;
      return {
        ...JSON.parse(JSON.stringify(edge)),
        id: `vueflow__edge-${newSource}-${newTarget}`,
        source: newSource,
        target: newTarget,
        selected: true,
      };
    });

    return { nodes: newNodes, edges: newEdges };
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
    } catch (_) {
      // Ignored
    }

    if (!clipboardData?.data?.nodes?.length) return;

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

    if (isDirty) isDirty.value = true;
    notifyWorkflowChange(studioState.currentWorkflow);
  }

  function duplicateElements(ctxData) {
    copySelectedElements(ctxData);
    pasteCopiedElements();
  }

  function groupBlocks(ctxData) {
    if (!editorInstance.value) return;

    const nodes = ctxData?.nodes?.length ? ctxData.nodes : getSelectedNodes();
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
    if (ctxData?.position) {
      projectedPos = { ...ctxData.position };
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

    if (isDirty) isDirty.value = true;
    notifyWorkflowChange(studioState.currentWorkflow);
  }

  function ungroupBlocks(ctxData) {
    if (!editorInstance.value) return;

    const nodes = ctxData?.nodes?.length ? ctxData.nodes : getSelectedNodes();
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

    if (isDirty) isDirty.value = true;
    notifyWorkflowChange(studioState.currentWorkflow);
  }

  return {
    copySelectedElements,
    pasteCopiedElements,
    duplicateElements,
    groupBlocks,
    ungroupBlocks,
  };
}
