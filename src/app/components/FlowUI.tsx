// components/FlowUI.tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowInstance } from 'reactflow';
import { useFlowStore } from '../../../store/store';
import 'reactflow/dist/style.css'; 
import { RunButton } from './RunButton';  // Import RunButton
import { InputNode } from './InputNode';
import { OutputNode } from './OutputNode';
import { LLMNode } from './LLMNode';

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  llm:LLMNode
};

export const FlowUI = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Fix: Use individual selectors instead of a combined selector
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const onNodesChange = useFlowStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
  const onConnect = useFlowStore((state) => state.onConnect);

  // Add your runPipeline functionality here
 const runPipeline = useCallback(async () => {
  const currentNodes = nodes;
  const currentEdges = edges;

  const inputNodes = currentNodes.filter((node) => node.type === 'input');
  const inputValues = inputNodes.map((node) => ({
    id: node.id,
    value: node.data.value || '',
  }));

  try {
    const response = await fetch('http://localhost:8000/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodes: currentNodes,
        edges: currentEdges,
        inputs: inputValues,
      }),
    });

    const result = await response.json();
    alert(result.data)

    const newNodes = currentNodes.map((node) => {
      if (node.type === 'output' && result[node.id]) {
        return {
          ...node,
          data: {
            ...node.data,
            value: result[node.id],
          },
        };
      }
      return node;
    });

    // Ensure to use 'add' and 'remove' instead of 'replace'
    onNodesChange([
      {
        type: 'remove',
        ids: currentNodes.map(node => node.id), // Remove all nodes first
      },
      {
        type: 'add',
        items: newNodes, // Add updated nodes
      },
    ]);
  } catch (error) {
    console.error('Error running pipeline:', error);
  }
}, [nodes, edges, onNodesChange]);

  // Handle node drag-and-drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');
      
      if (!data) return;
      
      const appData = JSON.parse(data);
      const type = appData?.nodeType; 

      if (!type) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const nodeID = `${type}-${new Date().getTime()}`;
      const newNode = {
        id: nodeID,
        type,
        position,
        data: { id: nodeID, nodeType: type },
      };

      useFlowStore.getState().addNode(newNode); // Adding the new node
    },
    [reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div ref={reactFlowWrapper} className="h-[70vh] w-full" style={{ width: '100%', height: '70vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      {/* Add the RunButton to trigger pipeline */}
      <RunButton onRun={runPipeline} />
    </div>
  );
};
