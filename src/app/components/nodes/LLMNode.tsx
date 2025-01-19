// components/nodes/LLMNode.tsx
import { useCallback } from 'react';
import { Position, Handle } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useFlowStore } from '@/store/store';

interface LLMNodeData {
  id: string;
  nodeType: 'llm';
  systemInstructions: string;
  promptTemplate: string;
  variables: string[];
}

export const LLMNode = ({ data }: { data: LLMNodeData }) => {
  const updateNodeField = useFlowStore((state) => state.updateNodeField);

  // Extract variables from prompt template
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g) || [];
    return matches.map((match) => match.slice(1, -1));
  };

  // Update prompt template and handle variables
  const handlePromptChange = useCallback(
    (value: string) => {
      const newVariables = extractVariables(value);
      updateNodeField(data.id, 'promptTemplate', value);
      updateNodeField(data.id, 'variables', newVariables);
    },
    [data.id, updateNodeField]
  );

  // Update system instructions
  const handleSystemInstructionsChange = useCallback(
    (value: string) => {
      updateNodeField(data.id, 'systemInstructions', value);
    },
    [data.id, updateNodeField]
  );

  return (
    <BaseNode
      id={data.id}
      label="LLM (Gemini)"
      style={{
        background: '#ffffff',
        border: '1px solid #4f46e5',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '300px',
      }}
    >
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Instructions
        </label>
        <textarea
          value={data.systemInstructions || ''}
          onChange={(e) => handleSystemInstructionsChange(e.target.value)}
          className="w-full p-2 text-sm border rounded"
          rows={3}
          placeholder="Enter system instructions..."
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prompt Template
        </label>
        <textarea
          value={data.promptTemplate || ''}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="w-full p-2 text-sm border rounded"
          rows={4}
          placeholder="Enter prompt with {variables}..."
        />
      </div>

      {/* Dynamic Input Handles for Variables */}
      <div
        style={{
          position: 'relative',
          minHeight: `${(data.variables?.length || 0) * 40}px`, // Fallback to 0 if variables are undefined
        }}
      >
        {data.variables?.map((variable, index) => (
          <Handle
            key={variable}
            type="target"
            position={Position.Left}
            id={`var-${variable}`}
            style={{
            top: `${(index + 1) * 40}px`,  
            background: 'white',
            width: '8px',
            height: '8px',
            border: '2px solid #5e60ce',
            }}
          >
            <span
              className="absolute text-xs"
              style={{
                left: '-80px', // Position label left of the handle
                top: '-4px', // Center align vertically with the handle
                color: '#4f46e5',
              }}
            >
              {variable}
            </span>
          </Handle>
        ))}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          top: '50%',
          right: '-10px',
          background: 'white',
          width: '8px',
          height: '8px',
          border: '2px solid #5e60ce'
        }}
      />
    </BaseNode>
  );
};
