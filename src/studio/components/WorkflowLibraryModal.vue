<template>
  <div
    class="storage-file-explorer flex flex-col h-[520px] text-xs text-foreground"
  >
    <!-- Search and Action Bar -->
    <div class="flex items-center gap-2 pb-3 border-b border-border">
      <div class="relative flex-1 flex items-center">
        <Search class="size-3.5 absolute left-2.5 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search workflows & campaigns in Storage..."
          class="w-full pl-8 pr-3 h-8 text-xs"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        title="Refresh Storage Files List"
        @click="loadFiles"
      >
        <RefreshCw
          class="size-3.5 mr-1"
          :class="{ 'animate-spin': isLoading }"
        />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>

    <!-- Files List Area -->
    <div class="flex-1 overflow-y-auto py-3 space-y-4">
      <div v-if="isLoading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="size-5 animate-spin inline-block mb-1 text-primary" />
        <p>Loading Storage workspace files...</p>
      </div>

      <div
        v-else-if="filteredFiles.length === 0"
        class="py-12 text-center text-muted-foreground"
      >
        <FolderOpen class="size-6 inline-block mb-2 text-muted-foreground/60" />
        <p class="font-medium">No matching files found in Storage</p>
        <p class="text-[11px] text-muted-foreground mt-1">
          Make sure automa-core is running and files exist in workspace
        </p>
      </div>

      <div v-else class="space-y-3">
        <!-- Workflows Section -->
        <div v-if="workflows.length > 0">
          <div
            class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1"
          >
            <GitBranch class="size-3.5 text-primary" />
            <span>Workflows ({{ workflows.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-1.5">
            <div
              v-for="file in workflows"
              :key="file.path"
              class="p-2.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-2xs transition flex items-center justify-between group cursor-pointer"
              @click="$emit('select', file)"
            >
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  class="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"
                >
                  <GitBranch class="size-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="font-medium text-xs text-foreground truncate group-hover:text-primary transition"
                  >
                    {{ file.name }}
                  </span>
                  <span
                    class="text-[11px] text-muted-foreground font-mono truncate"
                  >
                    {{ file.relative_path }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <Button
                  variant="default"
                  size="xs"
                  @click.stop="$emit('select', file)"
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Campaigns Section -->
        <div v-if="campaigns.length > 0">
          <div
            class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 pt-2"
          >
            <Users class="size-3.5 text-emerald-500" />
            <span>Campaigns ({{ campaigns.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-1.5">
            <div
              v-for="file in campaigns"
              :key="file.path"
              class="p-2.5 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:shadow-2xs transition flex items-center justify-between group"
            >
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  class="size-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"
                >
                  <Users class="size-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-medium text-xs text-foreground truncate">
                    {{ file.name }}
                  </span>
                  <span
                    class="text-[11px] text-muted-foreground font-mono truncate"
                  >
                    {{ file.relative_path }}
                  </span>
                </div>
              </div>

              <Badge variant="success" class="text-[10px]"> Campaign </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Bar -->
    <div
      class="pt-3 border-t border-border flex items-center justify-between text-muted-foreground"
    >
      <span class="text-[11px]">
        Total: {{ filteredFiles.length }} file(s) in Storage
      </span>
      <Button variant="outline" size="sm" @click="$emit('close')">
        Close
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Badge, Button, Input } from '@automa/ui';
import {
  FolderOpen,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-vue-next';
import { fetchStorageFiles } from '../services/storage.service';

defineEmits(['select', 'close']);

const files = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);

async function loadFiles() {
  isLoading.value = true;
  try {
    const list = await fetchStorageFiles();
    files.value = Array.isArray(list) ? list : [];
  } catch (_) {
    files.value = [];
  } finally {
    isLoading.value = false;
  }
}

const filteredFiles = computed(() => {
  if (!searchQuery.value.trim()) return files.value;
  const q = searchQuery.value.toLowerCase().trim();
  return files.value.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.relative_path.toLowerCase().includes(q)
  );
});

const workflows = computed(() =>
  filteredFiles.value.filter((f) => f.file_type === 'workflow')
);

const campaigns = computed(() =>
  filteredFiles.value.filter((f) => f.file_type === 'campaign')
);

onMounted(() => {
  loadFiles();
});
</script>
