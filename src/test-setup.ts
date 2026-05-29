import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// ReactFlow (@xyflow/react) requires ResizeObserver, DOMMatrixReadOnly, and
// HTMLElement geometry APIs that jsdom does not implement. Polyfill them so
// that smoke tests of components wrapping ReactFlow do not crash on mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  class DOMMatrixReadOnlyMock {
    m22 = 1
    constructor(_init?: string | number[]) {}
  }
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly
}

afterEach(cleanup)
