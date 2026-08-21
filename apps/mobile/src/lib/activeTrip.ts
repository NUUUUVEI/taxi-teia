import { useSyncExternalStore } from 'react'
import * as SecureStore from 'expo-secure-store'

export type Leg = 'toPickup' | 'toDropoff'

export type ActiveTrip = {
  id: string
  leg: Leg
  clientName: string
  pickup: string
  dropoff: string
} | null

const KEY = 'active_trip'

let current: ActiveTrip = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ActiveTrip {
  return current
}

/** Restores an in-progress journey after the app is killed mid-trip. */
export async function hydrateActiveTrip() {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    current = raw ? (JSON.parse(raw) as ActiveTrip) : null
    emit()
  } catch {
    current = null
  }
}

export async function setActiveTrip(next: ActiveTrip) {
  current = next
  emit()
  try {
    if (next) await SecureStore.setItemAsync(KEY, JSON.stringify(next))
    else await SecureStore.deleteItemAsync(KEY)
  } catch {
    // Persistence is a convenience; the in-memory value still drives the UI.
  }
}

export function clearActiveTrip() {
  return setActiveTrip(null)
}

export function useActiveTrip(): ActiveTrip {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
