// components/BaseNode.tsx
import { Handle, Position } from 'reactflow';

interface HandleConfig {
  id: string;
  position: Position;
}

interface BaseNodeProps {
  id: string;
  label: string;
  inputHandles?: HandleConfig[];
  outputHandles?: HandleConfig[];
  children?: React.ReactNode;
  style?: React.CSSProperties;  
  childrenStyle?: React.CSSProperties;  
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  label,
  inputHandles = [],
  outputHandles = [],
  children,
  style = {}, 
  childrenStyle = {},
}) => {
  return (
    <div
      className="base-node bg-white border border-gray-300 rounded-lg p-2 min-w-[45px]  "  
      style={style}  
    >
      <div className="node-header text-lg font-semibold">{label}</div>
      <div className="node-content mt-2" style={childrenStyle}>
        {children}
      </div>

      {inputHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="target"
          id={handle.id}
          position={handle.position}
          style={{
            top: inputHandles.length === 1 ? '50%' : `${25 + index * 25}%`,
            background: 'white',
            width: '8px',
            height: '8px',
            border: '2px solid #5e60ce',
          }}
        />
      ))}

      {outputHandles.map((handle) => (
        <Handle
          key={handle.id}
          type="source"
          id={handle.id}
          position={handle.position}
          style={{
            top: '50%',
            background: 'white',
            width: '8px',
            height: '8px',
            border: '2px solid #5e60ce',
          }}
        />
      ))}
    </div>
  );
};
