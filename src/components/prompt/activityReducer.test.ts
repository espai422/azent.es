import { describe, expect, it } from 'vitest'
import { reduceActivities } from './activityReducer'
import type { Activity } from './types'

describe('reduceActivities', () => {
  it('marks turn setup done and appends thread id', () => {
    const activities: Activity[] = [{ id: 'turn', label: 'Preparando turno', state: 'active' }]

    expect(reduceActivities(activities, { type: 'thread.started', threadId: 'thread-123456' })).toEqual([
      { id: 'turn', label: 'Preparando turno', state: 'done' },
      { id: 'thread-123456', label: 'Thread thread-1', state: 'done' },
    ])
  })

  it('updates tool activity when a tool completes', () => {
    const activities: Activity[] = [{ id: 'call-1', label: 'Ejecutando get_page_snapshot', state: 'active' }]

    expect(reduceActivities(activities, {
      type: 'tool.completed',
      id: 'call-1',
      tool: 'get_page_snapshot',
      result: {},
    })).toEqual([
      { id: 'call-1', label: 'get_page_snapshot completada', state: 'done' },
    ])
  })

  it('marks active activities done and appends unseen final response', () => {
    const activities: Activity[] = [{ id: 'call-1', label: 'Ejecutando tool', state: 'active' }]

    expect(reduceActivities(activities, {
      type: 'turn.completed',
      finalResponse: 'Listo',
    }, 123)).toEqual([
      { id: 'call-1', label: 'Ejecutando tool', state: 'done' },
      { id: 'complete-123', label: 'Listo', state: 'done' },
    ])
  })

  it('does not duplicate an already shown final response', () => {
    const activities: Activity[] = [{ id: 'message-1', label: 'Listo', state: 'done' }]

    expect(reduceActivities(activities, {
      type: 'turn.completed',
      finalResponse: 'Listo',
    })).toEqual(activities)
  })
})
