// components/nodes/InputNode.tsx
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useFlowStore } from '../../../store/store';

interface InputNodeData {
  id: string;
  nodeType: string;
  value: string;
}
// components/nodes/InputNode.tsx
export const InputNode = ({ data }: { data: InputNodeData }) => {
  const updateNodeValue = useFlowStore((state) => state.updateNodeValue);

  return (
    <BaseNode
      id={data.id}
      label="Input"
      outputHandles={[{ id: 'output', position: Position.Right }]}
      style={{ background: '#ffffff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', minWidth: '150px' }}
    >
      <textarea
        value={data.value || ''}
        onChange={(e) => updateNodeValue(data.id, e.target.value)}
        placeholder="Enter input..."
        className="w-full p-2 border rounded"
      />
    </BaseNode>
  );
};