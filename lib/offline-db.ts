import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'smart-task-db'
const STORE_NAME = 'action-queue'
const VERSION = 1

export interface OfflineAction {
  id: string
  type: 'CREATE_TASK' | 'MOVE_TASK' | 'EDIT_TASK' | 'ADD_COMMENT' | 'UPDATE_TASK'
  payload: any
  timestamp: number
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (typeof window === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
  const db = await getDB()
  if (!db) return null

  const newAction: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  await db.put(STORE_NAME, newAction)
  return newAction
}

export async function getOfflineActions(): Promise<OfflineAction[]> {
  const db = await getDB()
  if (!db) return []
  return db.getAll(STORE_NAME)
}

export async function deleteOfflineAction(id: string) {
  const db = await getDB()
  if (!db) return
  await db.delete(STORE_NAME, id)
}

export async function clearOfflineActions() {
  const db = await getDB()
  if (!db) return
  await db.clear(STORE_NAME)
}
