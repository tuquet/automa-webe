<template>
  <label
    class="checkbox-ui items-center cursor-pointer select-none"
    :class="[block ? 'flex' : 'inline-flex']"
  >
    <div
      :class="{
        'pointer-events-none opacity-75': disabled,
      }"
      class="relative inline-block h-5 w-5 rounded focus-within:ring-2 focus-within:ring-accent"
    >
      <input
        :class="{ indeterminate }"
        type="checkbox"
        class="checkbox-ui__input opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
        :value="modelValue"
        v-bind="{ checked: modelValue, disabled }"
        @change="changeHandler"
      />
      <div
        class="bg-input checkbox-ui__mark absolute top-0 left-0 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
      >
        <v-remixicon
          :name="indeterminate ? 'riSubtractLine' : 'riCheckLine'"
          size="16"
          class="text-white"
        ></v-remixicon>
      </div>
    </div>
    <span
      v-if="$slots.default"
      class="ml-2 inline-block text-xs leading-tight text-gray-700 dark:text-gray-200"
    >
      <slot></slot>
    </span>
  </label>
</template>
<script>
export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    indeterminate: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: null,
    },
    block: {
      type: Boolean,
      default: null,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    function changeHandler({ target: { checked } }) {
      emit('update:modelValue', checked);
      emit('change', checked);
    }

    return {
      changeHandler,
    };
  },
};
</script>
<style scoped>
.checkbox-ui:hover .checkbox-ui__mark {
  @apply border-gray-400 dark:border-gray-500;
}
.checkbox-ui__input:checked ~ .checkbox-ui__mark,
.checkbox-ui__input.indeterminate ~ .checkbox-ui__mark {
  @apply bg-accent border-accent text-white shadow-sm;
  background-color: rgb(var(--color-accent, 24 24 27)) !important;
  border-color: rgb(var(--color-accent, 24 24 27)) !important;
}
.checkbox-ui__input:checked ~ .checkbox-ui__mark .v-remixicon,
.checkbox-ui__input.indeterminate ~ .checkbox-ui__mark .v-remixicon {
  transform: scale(1) !important;
  opacity: 1 !important;
}
.checkbox-ui__mark {
  width: 100%;
  height: 100%;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox-ui__mark .v-remixicon {
  transform: scale(0.4) !important;
  opacity: 0;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease;
  color: #ffffff !important;
}
</style>
