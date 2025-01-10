// components/nodes/LLMNode.tsx
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';

interface LLMNodeData {
  id: string;
  nodeType: string;
}

export const LLMNode = ({ data }: { data: LLMNodeData }) => {
  return (
    <BaseNode
      id={data.id}
      label="LLM (Gemini)"
      inputHandles={[{ id: 'input', position: Position.Left }]}
      outputHandles={[{ id: 'output', position: Position.Right }]}
      style={{ 
        background: '#ffffff', 
        border: '1px solid #4f46e5', 
        borderRadius: '8px', 
        padding: '10px', 
        minWidth: '150px' 
      }}
    >
      <div className="p-2 text-center text-sm text-gray-600">
        Processes input using Gemini API
      </div>
    </BaseNode>
  );
};