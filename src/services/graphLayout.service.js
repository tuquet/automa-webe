import dagre from 'dagre';

export class GraphLayoutService {
  static computeDagreLayout(nodes = [], edges = [], options = {}) {
    const {
      rankdir = 'LR',
      ranksep = 80,
      nodesep = 40,
      ranker = 'tight-tree',
      defaultWidth = 180,
      defaultHeight = 80,
    } = options;

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir,
      ranksep,
      nodesep,
      ranker,
    });
    graph._isMultigraph = true;
    graph.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      if (node.label === 'blocks-group-2' || node.parentNode) return;
      const width = node.dimensions?.width || defaultWidth;
      const height = node.dimensions?.height || defaultHeight;
      graph.setNode(node.id, {
        label: node.label,
        width,
        height,
      });
    });

    edges.forEach((edge) => {
      if (edge.source && edge.target) {
        graph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(graph);

    return nodes
      .map((node) => {
        if (node.label === 'blocks-group-2' || node.parentNode) return null;
        const nodeWithPosition = graph.node(node.id);
        if (!nodeWithPosition) return null;

        const width = node.dimensions?.width || defaultWidth;
        const height = node.dimensions?.height || defaultHeight;

        return {
          id: node.id,
          type: 'position',
          position: {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
          },
        };
      })
      .filter(Boolean);
  }
}
