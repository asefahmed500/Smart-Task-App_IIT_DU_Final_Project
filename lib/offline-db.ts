import { openDB, IDBPDatabase } from "idb"

const DB_NAME = "smart-task-db"
const STORE_NAME = "action-queue"
const VERSION = 3

export interface OfflineAction {
  id: string
  type: "CREATE_TASK" | "MOVE_TASK" | "EDIT_TASK" | "ADD_COMMENT" | "UPDATE_TASK" | "TOGGLE_CHECKLIST_ITEM"
  payload: any
  timestamp: number
  retryCount?: number
  errorMsg?: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (typeof window === "undefined") return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("timestamp", "timestamp")
        } else {
          // v2 → v3 migration: add the timestamp index so the queue can be
          // read back in FIFO order (indexedDB get() order is by key, not by
          // insertion time).
          // createIndex is only exposed on versionchange transactions
          const existing = db.transaction(STORE_NAME, "versionchange").objectStore(STORE_NAME)
          if (existing && !existing.indexNames.contains("timestamp")) {
            existing.createIndex("timestamp", "timestamp")
          }
        }
      },
    })
  }
  return dbPromise
}

export async function addOfflineAction(
  action: Omit<OfflineAction, "id" | "timestamp">
) {
  const db = await getDB()
  if (!db) return null

  const newAction: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retryCount: 0,
  }

  await db.put(STORE_NAME, newAction)
  return newAction
}

export async function getOfflineActions(): Promise<OfflineAction[]> {
  const db = await getDB()
  if (!db) return []
  // FIFO: oldest action first (timestamp index ascending)
  return db.getAllFromIndex(STORE_NAME, "timestamp")
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

export async function updateOfflineAction(
  id: string,
  updates: Partial<Pick<OfflineAction, "retryCount" | "errorMsg">>
) {
  const db = await getDB()
  if (!db) return
  const action = await db.get(STORE_NAME, id)
  if (action) {
    const updated = { ...action, ...updates }
    await db.put(STORE_NAME, updated)
  }
}
