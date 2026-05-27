import { useFlipContext } from './FlipProvider'

export function useFlipControls() {
  const { state, dispatch } = useFlipContext()
  return {
    toggle:    (id: string)               => dispatch({ type: 'TOGGLE', id }),
    set:       (id: string, value: boolean) => dispatch({ type: 'SET', id, value }),
    resetAll:  ()                          => dispatch({ type: 'RESET_ALL' }),
    isFlipped: (id: string)               => state[id] ?? false,
  }
}
