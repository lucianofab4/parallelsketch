import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { AnalysisResult, DependencyEdge } from '../lib/types'
import { partitionColor } from '../lib/colors'

interface Props {
  result: AnalysisResult
  selectedPartition: number | null
  onEdgeClick?: (edge: DependencyEdge | null) => void
}

function instrPartitionMap(result: AnalysisResult): Map<number, number> {
  const m = new Map<number, number>()
  for (const p of result.partitions) {
    for (const idx of p.instructionIndexes) m.set(idx, p.id)
  }
  return m
}

export default function DependencyGraph({ result, selectedPartition, onEdgeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const ipm = instrPartitionMap(result)

    const nodes: cytoscape.NodeDefinition[] = result.instructions.map(instr => {
      const partId = ipm.get(instr.index) ?? 0
      const color = partitionColor(partId)
      return {
        data: {
          id: `n${instr.index}`,
          label: `#${instr.index}`,
          partId,
          color,
          programId: instr.programId,
        },
      }
    })

    const edges: cytoscape.EdgeDefinition[] = result.dependencyEdges.map((edge, i) => ({
      data: {
        id: `e${i}`,
        source: `n${edge.from}`,
        target: `n${edge.to}`,
        reason: edge.reason,
        account: edge.account,
        edgeColor: edge.reason === 'write-write' ? '#ef4444' : '#f59e0b',
      },
    }))

    cyRef.current?.destroy()

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '12px',
            'font-weight': 700,
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 52,
            'height': 52,
            'border-width': 2,
            'border-color': 'data(color)',
            'border-opacity': 0.4,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': 'data(edgeColor)',
            'target-arrow-color': 'data(edgeColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.7,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#ffffff',
            'border-opacity': 0.9,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 4,
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: edges.length === 0 ? 'circle' : 'cose',
        animate: false,
        padding: 40,
        ...(edges.length > 0 ? {
          idealEdgeLength: 130,
          nodeRepulsion: 450000,
          edgeElasticity: 100,
          nodeOverlap: 20,
          componentSpacing: 80,
          randomize: false,
          numIter: 1000,
          fit: true,
        } : {}),
      } as cytoscape.LayoutOptions,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      minZoom: 0.3,
      maxZoom: 3,
    })

    cyRef.current = cy

    // Edge click → explanation
    cy.on('tap', 'edge', evt => {
      const edge = evt.target as cytoscape.EdgeSingular
      const data = edge.data() as { account: string; reason: DependencyEdge['reason'] }
      const from = parseInt(edge.source().id().replace('n', ''))
      const to = parseInt(edge.target().id().replace('n', ''))

      // Highlight clicked edge
      cy.edges().removeClass('highlighted')
      edge.addClass('highlighted')

      onEdgeClick?.({ from, to, account: data.account, reason: data.reason })
    })

    // Background tap → deselect
    cy.on('tap', evt => {
      if (evt.target === cy) {
        cy.edges().removeClass('highlighted')
        onEdgeClick?.(null)
      }
    })

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dim non-selected nodes/edges when partition is selected
  useEffect(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    const ipm = instrPartitionMap(result)

    cy.nodes().forEach(node => {
      const partId = ipm.get(parseInt(node.id().replace('n', '')))
      node.style('opacity', selectedPartition === null || selectedPartition === partId ? 1 : 0.15)
    })

    cy.edges().forEach(edge => {
      const srcPart = ipm.get(parseInt(edge.source().id().replace('n', '')))
      const tgtPart = ipm.get(parseInt(edge.target().id().replace('n', '')))
      const active =
        selectedPartition === null ||
        selectedPartition === srcPart ||
        selectedPartition === tgtPart
      edge.style('opacity', active ? 0.7 : 0.07)
    })
  }, [selectedPartition, result])

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-200">Grafo de Conflitos</h3>
          <span className="text-xs text-slate-500 ml-1">
            {result.instructions.length} nós · {result.dependencyEdges.length} conflitos
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-red-500 inline-block rounded" />
            write-write (conflito puro)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-500 inline-block rounded" />
            write-read (ordem potencialmente relevante)
          </span>
          <span className="text-slate-600 italic">clique numa aresta</span>
        </div>
      </div>

      <div ref={containerRef} style={{ height: '500px', background: 'transparent' }} />
    </div>
  )
}
