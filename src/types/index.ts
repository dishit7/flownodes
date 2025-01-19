import { Node, Edge } from 'reactflow';

export interface NodeData {
  id: string;
  nodeType: string;
  [key: string]: any;
}

export interface CustomNode extends Node {
  data: NodeData;
}