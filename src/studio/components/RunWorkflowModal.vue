<template>
  <ui-modal
    :model-value="modelValue"
    title="Execute Workflow"
    content-class="max-w-md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4 py-1 text-xs">
      <div
        class="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
      >
        <p
          class="font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5 flex items-center"
        >
          <span
            class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"
          ></span>
          automa-core (Online)
        </p>
        <p class="text-emerald-700/80 dark:text-emerald-400 text-[11px]">
          Target endpoint:
          <span class="font-mono">
            {{
              automaCoreState?.baseUrl || 'http://127.0.0.1:8765'
            }}/api/v1/jobs
          </span>
        </p>
      </div>

      <div>
        <label
          class="block font-semibold mb-1 text-gray-700 dark:text-gray-300"
        >
          Target Browser Profile
        </label>
        <select
          :value="runModalState.browserId"
          data-testid="select-browser-profile"
          class="w-full px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-accent text-gray-800 dark:text-gray-100"
          @change="$emit('update:browserId', $event.target.value)"
        >
          <option value="daemon_worker">
            ⚡ Default Chromium (Core Worker)
          </option>
          <option
            v-for="b in automaCoreState?.browsers || []"
            :key="b.id"
            :value="b.id"
          >
            🌐 {{ b.name || b.id }} {{ b.isOnline ? '(Online)' : '' }}
          </option>
        </select>
      </div>

      <!-- Workflow Parameters Section -->
      <div
        v-if="runModalState.parameters && runModalState.parameters.length > 0"
        class="border-t border-b border-gray-200 dark:border-gray-700/80 py-3 my-2 space-y-3"
      >
        <div class="flex items-center justify-between">
          <h4
            class="font-semibold text-xs text-gray-800 dark:text-gray-200 flex items-center"
          >
            <v-remixicon
              name="riInputMethodLine"
              size="14"
              class="mr-1 text-accent"
            />
            Workflow Parameters ({{ runModalState.parameters.length }})
          </h4>
          <span class="text-[10px] text-gray-400">Injected on execution</span>
        </div>

        <div class="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          <div
            v-for="(param, idx) in runModalState.parameters"
            :key="idx"
            class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <label
                class="font-medium text-xs text-gray-700 dark:text-gray-300 flex items-center"
              >
                {{ param.name }}
                <span
                  v-if="param.data?.required"
                  class="text-rose-500 font-bold ml-1"
                  title="Required parameter"
                  >*</span
                >
              </label>
              <span
                class="text-[10px] text-gray-400 uppercase font-mono bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded"
              >
                {{ param.type || 'string' }}
              </span>
            </div>

            <p
              v-if="param.description"
              class="text-[11px] text-gray-500 dark:text-gray-400"
            >
              {{ param.description }}
            </p>

            <!-- Checkbox input -->
            <div v-if="param.type === 'checkbox'">
              <ui-checkbox
                :model-value="param.value"
                @update:model-value="param.value = $event"
              >
                {{ param.placeholder || param.name }}
              </ui-checkbox>
            </div>

            <!-- JSON input -->
            <div v-else-if="param.type === 'json'">
              <textarea
                :value="param.value"
                rows="3"
                placeholder='{ "key": "value" }'
                class="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent text-gray-800 dark:text-gray-100"
                @input="param.value = $event.target.value"
              ></textarea>
            </div>

            <!-- Number input -->
            <div v-else-if="param.type === 'number'">
              <input
                :value="param.value"
                type="number"
                :placeholder="param.placeholder || 'Enter number...'"
                class="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent text-gray-800 dark:text-gray-100"
                @input="param.value = Number($event.target.value)"
              />
            </div>

            <!-- Default string/text input -->
            <div v-else>
              <input
                :value="param.value"
                type="text"
                :placeholder="param.placeholder || 'Enter value...'"
                class="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent text-gray-800 dark:text-gray-100"
                @input="param.value = $event.target.value"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2 pt-1">
        <ui-checkbox
          :model-value="runModalState.headless"
          @update:model-value="$emit('update:headless', $event)"
        >
          Run in Headless Mode (Hidden Browser)
        </ui-checkbox>
        <ui-checkbox
          :model-value="runModalState.closeBrowserOnFinish"
          @update:model-value="$emit('update:closeBrowserOnFinish', $event)"
        >
          Close Browser when Workflow Finishes
        </ui-checkbox>
      </div>

      <div class="flex justify-end space-x-2 pt-2">
        <ui-button
          variant="secondary"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </ui-button>
        <ui-button
          variant="accent"
          :loading="runModalState.isSubmitting"
          :disabled="!isParamsValid"
          @click="$emit('execute')"
        >
          Execute Workflow
        </ui-button>
      </div>
    </div>
  </ui-modal>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  automaCoreState: {
    type: Object,
    default: () => ({}),
  },
  runModalState: {
    type: Object,
    required: true,
  },
  isParamsValid: {
    type: Boolean,
    default: true,
  },
});

defineEmits([
  'update:modelValue',
  'update:browserId',
  'update:headless',
  'update:closeBrowserOnFinish',
  'execute',
]);
</script>
