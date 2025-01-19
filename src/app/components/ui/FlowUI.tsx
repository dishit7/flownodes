// components/FlowUI.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowInstance } from 'reactflow';
import { useFlowStore } from '@/store/store';
import 'reactflow/dist/style.css';
import { RunButton } from './RunButton';  
import { InputNode } from '../nodes/InputNode';
import { OutputNode } from '../nodes/OutputNode';
import { LLMNode } from '../nodes/LLMNode';
import {GmailSearchNode} from '../nodes/GmailSearchNode'
import { SendMailNode } from '../nodes/SendMailNode';
import { FileUploadNode } from '../nodes/FileUplaodNode';
  
const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  llm: LLMNode,
  'mail-search': GmailSearchNode,
  'mail-send': SendMailNode,
  file:FileUploadNode
};

interface Node {
  id: string;
  type: string;
  data: {
    value?: string | number;
    [key: string]: any;
  };
}
 

export const FlowUI = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Get store actions and state
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
      console.log( `${process.env.NEXT_PUBLIC_API_URL}`)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/process`, {
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
     
       const { updateNodeValue } = useFlowStore.getState();
    Object.entries(result).forEach(([nodeId, value]) => {
      updateNodeValue(nodeId, String(value));
    });

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

       

      onNodesChange([
        {
          //@ts-ignore
          type: 'replace',  
          items: newNodes,
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
      const nodeData =
      type === 'mail'
        ? {
            id: nodeID,
            nodeType: type,
            searchQuery: '',
            maxResults: 5,
            isAuthorized: false,
          }
        : { id: nodeID, nodeType: type };

      
      const newNode = {
        id: nodeID,
        type,
        position,
        data: nodeData
      };

      useFlowStore.getState().addNode(newNode); // Adding the new node
    },
    [reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // useEffect for restoring flow state after authentication
 useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const authSuccess = searchParams.get('authSuccess');
  
  if (authSuccess) {
    const savedState = localStorage.getItem('flowState');
    if (savedState) {
      const { nodes: savedNodes, edges: savedEdges, pendingAuthNodeId } = JSON.parse(savedState);
      
      // Update the authorized node
      const updatedNodes = savedNodes.map((node:Node)=> 
        node.id === pendingAuthNodeId 
          ? { ...node, data: { ...node.data, isAuthorized: true }} 
          : node
      );
      
      // Use the new actions to update state
      useFlowStore.getState().setNodes(updatedNodes);
      useFlowStore.getState().setEdges(savedEdges);
      
      localStorage.removeItem('flowState');
    }
  }
}, []);


  return (
    <div ref={reactFlowWrapper} className="h-[70vh] w-full mt-[130px]" style={{ width: '100%',  height: 'calc(100vh - 130px)'}}>
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
