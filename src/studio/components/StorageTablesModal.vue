<template>
  <ui-modal
    :model-value="modelValue"
    title="SQLite Storage Tables"
    content-class="max-w-4xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div
      class="flex flex-col h-[520px] text-xs text-gray-800 dark:text-gray-200"
    >
      <!-- Top Navigation & Actions -->
      <div
        class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3"
      >
        <div class="flex items-center space-x-2">
          <!-- Select Active Table Dropdown -->
          <div v-if="tables.length > 0" class="flex items-center space-x-1.5">
            <span class="font-medium text-gray-500">Table:</span>
            <select
              v-model="activeTableId"
              data-testid="select-storage-table"
              class="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent font-medium"
              @change="onTableSelect"
            >
              <option v-for="t in tables" :key="t.id" :value="t.id">
                {{ t.name }} ({{ (t.columns || []).length }} cols)
              </option>
            </select>
          </div>

          <button
            data-testid="btn-add-table"
            class="px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center space-x-1 transition shadow-xs"
            @click="showCreateTableForm = !showCreateTableForm"
          >
            <v-remixicon name="riAddLine" size="14" />
            <span>New Table</span>
          </button>

          <button
            class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            @click="loadTables"
          >
            <v-remixicon
              name="riRefreshLine"
              size="14"
              :class="{ 'animate-spin': isLoading }"
            />
            <span>Refresh</span>
          </button>
        </div>

        <div v-if="activeTable" class="flex items-center space-x-2">
          <button
            data-testid="btn-add-table-row"
            class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            @click="showAddRowModal = true"
          >
            <v-remixicon name="riAddCircleLine" size="14" />
            <span>+ Add Row</span>
          </button>

          <button
            data-testid="btn-delete-table"
            class="px-2 py-1 text-xs rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition"
            title="Delete this table permanently"
            @click="onDeleteTable(activeTable.id)"
          >
            <v-remixicon name="riDeleteBin7Line" size="14" />
            <span class="hidden sm:inline ml-1">Delete Table</span>
          </button>
        </div>
      </div>

      <!-- Create Table Form (Collapsible) -->
      <div
        v-if="showCreateTableForm"
        class="my-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-3"
      >
        <h4
          class="font-semibold text-xs text-gray-900 dark:text-gray-100 flex items-center"
        >
          <v-remixicon name="riTable2" size="14" class="mr-1 text-accent" />
          Create New SQLite Table
        </h4>

        <div class="space-y-2">
          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Table Name *</label
            >
            <input
              v-model="newTable.name"
              type="text"
              placeholder="e.g. Accounts, Leads, Proxies"
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Columns (comma separated)</label
            >
            <input
              v-model="newTable.columnsStr"
              type="text"
              placeholder="e.g. email, password, status, proxy"
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-1">
          <button
            class="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="showCreateTableForm = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 text-xs rounded-md bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
            :disabled="!newTable.name || isSubmitting"
            @click="onCreateTable"
          >
            Create Table
          </button>
        </div>
      </div>

      <!-- Table Content Grid Area -->
      <div
        class="flex-1 overflow-auto mt-3 border border-gray-200 dark:border-gray-700 rounded-lg"
      >
        <div v-if="isLoading" class="py-16 text-center text-gray-400">
          <v-remixicon
            name="riLoader2Line"
            size="20"
            class="animate-spin inline-block mb-1"
          />
          <p>Loading SQLite tables...</p>
        </div>

        <div
          v-else-if="tables.length === 0"
          class="py-16 text-center text-gray-400"
        >
          <v-remixicon
            name="riTable2"
            size="28"
            class="inline-block mb-1 text-gray-300 dark:text-gray-600"
          />
          <p class="font-medium text-sm">No SQLite Tables Found</p>
          <p class="text-xs text-gray-400 mt-1">
            Click "New Table" above to create your first storage table.
          </p>
        </div>

        <table
          v-else-if="activeTable"
          class="w-full text-left border-collapse text-xs"
        >
          <thead>
            <tr
              class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-semibold sticky top-0 z-10"
            >
              <th class="p-2.5 w-12 text-center">#</th>
              <th
                v-for="col in activeTable.columns"
                :key="col.name || col"
                class="p-2.5 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {{ typeof col === 'object' ? col.name : col }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="tableRows.length === 0">
              <td
                :colspan="(activeTable.columns || []).length + 1"
                class="py-12 text-center text-gray-400 italic"
              >
                Table is empty. Click "+ Add Row" to insert data.
              </td>
            </tr>
            <tr
              v-for="(row, idx) in tableRows"
              :key="idx"
              class="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition"
            >
              <td class="p-2.5 text-center text-gray-400 font-mono">
                {{ idx + 1 }}
              </td>
              <td
                v-for="col in activeTable.columns"
                :key="col.name || col"
                class="p-2.5 border-r border-gray-100 dark:border-gray-800 last:border-r-0 truncate max-w-xs"
              >
                {{ row[typeof col === 'object' ? col.name : col] ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </ui-modal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import {
  fetchStorageTables,
  createStorageTable,
  deleteStorageTable,
  fetchStorageTableRows,
} from '../services/storage.service';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
const toast = useToast();

const tables = ref([]);
const activeTableId = ref('');
const tableRows = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showCreateTableForm = ref(false);

const newTable = reactive({
  name: '',
  columnsStr: 'email, status',
});

const activeTable = computed(() => {
  return tables.value.find((t) => t.id === activeTableId.value);
});

async function loadRows(tableId) {
  try {
    tableRows.value = await fetchStorageTableRows(tableId);
  } catch (err) {
    tableRows.value = [];
  }
}

async function loadTables() {
  isLoading.value = true;
  try {
    tables.value = await fetchStorageTables();
    if (tables.value.length > 0 && !activeTableId.value) {
      activeTableId.value = tables.value[0].id;
    }
    if (activeTableId.value) {
      await loadRows(activeTableId.value);
    }
  } catch (err) {
    toast.error(`Failed to load tables: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function onTableSelect() {
  if (activeTableId.value) {
    await loadRows(activeTableId.value);
  }
}

async function onCreateTable() {
  if (!newTable.name) return;
  isSubmitting.value = true;
  try {
    const cols = newTable.columnsStr
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const created = await createStorageTable({
      name: newTable.name,
      columns: cols,
    });
    toast.success('Table created successfully!');
    newTable.name = '';
    showCreateTableForm.value = false;
    await loadTables();
    activeTableId.value = created.id;
    await loadRows(created.id);
  } catch (err) {
    toast.error(`Create table failed: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function onDeleteTable(id) {
  try {
    await deleteStorageTable(id);
    toast.success('Table deleted.');
    activeTableId.value = '';
    await loadTables();
  } catch (err) {
    toast.error(`Delete failed: ${err.message}`);
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadTables();
  }
);

onMounted(() => {
  if (props.modelValue) loadTables();
});
</script>
