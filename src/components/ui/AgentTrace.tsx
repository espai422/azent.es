export type TraceStatus = 'running' | 'ok' | 'pending' | 'error'

export interface TraceEntry {
  status: TraceStatus
  name: string
  meta: string
  time: string
}

interface TraceRowProps extends TraceEntry {}

const statusDot: Record<TraceStatus, { color: string; glow: string }> = {
  running: { color: '#FF7333', glow: '0 0 10px rgba(255,90,31,0.6)' },
  ok:      { color: '#2BD27A', glow: 'none' },
  pending: { color: 'var(--ink-6)', glow: 'none' },
  error:   { color: 'var(--danger)', glow: '0 0 8px rgba(242,59,59,0.5)' },
}

export function TraceRow({ status, name, meta, time }: TraceRowProps) {
  const dot = statusDot[status]
  const pulse = status === 'running'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dot.color,
          boxShadow: dot.glow,
          animation: pulse ? 'az-pulse 1.4s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      <span style={{ color: 'var(--fg-primary)', minWidth: 160, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)' }}>
        {name}
      </span>
      <span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)' }}>
        {meta}
      </span>
      <span style={{ marginLeft: 'auto', color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)' }}>
        {time}
      </span>
    </div>
  )
}

interface TracePanelProps {
  traces: TraceEntry[]
  title?: string
}

export function TracePanel({ traces, title = 'agent.run() — production' }: TracePanelProps) {
  return (
    <div
      style={{
        background: 'var(--ink-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      {/* Terminal chrome */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--ink-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3a3a' }} />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color: 'var(--fg-muted)', marginLeft: 12 }}>
            {title}
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--fs-11)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg-accent)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255,90,31,0.10)',
            border: '1px solid rgba(255,90,31,0.30)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#FF7333',
              animation: 'az-pulse 1.6s ease-in-out infinite',
            }}
          />
          LIVE
        </span>
      </div>

      {/* Traces */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {traces.map((t, i) => (
          <TraceRow key={i} {...t} />
        ))}
      </div>
    </div>
  )
}
