
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';

interface OutputNodeData {
  id: string;
  nodeType: string;
  value: string;
}

export const OutputNode = ({ data }: { data: OutputNodeData }) => {
  return (
    <BaseNode
      id={data.id}
      label="Output"
      inputHandles={[{ id: 'input', position: Position.Left }]}
      style={{ background: '#ffffff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', minWidth: '150px' }}
    >
      <div className="p-2 bg-gray-50 rounded min-h-[50px]">
        {data.value || 'Output will appear here...'}
      </div>
    </BaseNode>
  );
};