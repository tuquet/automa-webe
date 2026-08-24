<template>
  <div id="workflow-edit-block" data-testid="workflow-edit-block" class="scroll h-full overflow-auto px-3 py-1 text-xs">
    <div
      class="sticky top-0 z-20 mb-2 flex items-center space-x-2 bg-white pb-2 pt-1 border-b border-gray-100 dark:border-gray-700/50 dark:bg-gray-800"
    >
      <button data-testid="btn-edit-block-back" class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition" @click="handleClose">
        <v-remixicon name="riArrowLeftLine" size="16" />
      </button>
      <p data-testid="edit-block-title" class="inline-block text-xs font-semibold capitalize text-gray-900 dark:text-gray-100">
        {{ getBlockName() }}
      </p>
      <div class="grow"></div>
      <a
        data-testid="btn-edit-block-docs"
        :title="t('common.docs')"
        :href="`https://docs.extension.automa.site/blocks/${data.id}.html`"
        rel="noopener"
        target="_blank"
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition p-1"
      >
        <v-remixicon name="riInformationLine" size="16" />
      </a>
    </div>
    <component
      ref="componentRef"
      :is="getEditComponent()"
      v-if="blockData"
      :key="data.itemId || data.blockId"
      v-model:data="blockData"
      :block-id="data.blockId"
      v-bind="{
        fullData: data.id === 'conditions' ? data : null,
        editor: data.id === 'conditions' ? editor : null,
        connections: data.id === 'wait-connections' ? data.connections : null,
      }"
    />
  </div>
</template>
<script setup>
import customEditComponents from '@business/blocks/editComponents';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';

const editComponents = require.context(
  './edit',
  false,
  /^(?:.*\/)?Edit[^/]*\.vue$/
);
/* eslint-disable-next-line */
const components = editComponents.keys().reduce((acc, key) => {
  const name = key.replace(/(.\/)|\.vue$/g, '');
  const componentObj = editComponents(key)?.default ?? {};

  acc[name] = componentObj;

  return acc;
}, {});

Object.assign(components, customEditComponents());

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
  editor: {
    type: Object,
    default: () => ({}),
  },
  workflow: {
    type: Object,
    default: () => ({}),
  },
  autocomplete: {
    type: Object,
    default: () => ({}),
  },
  dataChanged: Boolean,
});
const emit = defineEmits(['close', 'update', 'update:autocomplete']);

const { t, te } = useI18n();
const toast = useToast();

const blockData = computed({
  get() {
    return props.data.data;
  },
  set(data) {
    emit('update', data);
  },
});

const componentRef = ref(null);

const blockValidators = {
  'google-sheets': (data) => {
    const { spreadsheetId, type, range } = data || {};
    const isNotCreateAction = !['create', 'add-sheet'].includes(type);
    if (!isNotCreateAction) return true;

    const errors = [];
    if (!spreadsheetId) {
      errors.push(
        t('workflow.blocks.google-sheets.spreadsheetId.required', 'Spreadsheet ID is required')
      );
    }
    if (!range) {
      errors.push(
        t('workflow.blocks.google-sheets.range.required', 'Range is required')
      );
    }
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return false;
    }
    return true;
  },
};

function validateBeforeClose() {
  if (componentRef.value?.validate && typeof componentRef.value.validate === 'function') {
    return componentRef.value.validate();
  }
  const validator = blockValidators[props.data.id];
  if (validator) {
    return validator(blockData.value);
  }
  return true;
}

function handleClose() {
  if (validateBeforeClose()) {
    emit('close');
  }
}

function getEditComponent() {
  const editComp = props.data.editComponent;
  if (typeof editComp === 'object') return editComp;

  return components[editComp];
}
function getBlockName() {
  const key = `workflow.blocks.${props.data.id}.name`;

  return te(key) ? t(key) : props.data.name;
}
</script>
<style>
#workflow-edit-block hr {
  @apply dark:border-gray-700 dark:border-opacity-40 my-4;
}
</style>
