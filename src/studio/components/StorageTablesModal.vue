<template>
  <ui-modal
    :model-value="modelValue"
    title="SQLite Storage Tables"
    content-class="max-w-4xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col h-[520px] text-xs text-foreground">
      <!-- Top Navigation & Actions -->
      <div
        class="flex items-center justify-between border-b border-border pb-3"
      >
        <div class="flex items-center gap-2">
          <!-- Select Active Table Dropdown -->
          <div v-if="tables.length > 0" class="flex items-center gap-1.5">
            <span class="font-medium text-muted-foreground text-xs"
              >Table:</span
            >
            <select
              v-model="activeTableId"
              data-testid="select-storage-table"
              class="h-8 px-2.5 py-1 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-medium text-xs text-foreground"
              @change="onTableSelect"
            >
              <option v-for="t in tables" :key="t.id" :value="t.id">
                {{ t.name }} ({{ (t.columns || []).length }} cols)
              </option>
            </select>
          </div>

          <Button
            variant="default"
            size="sm"
            data-testid="btn-add-table"
            @click="showCreateTableForm = !showCreateTableForm"
          >
            <Plus class="size-3.5 mr-1" />
            <span>New Table</span>
          </Button>

          <Button variant="outline" size="sm" @click="loadTables">
            <RefreshCw
              class="size-3.5 mr-1"
              :class="{ 'animate-spin': isLoading }"
            />
            <span>Refresh</span>
          </Button>
        </div>

        <div v-if="activeTable" class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            data-testid="btn-delete-table"
            class="text-destructive hover:bg-destructive/10"
            title="Delete this table permanently"
            @click="onDeleteTable(activeTable.id)"
          >
            <Trash2 class="size-3.5 mr-1" />
            <span class="hidden sm:inline">Delete Table</span>
          </Button>
        </div>
      </div>

      <!-- Create Table Form (Collapsible) -->
      <div
        v-if="showCreateTableForm"
        class="my-3 p-3 rounded-lg bg-muted/40 border border-border space-y-3"
      >
        <h4
          class="font-semibold text-xs text-foreground flex items-center gap-1.5"
        >
          <Table class="size-3.5 text-primary" />
          <span>Create New SQLite Table</span>
        </h4>

        <div class="space-y-2">
          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Table Name *
            </label>
            <Input
              v-model="newTable.name"
              type="text"
              placeholder="e.g. Accounts, Leads, Proxies"
              class="h-8 text-xs"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Columns (comma separated)
            </label>
            <Input
              v-model="newTable.columnsStr"
              type="text"
              placeholder="e.g. email, password, status, proxy"
              class="h-8 text-xs"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="xs"
            @click="showCreateTableForm = false"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="xs"
            :disabled="!newTable.name || isSubmitting"
            @click="onCreateTable"
          >
            Create Table
          </Button>
        </div>
      </div>

      <!-- Table Content Grid Area -->
      <div class="flex-1 overflow-auto mt-3 border border-border rounded-lg">
        <div v-if="isLoading" class="py-16 text-center text-muted-foreground">
          <Loader2 class="size-5 animate-spin inline-block mb-1 text-primary" />
          <p>Loading SQLite tables...</p>
        </div>

        <div
          v-else-if="tables.length === 0"
          class="py-16 text-center text-muted-foreground"
        >
          <Table class="size-8 inline-block mb-1 text-muted-foreground/50" />
          <p class="font-medium text-sm text-foreground">
            No SQLite Tables Found
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            Click "New Table" above to create your first storage table.
          </p>
        </div>

        <table
          v-else-if="activeTable"
          class="w-full text-left border-collapse text-xs"
        >
          <thead>
            <tr
              class="bg-muted/60 border-b border-border text-muted-foreground font-semibold sticky top-0 z-10"
            >
              <th class="p-2.5 w-12 text-center">#</th>
              <th
                v-for="col in activeTable.columns"
                :key="col.name || col"
                class="p-2.5 border-r border-border last:border-r-0"
              >
                {{ typeof col === 'object' ? col.name : col }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-if="tableRows.length === 0">
              <td
                :colspan="(activeTable.columns || []).length + 1"
                class="py-12 text-center text-muted-foreground italic"
              >
                Table is empty.
              </td>
            </tr>
            <tr
              v-for="(row, idx) in tableRows"
              :key="idx"
              class="hover:bg-muted/40 transition"
            >
              <td class="p-2.5 text-center text-muted-foreground font-mono">
                {{ idx + 1 }}
              </td>
              <td
                v-for="col in activeTable.columns"
                :key="col.name || col"
                class="p-2.5 border-r border-border last:border-r-0 truncate max-w-xs"
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
import { Button, Input } from '@automa/ui';
import { Loader2, Plus, RefreshCw, Table, Trash2 } from 'lucide-vue-next';
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
  } catch (_) {
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
