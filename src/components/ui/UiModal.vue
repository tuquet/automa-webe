<template>
  <Dialog :open="modelValue" @update:open="onUpdateOpen">
    <DialogContent
      :class="[
        'p-5 text-foreground max-h-[85vh] overflow-y-auto',
        contentClass || 'max-w-lg',
      ]"
    >
      <DialogHeader v-if="!customContent && title">
        <DialogTitle
          class="text-sm font-semibold flex items-center justify-between"
        >
          <slot name="header">{{ title }}</slot>
          <slot name="header-append" />
        </DialogTitle>
      </DialogHeader>

      <slot v-if="customContent" :close="closeModal"></slot>
      <div v-else :class="padding || ''">
        <slot :close="closeModal"></slot>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@automa/ui';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  contentClass: {
    type: String,
    default: 'max-w-lg',
  },
  title: {
    type: String,
    default: '',
  },
  padding: {
    type: String,
    default: '',
  },
  customContent: Boolean,
  persist: Boolean,
  blur: Boolean,
  disabledTeleport: Boolean,
});

const emit = defineEmits(['close', 'update:modelValue']);

function closeModal() {
  if (props.persist) return;
  emit('close', false);
  emit('update:modelValue', false);
}

function onUpdateOpen(isOpen) {
  if (!isOpen && props.persist) return;
  emit('update:modelValue', isOpen);
  if (!isOpen) emit('close', false);
}
</script>
