<template>
  <ui-expand
    :data-testid="`block-category-${category?.name || 'blocks'}`"
    hide-header-icon
    header-class="flex items-center py-1.5 focus:ring-0 w-full text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
  >
    <template #header="{ show }">
      <span :class="category?.color || 'bg-accent'" class="h-2.5 w-2.5 rounded-full"></span>
      <p class="ml-2 flex-1 capitalize text-xs font-semibold">
        {{ category?.name || 'Blocks' }}
      </p>
      <v-remixicon :name="show ? 'riSubtractLine' : 'riAddLine'" size="16" />
    </template>
    <div class="mb-3 grid grid-cols-2 gap-1.5">
      <div
        v-for="block in blocks"
        :key="block.id"
        :data-testid="`block-item-${block.id}`"
        :title="getBlockTitle(block)"
        draggable="true"
        class="bg-input group relative cursor-move select-none rounded-md p-2.5 transition hover:shadow-sm"
        @dragstart="$event.dataTransfer.setData('block', JSON.stringify(block))"
      >
        <div
          class="invisible absolute right-1.5 top-1.5 flex items-center text-gray-500 group-hover:visible dark:text-gray-400"
        >
          <a
            :data-testid="`btn-docs-block-${block.id}`"
            :href="`https://docs.extension.automa.site/blocks/${block.id}.html`"
            :title="t('common.docs')"
            target="_blank"
            rel="noopener"
          >
            <v-remixicon name="riInformationLine" size="14" />
          </a>
          <span
            :data-testid="`btn-pin-block-${block.id}`"
            :title="`${pinned.includes(block.id) ? 'Unpin' : 'Pin'} block`"
            class="ml-1 cursor-pointer"
            @click="$emit('pin', block)"
          >
            <v-remixicon
              size="14"
              :name="
                pinned.includes(block.id) ? 'riPushpin2Fill' : 'riPushpin2Line'
              "
            />
          </span>
        </div>
        <img
          v-if="block.icon.startsWith('http')"
          :src="block.icon"
          alt=""
          width="20"
          class="mb-1.5 dark:invert"
        />
        <v-remixicon
          v-else
          :path="getIconPath(block.icon)"
          :name="block.icon"
          size="20"
          class="mb-1.5 text-gray-700 dark:text-gray-200"
        />
        <p class="text-overflow capitalize leading-tight text-xs font-medium text-gray-800 dark:text-gray-200">
          {{ block.name }}
        </p>
        <div
          v-if="block.tag"
          class="flex items-center justify-center absolute top-0 right-0 min-w-[42px] h-[18px] group-hover:invisible rounded-tr-md rounded-bl-[16px] rounded-tl-0 rounded-br-0 bg-[#79FFEB] dark:bg-[#2DD4BF] text-[10px] font-semibold dark:text-gray-900"
        >
          {{ block.tag }}
        </div>
      </div>
    </div>
  </ui-expand>
</template>
<script setup>
import { getBlocks } from '@/utils/getSharedData';
import { useI18n } from 'vue-i18n';

defineProps({
  category: {
    type: Object,
    default: () => ({}),
  },
  blocks: {
    type: Array,
    default: () => [],
  },
  pinned: {
    type: Array,
    default: () => [],
  },
});
defineEmits(['pin']);

const { t, te } = useI18n();
const blocksDetail = getBlocks();

function getBlockTitle({ description, id, name }) {
  const blockPath = `workflow.blocks.${id}`;
  if (!te(blockPath)) return blocksDetail[id].name;

  const descPath = `${blockPath}.${description ? 'description' : 'name'}`;
  let blockDescription = te(descPath) ? t(descPath) : name;

  if (description) {
    blockDescription = `[${t(`${blockPath}.name`)}]\n${blockDescription}`;
  }

  return blockDescription;
}
function getIconPath(path) {
  if (path && path.startsWith('path')) {
    const { 1: iconPath } = path.split(':');
    return iconPath;
  }

  return '';
}
</script>
