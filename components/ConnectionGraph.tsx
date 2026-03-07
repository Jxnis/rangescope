'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GraphNode, GraphLink } from '@/types';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ConnectionGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function ConnectionGraph({ nodes, links }: ConnectionGraphProps) {
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isSingleNode = nodes.length === 1 && links.length === 0;

  useEffect(() => {
    // Update dimensions based on container size
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = Math.max(320, containerRef.current.offsetWidth || 800);
        const height = Math.max(600, Math.min(800, width * 0.75));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!graphRef.current || isSingleNode) return;

    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 40);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [nodes, links, isSingleNode]);

  if (nodes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8">
        <p className="text-center text-muted-foreground">No connections to visualize</p>
      </div>
    );
  }

  if (isSingleNode) {
    const node = nodes[0];
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-heading mb-4">Connection Graph</h3>
        <div className="rounded-xl overflow-hidden bg-background border border-border min-h-[600px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-8 h-8 rounded-full border-2 border-white"
              style={{ backgroundColor: node.color }}
            />
            <div className="text-sm font-mono">{node.label}</div>
            <p className="text-xs text-muted-foreground">No counterparties found for this address.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-lg font-heading mb-4">Connection Graph</h3>
      <div ref={containerRef} className="rounded-xl overflow-hidden bg-background border border-border">
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes, links }}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => {
            const n = node as GraphNode;
            return `
              <div style="background: rgba(0,0,0,0.9); color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${n.label}</div>
                ${n.entity ? `<div style="color: #999;">${n.entity}</div>` : ''}
                <div style="color: ${n.color}; margin-top: 4px;">Risk: ${n.risk}</div>
                ${n.isSanctioned ? '<div style="color: #ef4444; margin-top: 4px;">⚠️ SANCTIONED</div>' : ''}
              </div>
            `;
          }}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const n = node as GraphNode & { x?: number; y?: number };
            if (n.x == null || n.y == null) return;

            const label = n.label;
            const fontSize = n.isRoot ? 14 / globalScale : 12 / globalScale;
            const nodeSize = n.isRoot ? 8 : n.isSanctioned ? 6 : 5;

            // Draw node circle
            ctx.beginPath();
            ctx.arc(n.x, n.y, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = n.color;
            ctx.fill();

            // Draw border for root/sanctioned
            if (n.isRoot || n.isSanctioned) {
              ctx.strokeStyle = n.isSanctioned ? '#ef4444' : '#fff';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Draw label
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = n.isRoot ? n.color : '#999';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, n.x, n.y + nodeSize + fontSize);
          }}
          linkLabel={(link: any) => {
            const l = link as GraphLink;
            return `
              <div style="background: rgba(0,0,0,0.9); color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px;">
                <div style="text-transform: capitalize;">${l.label}</div>
                ${l.usdVolume ? `<div style="color: #999; margin-top: 2px;">$${l.usdVolume.toLocaleString()}</div>` : ''}
              </div>
            `;
          }}
          linkColor={() => '#444'}
          linkWidth={1.5}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          onEngineStop={() => graphRef.current?.zoomToFit(300, 40)}
        />
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-foreground border-2 border-white" />
          <span>Root Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500" />
          <span>Sanctioned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>Counterparty</span>
        </div>
      </div>
    </div>
  );
}
