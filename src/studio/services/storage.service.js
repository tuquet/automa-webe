/**
 * Storage Service for Automa Standalone Studio
 * Implements Repository Pattern with Offline Cache (Dexie dbStorage) and Auto-Sync Queue.
 */

import dbStorage from '@/db/storage';
import {
  client,
  getTables,
  addTable,
  deleteTable,
  getTableRows,
  getVariables,
  addVariable,
  deleteVariable,
  getCredentials,
  listStorageFiles,
} from '@automa/types/api';

const DAEMON_BASE_URL = 'http://127.0.0.1:8765';
const SYNC_QUEUE_KEY = '__automa_storage_sync_queue';

/**
 * Get current sync queue from localStorage
 */
function getSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Save sync queue to localStorage
 */
function saveSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {
    // Ignored
  }
}

/**
 * Push an action to the sync queue
 */
export function enqueueSyncAction(action) {
  const queue = getSyncQueue();
  queue.push({
    id: Date.now() + Math.random().toString(36).slice(2, 7),
    timestamp: Date.now(),
    ...action,
  });
  saveSyncQueue(queue);
}

/**
 * Process and flush pending sync actions when Daemon is online
 */
export async function flushSyncQueue() {
  const queue = getSyncQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const method = (item.method || 'POST').toLowerCase();
      let res;
      if (method === 'delete') {
        res = await client.delete({
          baseUrl: DAEMON_BASE_URL,
          url: item.endpoint,
        });
      } else if (method === 'patch') {
        res = await client.patch({
          baseUrl: DAEMON_BASE_URL,
          url: item.endpoint,
          body: item.payload,
        });
      } else {
        res = await client.post({
          baseUrl: DAEMON_BASE_URL,
          url: item.endpoint,
          body: item.payload,
        });
      }
      if (res.error) {
        remaining.push(item);
      }
    } catch (_) {
      remaining.push(item);
    }
  }
  saveSyncQueue(remaining);
}

// --------------------------------------------------------------------------
// 1. Storage Tables Service
// --------------------------------------------------------------------------

export async function fetchStorageTables() {
  try {
    const res = await getTables({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      // Sync cache to Dexie
      const items = res.data.map((t) => ({
        id: t.id,
        name: t.name || 'Untitled Table',
        createdAt: t.createdAt || t.created_at || Date.now(),
        modifiedAt: t.modifiedAt || t.modified_at || Date.now(),
        columns: t.columns || [],
      }));
      await dbStorage.tablesItems.clear();
      await dbStorage.tablesItems.bulkPut(items);
      return items;
    }
  } catch (_) {
    // Fallback to cache
  }
  return dbStorage.tablesItems.toArray();
}

export async function createStorageTable(tableData) {
  const payload = {
    name: tableData.name || 'New Table',
    columns: tableData.columns || [],
    items: tableData.items || [],
  };

  try {
    const res = await addTable({
      baseUrl: DAEMON_BASE_URL,
      body: payload,
    });
    if (res.data) {
      const created = res.data;
      const item = {
        id: created.id || String(Date.now()),
        name: created.name || payload.name,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        columns: payload.columns,
      };
      await dbStorage.tablesItems.put(item);
      return item;
    }
  } catch (_) {
    enqueueSyncAction({
      endpoint: '/api/v1/storage/tables',
      method: 'POST',
      payload,
    });
  }

  const localItem = {
    id: `local_${Date.now()}`,
    name: payload.name,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    columns: payload.columns,
  };
  await dbStorage.tablesItems.put(localItem);
  return localItem;
}

export async function deleteStorageTable(tableId) {
  try {
    await deleteTable({
      baseUrl: DAEMON_BASE_URL,
      path: { id: tableId },
    });
  } catch (_) {
    enqueueSyncAction({
      endpoint: `/api/v1/storage/tables/${tableId}`,
      method: 'DELETE',
    });
  }
  await dbStorage.tablesItems.where('id').equals(tableId).delete();
  await dbStorage.tablesData.where('tableId').equals(tableId).delete();
}

export async function fetchStorageTableRows(tableId) {
  try {
    const res = await getTableRows({
      baseUrl: DAEMON_BASE_URL,
      path: { id: tableId },
    });
    if (res.data) {
      return res.data;
    }
  } catch (_) {
    // Fallback to cache
  }
  const cachedData = await dbStorage.tablesData
    .where('tableId')
    .equals(tableId)
    .first();
  return cachedData?.rows || [];
}

// --------------------------------------------------------------------------
// 2. Storage Variables Service
// --------------------------------------------------------------------------

export async function fetchStorageVariables() {
  try {
    const res = await getVariables({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      const items = res.data.map((v) => ({
        id: v.id || v.name || v.key,
        name: v.name || v.key || '',
        value: v.value ?? '',
      }));
      await dbStorage.variables.clear();
      await dbStorage.variables.bulkPut(items);
      return items;
    }
  } catch (_) {
    // Fallback to cache
  }
  return dbStorage.variables.toArray();
}

export async function createStorageVariable(varData) {
  const payload = {
    name: varData.name || varData.key,
    key: varData.key || varData.name,
    value: varData.value ?? '',
  };

  try {
    const res = await addVariable({
      baseUrl: DAEMON_BASE_URL,
      body: payload,
    });
    if (res.data) {
      const created = res.data;
      const item = {
        id: created.id || payload.name,
        name: payload.name,
        value: payload.value,
      };
      await dbStorage.variables.put(item);
      return item;
    }
  } catch (_) {
    enqueueSyncAction({
      endpoint: '/api/v1/storage/variables',
      method: 'POST',
      payload,
    });
  }

  const localItem = {
    id: payload.name,
    name: payload.name,
    value: payload.value,
  };
  await dbStorage.variables.put(localItem);
  return localItem;
}

export async function deleteStorageVariable(varId) {
  try {
    await deleteVariable({
      baseUrl: DAEMON_BASE_URL,
      path: { id: varId },
    });
  } catch (_) {
    enqueueSyncAction({
      endpoint: `/api/v1/storage/variables/${varId}`,
      method: 'DELETE',
    });
  }
  await dbStorage.variables.where('id').equals(varId).delete();
  await dbStorage.variables.where('name').equals(varId).delete();
}

// --------------------------------------------------------------------------
// 3. Storage Credentials Service
// --------------------------------------------------------------------------

export async function fetchStorageCredentials() {
  try {
    const res = await getCredentials({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      const items = res.data.map((c) => ({
        id: c.id || c.name || c.key,
        name: c.name || c.key || '',
        value: c.value ?? '',
      }));
      await dbStorage.credentials.clear();
      await dbStorage.credentials.bulkPut(items);
      return items;
    }
  } catch (_) {
    // Fallback to cache
  }
  return dbStorage.credentials.toArray();
}

// --------------------------------------------------------------------------
// 4. Storage Files Service (List Workflows & Campaigns in Storage)
// --------------------------------------------------------------------------

export async function fetchStorageFiles() {
  try {
    const res = await listStorageFiles({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (_) {
    // Ignored
  }
  return [];
}

// Backward compatibility aliases
export const fetchTables = fetchStorageTables;
export const createTable = createStorageTable;
export const deleteTableService = deleteStorageTable;
export const fetchVariables = fetchStorageVariables;
export const createVariable = createStorageVariable;
export const deleteVariableService = deleteStorageVariable;
export const fetchCredentials = fetchStorageCredentials;
