import { useState, useCallback } from "react"
import type { IEvent } from "@/components/calendar/interfaces"

export interface RosterSnapshot {
  id: string
  name: string
  timestamp: Date
  weekStart: Date
  weekEnd: Date
  events: IEvent[]
  description?: string
}

/**
 * Manage roster version history for undo/redo and snapshots
 */
export function useRosterHistory(maxSnapshots: number = 20) {
  const [history, setHistory] = useState<RosterSnapshot[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  /**
   * Add a new snapshot to history
   */
  const addSnapshot = useCallback(
    (
      events: IEvent[],
      weekStart: Date,
      weekEnd: Date,
      name?: string,
      description?: string
    ) => {
      const newSnapshot: RosterSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || `Snapshot ${history.length + 1}`,
        timestamp: new Date(),
        weekStart,
        weekEnd,
        events: JSON.parse(JSON.stringify(events)), // Deep copy
        description,
      }

      setHistory((prev) => {
        // Remove any "future" snapshots if we're not at the end
        const newHistory = prev.slice(0, currentIndex + 1)
        newHistory.push(newSnapshot)

        // Keep only the last maxSnapshots
        if (newHistory.length > maxSnapshots) {
          newHistory.shift()
        }

        return newHistory
      })

      setCurrentIndex((prev) => Math.min(prev + 1, maxSnapshots - 1))
    },
    [history.length, currentIndex, maxSnapshots]
  )

  /**
   * Undo to previous snapshot
   */
  const undo = useCallback((): RosterSnapshot | null => {
    if (currentIndex <= 0) return null

    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  /**
   * Redo to next snapshot
   */
  const redo = useCallback((): RosterSnapshot | null => {
    if (currentIndex >= history.length - 1) return null

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  /**
   * Jump to specific snapshot
   */
  const goToSnapshot = useCallback((snapshotId: string): RosterSnapshot | null => {
    const index = history.findIndex((s) => s.id === snapshotId)
    if (index === -1) return null

    setCurrentIndex(index)
    return history[index]
  }, [history])

  /**
   * Get current snapshot
   */
  const getCurrentSnapshot = useCallback((): RosterSnapshot | null => {
    if (currentIndex < 0 || currentIndex >= history.length) return null
    return history[currentIndex]
  }, [currentIndex, history])

  /**
   * Get all snapshots
   */
  const getSnapshots = useCallback(() => history, [history])

  /**
   * Check if can undo
   */
  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  /**
   * Delete specific snapshot
   */
  const deleteSnapshot = useCallback((snapshotId: string) => {
    setHistory((prev) => prev.filter((s) => s.id !== snapshotId))
  }, [])

  return {
    addSnapshot,
    undo,
    redo,
    goToSnapshot,
    getCurrentSnapshot,
    getSnapshots,
    canUndo,
    canRedo,
    clearHistory,
    deleteSnapshot,
    currentIndex,
  }
}
