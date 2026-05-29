export type DiagramNodeDef = {
  id: string
  label: string
  x: number
  y: number
}

export type DiagramEdgeDef = {
  id?: string
  source: string
  target: string
  label?: string
  highlight?: boolean
}

export type DiagramJSON = {
  nodes: DiagramNodeDef[]
  edges: DiagramEdgeDef[]
}
