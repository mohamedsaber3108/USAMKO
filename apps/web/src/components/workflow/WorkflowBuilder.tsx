'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  EdgeTypes,
  NodeTypes
} from 'react-flow-renderer';
import api from '@/lib/api';

// Node types
const nodeTypes: NodeTypes = {
  trigger: ({ data }) => (
    <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Trigger</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
  action: ({ data }) => (
    <div className="bg-green-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Action</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
  delay: ({ data }) => (
    <div className="bg-yellow-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Delay</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
  condition: ({ data }) => (
    <div className="bg-purple-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Condition</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
  loop: ({ data }) => (
    <div className="bg-orange-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Loop</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
  webhook: ({ data }) => (
    <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg">
      <div className="font-bold">Webhook</div>
      <div className="text-sm opacity-80">{data.label}</div>
    </div>
  ),
};

// Initial nodes and edges
const initialNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start Trigger' } },
];

const initialEdges: Edge[] = [];

export default function WorkflowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onInit = useCallback((instance: any) => setReactFlowInstance(instance), []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        position,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const nodeStyles = {
    trigger: 'bg-blue-500',
    action: 'bg-green-500',
    delay: 'bg-yellow-500',
    condition: 'bg-purple-500',
    loop: 'bg-orange-500',
    webhook: 'bg-red-500',
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900">
      {/* Node Palette */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Node Palette</h2>
        <div className="space-y-2">
          {['trigger', 'action', 'delay', 'condition', 'loop', 'webhook'].map((type) => (
            <div
              key={type}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/reactflow', type);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className={`p-3 rounded-lg cursor-grab hover:opacity-80 transition-opacity ${nodeStyles[type as keyof typeof nodeStyles]} text-white`}
            >
              <div className="font-semibold capitalize">{type}</div>
              <div className="text-xs opacity-80">Drag to canvas</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                setNodes([]);
                setEdges([]);
              }}
              className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear Canvas
            </button>
            <button
              onClick={async () => {
                try {
                  const workflowName = prompt('Enter workflow name:');
                  if (!workflowName) return;

                  const workflow = await api.createWorkflow({
                    name: workflowName,
                    description: 'Created from workflow builder',
                    config: {
                      nodes: nodes.map(n => ({
                        id: n.id,
                        type: n.type,
                        position: n.position,
                        data: n.data,
                      })),
                      edges: edges.map(e => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                      })),
                    },
                    status: 'DRAFT',
                  });
                  alert(`Workflow "${workflowName}" saved successfully!`);
                } catch (error: any) {
                  alert('Failed to save workflow: ' + error.message);
                }
              }}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Save Workflow
            </button>
            <button
              onClick={async () => {
                try {
                  if (nodes.length === 0) {
                    alert('Add nodes to the workflow first');
                    return;
                  }

                  // First save as a temporary workflow
                  const workflow = await api.createWorkflow({
                    name: `Temp Workflow ${Date.now()}`,
                    description: 'Temporary workflow for execution',
                    config: {
                      nodes: nodes.map(n => ({
                        id: n.id,
                        type: n.type,
                        position: n.position,
                        data: n.data,
                      })),
                      edges: edges.map(e => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                      })),
                    },
                    status: 'ACTIVE',
                  });

                  // Then execute it
                  await api.executeWorkflow(workflow.id);
                  alert('Workflow execution started! Check workflows page for status.');
                } catch (error: any) {
                  alert('Failed to execute workflow: ' + error.message);
                }
              }}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Execute Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50 dark:bg-gray-900"
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Properties</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Node ID
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              value={nodes.length > 0 ? nodes[0]?.id : 'No node selected'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Node Type
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              value={nodes.length > 0 ? nodes[0]?.type : 'No node selected'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              value={nodes.length > 0 ? nodes[0]?.data?.label : 'No node selected'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}