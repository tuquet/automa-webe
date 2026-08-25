<template>
  <storage-file-explorer-inner
    @select="$emit('select', $event)"
    @close="$emit('close')"
  />
</template>

<script setup>
import StorageFileExplorerInner from './components/StorageFileExplorer.vue';

defineEmits(['select', 'close']);
</script>
