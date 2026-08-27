/**
 * Storage & API Service for Automa Standalone Studio
 * Implements Repository Pattern with Offline Cache (Dexie dbStorage) and Auto-Sync Queue.
 * 100% Typed consumption from @automa/types/api.
 */

import dbStorage from '@/db/storage';
import {
  getStorageTables as apiGetStorageTables,
  addStorageTable as apiAddStorageTable,
  deleteStorageTable as apiDeleteStorageTable,
  getStorageTableRows as apiGetStorageTableRows,
  addStorageTableRow as apiAddStorageTableRow,
  getStorageVariables as apiGetStorageVariables,
  addStorageVariable as apiAddStorageVariable,
  deleteStorageVariable as apiDeleteStorageVariable,
  getStorageCredentials as apiGetStorageCredentials,
  addStorageCredential as apiAddStorageCredential,
  deleteStorageCredential as apiDeleteStorageCredential,
  listStorageFiles as apiListStorageFiles,
  getBrowsers as apiGetBrowsers,
  createBrowser as apiCreateBrowser,
  deleteBrowser as apiDeleteBrowser,
  killAllBrowsers as apiKillAllBrowsers,
  startBrowser as apiStartBrowserSession,
  stopBrowserSession as apiStopBrowserSession,
  getSystemMetrics as apiGetSystemMetrics,
  getAppSettings as apiGetAppSettings,
  updateAppSettings as apiUpdateAppSettings,
  patchAppSettings as apiPatchAppSettings,
  encryptSecret as apiEncryptSecret,
  getStorageCampaigns as apiGetStorageCampaigns,
  executeCampaign as apiExecuteCampaign,
  abortCampaign as apiAbortCampaign,
  autoDetectBrowsers as apiAutoDetectBrowsers,
  installBrowserBinary as apiInstallBrowserBinary,
  getActiveJobs as apiGetActiveJobs,
  killJob as apiKillJob,
} from '@automa/types/api';

export const DAEMON_BASE_URL = 'http://127.0.0.1:8765';

export function formatApiError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err.trim() || 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    if (err.message) return err.message;
    if (err.error) return err.error;
    if (err.detail) return err.detail;
    try {
      return JSON.stringify(err);
    } catch (_) {
      return String(err);
    }
  }
  return String(err);
}

const SYNC_QUEUE_KEY = '__automa_storage_sync_queue';

function getSyncQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveSyncQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {
    // Ignored
  }
}

export function enqueueSyncAction(action) {
  const queue = getSyncQueue();
  queue.push({
    id: Date.now() + Math.random().toString(36).slice(2, 7),
    timestamp: Date.now(),
    ...action,
  });
  saveSyncQueue(queue);
}

export async function flushSyncQueue() {
  const queue = getSyncQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      if (item.type === 'table:add') {
        const res = await apiAddStorageTable({
          baseUrl: DAEMON_BASE_URL,
          body: item.payload,
        });
        if (res.error) remaining.push(item);
      } else if (item.type === 'table:delete') {
        const res = await apiDeleteStorageTable({
          baseUrl: DAEMON_BASE_URL,
          path: { id: item.id },
        });
        if (res.error) remaining.push(item);
      } else if (item.type === 'variable:add') {
        const res = await apiAddStorageVariable({
          baseUrl: DAEMON_BASE_URL,
          body: item.payload,
        });
        if (res.error) remaining.push(item);
      } else if (item.type === 'variable:delete') {
        const res = await apiDeleteStorageVariable({
          baseUrl: DAEMON_BASE_URL,
          path: { id: item.id },
        });
        if (res.error) remaining.push(item);
      }
    } catch (_) {
      remaining.push(item);
    }
  }
  saveSyncQueue(remaining);
}

// --------------------------------------------------------------------------
// 1. Storage Tables Service (SQLite Database-First)
// --------------------------------------------------------------------------

export async function fetchStorageTables() {
  try {
    const res = await apiGetStorageTables({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
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
  };

  try {
    const res = await apiAddStorageTable({
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
    enqueueSyncAction({ type: 'table:add', payload });
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
    await apiDeleteStorageTable({
      baseUrl: DAEMON_BASE_URL,
      path: { id: tableId },
    });
  } catch (_) {
    enqueueSyncAction({ type: 'table:delete', id: tableId });
  }
  await dbStorage.tablesItems.where('id').equals(tableId).delete();
  await dbStorage.tablesData.where('tableId').equals(tableId).delete();
}

export async function fetchStorageTableRows(tableId) {
  try {
    const res = await apiGetStorageTableRows({
      baseUrl: DAEMON_BASE_URL,
      path: { id: tableId },
    });
    if (res.data && Array.isArray(res.data)) {
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

export async function addStorageTableRow(tableId, rowData) {
  const res = await apiAddStorageTableRow({
    baseUrl: DAEMON_BASE_URL,
    path: { id: tableId },
    body: rowData,
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

// --------------------------------------------------------------------------
// 2. Storage Variables Service
// --------------------------------------------------------------------------

export async function fetchStorageVariables() {
  try {
    const res = await apiGetStorageVariables({ baseUrl: DAEMON_BASE_URL });
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
    const res = await apiAddStorageVariable({
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
    enqueueSyncAction({ type: 'variable:add', payload });
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
    await apiDeleteStorageVariable({
      baseUrl: DAEMON_BASE_URL,
      path: { id: varId },
    });
  } catch (_) {
    enqueueSyncAction({ type: 'variable:delete', id: varId });
  }
  await dbStorage.variables.where('id').equals(varId).delete();
  await dbStorage.variables.where('name').equals(varId).delete();
}

// --------------------------------------------------------------------------
// 3. Storage Credentials & AES Secrets Service
// --------------------------------------------------------------------------

export async function fetchStorageCredentials() {
  try {
    const res = await apiGetStorageCredentials({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (_) {
    // Fallback
  }
  return [];
}

export async function createStorageCredential(credData) {
  const res = await apiAddStorageCredential({
    baseUrl: DAEMON_BASE_URL,
    body: {
      name: credData.name,
      value: credData.value,
      description: credData.description || '',
    },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function deleteStorageCredential(name) {
  const res = await apiDeleteStorageCredential({
    baseUrl: DAEMON_BASE_URL,
    path: { id: name },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function encryptSecretText(secret, passphrase) {
  const res = await apiEncryptSecret({
    baseUrl: DAEMON_BASE_URL,
    body: {
      secret,
      passphrase,
    },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

// --------------------------------------------------------------------------
// 4. Browsers Fleet Service
// --------------------------------------------------------------------------

export async function fetchBrowsers() {
  try {
    const res = await apiGetBrowsers({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (_) {
    // Fallback
  }
  return [];
}

export async function createBrowserProfile(profileData) {
  const res = await apiCreateBrowser({
    baseUrl: DAEMON_BASE_URL,
    body: profileData,
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function deleteBrowserProfile(browserId) {
  const res = await apiDeleteBrowser({
    baseUrl: DAEMON_BASE_URL,
    path: { id: browserId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function launchBrowserSession(browserId) {
  const res = await apiStartBrowserSession({
    baseUrl: DAEMON_BASE_URL,
    path: { id: browserId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function closeBrowserSession(browserId) {
  const res = await apiStopBrowserSession({
    baseUrl: DAEMON_BASE_URL,
    path: { id: browserId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function killAllBrowserProcesses() {
  const res = await apiKillAllBrowsers({ baseUrl: DAEMON_BASE_URL });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function autoDetectHostBrowsers() {
  const res = await apiAutoDetectBrowsers({ baseUrl: DAEMON_BASE_URL });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data || [];
}

export async function downloadChromiumBinary() {
  const res = await apiInstallBrowserBinary({
    baseUrl: DAEMON_BASE_URL,
    body: { browser: 'chromium' },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function setDefaultBrowserProfile(profileId) {
  const res = await apiPatchAppSettings({
    baseUrl: DAEMON_BASE_URL,
    body: {
      browser: {
        default_profile_id: profileId,
      },
    },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function fetchSystemMetrics() {
  try {
    const res = await apiGetSystemMetrics({ baseUrl: DAEMON_BASE_URL });
    if (res.data) return res.data;
  } catch (_) {
    // Ignored
  }
  return null;
}

export async function fetchAppSettings() {
  try {
    const res = await apiGetAppSettings({ baseUrl: DAEMON_BASE_URL });
    if (res.data) return res.data;
  } catch (_) {
    // Ignored
  }
  return null;
}

export async function getDefaultBrowserProfile() {
  try {
    const settings = await fetchAppSettings();
    return settings?.browser?.default_profile_id || null;
  } catch (_) {
    return null;
  }
}

export async function saveAppSettings(settings) {
  const res = await apiUpdateAppSettings({
    baseUrl: DAEMON_BASE_URL,
    body: settings,
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function patchGridMatrixSettings(gridConfig) {
  const res = await apiPatchAppSettings({
    baseUrl: DAEMON_BASE_URL,
    body: { grid: gridConfig },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

// --------------------------------------------------------------------------
// 6. Active Jobs & Campaigns Service
// --------------------------------------------------------------------------

export async function fetchActiveJobs() {
  try {
    const res = await apiGetActiveJobs({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) return res.data;
  } catch (_) {
    // Fallback
  }
  return [];
}

export async function cancelJob(jobId) {
  const res = await apiKillJob({
    baseUrl: DAEMON_BASE_URL,
    path: { job_id: jobId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function fetchStorageCampaigns() {
  try {
    const res = await apiGetStorageCampaigns({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) return res.data;
  } catch (_) {
    // Fallback
  }
  return [];
}

export async function runCampaign(campaignId) {
  const res = await apiExecuteCampaign({
    baseUrl: DAEMON_BASE_URL,
    path: { id: campaignId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function stopCampaign(campaignId) {
  const res = await apiAbortCampaign({
    baseUrl: DAEMON_BASE_URL,
    path: { id: campaignId },
  });
  if (res.error) throw new Error(formatApiError(res.error));
  return res.data;
}

export async function fetchStorageFiles() {
  try {
    const res = await apiListStorageFiles({ baseUrl: DAEMON_BASE_URL });
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (_) {
    // Fallback
  }
  return [];
}
