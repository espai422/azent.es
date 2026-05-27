import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

type FlipState = Record<string, boolean>

type FlipAction =
  | { type: 'TOGGLE'; id: string }
  | { type: 'SET'; id: string; value: boolean }
  | { type: 'RESET_ALL' }

function flipReducer(state: FlipState, action: FlipAction): FlipState {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, [action.id]: !state[action.id] }
    case 'SET':
      return { ...state, [action.id]: action.value }
    case 'RESET_ALL':
      return Object.fromEntries(Object.keys(state).map(k => [k, false]))
  }
}

type FlipContextValue = { state: FlipState; dispatch: Dispatch<FlipAction> }

const FlipContext = createContext<FlipContextValue | null>(null)

export function FlipProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flipReducer, {})
  return <FlipContext.Provider value={{ state, dispatch }}>{children}</FlipContext.Provider>
}

export function useFlipContext() {
  const ctx = useContext(FlipContext)
  if (!ctx) throw new Error('useFlipContext must be used within FlipProvider')
  return ctx
}
