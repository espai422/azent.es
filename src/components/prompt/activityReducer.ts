import type { ClientStreamEvent } from '#/shared/chatStream'
import type { Activity } from './types'

export function reduceActivities(
  activities: Activity[],
  event: ClientStreamEvent,
  now = Date.now(),
): Activity[] {
  switch (event.type) {
    case 'thread.started':
      return [
        ...markActivityDone(activities, 'turn'),
        { id: event.threadId, label: `Thread ${event.threadId.slice(0, 8)}`, state: 'done' },
      ]
    case 'turn.started':
      return [
        ...markActivityDone(activities, 'turn'),
        { id: `turn-started-${now}`, label: 'Codex pensando', state: 'active' },
      ]
    case 'reasoning.completed':
      return appendTextActivity(activities, event.text, `reasoning-${now}`)
    case 'message.completed':
      return appendTextActivity(activities, event.text, `message-${now}`)
    case 'tool.started':
      return [
        ...activities,
        { id: event.id, label: `Ejecutando ${event.tool}`, state: 'active' },
      ]
    case 'tool.completed':
      return activities.map((activity) =>
        activity.id === event.id
          ? { ...activity, label: `${event.tool} completada`, state: 'done' }
          : activity,
      )
    case 'tool.failed':
      return activities.map((activity) =>
        activity.id === event.id
          ? { ...activity, label: `${event.tool}: ${event.error}`, state: 'error' }
          : activity,
      )
    case 'error':
      return [
        ...activities,
        { id: `error-${now}`, label: event.message, state: 'error' },
      ]
    case 'turn.completed': {
      const finalResponse = event.finalResponse.trim()
      const alreadyShown = finalResponse
        ? activities.some((activity) => activity.label === finalResponse)
        : true

      const completedActivities = activities.map((activity) =>
        activity.state === 'active' ? { ...activity, state: 'done' as const } : activity,
      )

      if (alreadyShown) return completedActivities

      return [
        ...completedActivities,
        { id: `complete-${now}`, label: finalResponse, state: 'done' },
      ]
    }
  }
}

function markActivityDone(activities: Activity[], id: string): Activity[] {
  return activities.map((activity) =>
    activity.id === id ? { ...activity, state: 'done' as const } : activity,
  )
}

function appendTextActivity(activities: Activity[], text: string, id: string): Activity[] {
  const label = text.trim()
  return label ? [...activities, { id, label, state: 'done' }] : activities
}
