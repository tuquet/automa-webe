<template>
  <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <DialogContent class="max-w-md p-5 gap-4">
      <DialogHeader>
        <DialogTitle class="text-sm font-semibold flex items-center gap-2">
          <Play class="size-4 text-primary" />
          <span>Execute Workflow</span>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-3.5 py-1 text-xs">
        <div
          class="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30 space-y-0.5"
        >
          <div
            class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center text-xs"
          >
            <span
              class="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse"
            />
            automa-core (Online)
          </div>
          <p class="text-muted-foreground text-[11px]">
            Target endpoint:
            <span class="font-mono text-foreground">
              {{
                automaCoreState?.baseUrl || 'http://127.0.0.1:8765'
              }}/api/v1/jobs
            </span>
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block font-medium text-xs text-foreground">
            Target Browser Profile
          </label>
          <RemoteVirtualSelect
            id="select.browser.profile"
            :model-value="runModalState.browserId"
            placeholder="Select browser profile..."
            @update:model-value="$emit('update:browserId', $event)"
          />
        </div>

        <!-- Workflow Parameters Section -->
        <div
          v-if="runModalState.parameters && runModalState.parameters.length > 0"
          class="border-t border-b border-border py-2.5 space-y-2.5"
        >
          <div class="flex items-center justify-between">
            <h4
              class="font-semibold text-xs text-foreground flex items-center gap-1.5"
            >
              <SlidersHorizontal class="size-3.5 text-primary" />
              <span
                >Workflow Parameters ({{
                  runModalState.parameters.length
                }})</span
              >
            </h4>
            <span class="text-[10px] text-muted-foreground"
              >Injected on execution</span
            >
          </div>

          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div
              v-for="(param, idx) in runModalState.parameters"
              :key="idx"
              class="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <label
                  class="font-medium text-xs text-foreground flex items-center"
                >
                  {{ param.name }}
                  <span
                    v-if="param.data?.required"
                    class="text-destructive font-bold ml-1"
                    title="Required parameter"
                    >*</span
                  >
                </label>
                <Badge
                  variant="outline"
                  class="text-[10px] uppercase font-mono px-1 py-0"
                >
                  {{ param.type || 'string' }}
                </Badge>
              </div>

              <p
                v-if="param.description"
                class="text-[11px] text-muted-foreground"
              >
                {{ param.description }}
              </p>

              <!-- JSON input -->
              <div v-if="param.type === 'json'">
                <textarea
                  :value="param.value"
                  rows="3"
                  placeholder='{ "key": "value" }'
                  class="w-full px-2.5 py-1.5 text-xs font-mono rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                  @input="param.value = $event.target.value"
                />
              </div>

              <!-- Number input -->
              <div v-else-if="param.type === 'number'">
                <Input
                  :model-value="param.value"
                  type="number"
                  :placeholder="param.placeholder || 'Enter number...'"
                  class="h-7 text-xs"
                  @update:model-value="param.value = Number($event)"
                />
              </div>

              <!-- Default string/text input -->
              <div v-else>
                <Input
                  :model-value="param.value"
                  type="text"
                  :placeholder="param.placeholder || 'Enter value...'"
                  class="h-7 text-xs"
                  @update:model-value="param.value = $event"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between">
            <span class="text-xs text-foreground"
              >Run in Headless Mode (Hidden Browser)</span
            >
            <Switch
              :checked="runModalState.headless"
              @update:checked="$emit('update:headless', $event)"
            />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-foreground"
              >Close Browser when Workflow Finishes</span
            >
            <Switch
              :checked="runModalState.closeBrowserOnFinish"
              @update:checked="$emit('update:closeBrowserOnFinish', $event)"
            />
          </div>
        </div>
      </div>

      <DialogFooter class="flex justify-end gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          :disabled="!isParamsValid || runModalState.isSubmitting"
          @click="$emit('execute')"
        >
          <Play class="size-3.5 mr-1" />
          <span>{{
            runModalState.isSubmitting ? 'Submitting...' : 'Execute Workflow'
          }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RemoteVirtualSelect,
  Switch,
} from '@automa/ui';
import { Play, SlidersHorizontal } from 'lucide-vue-next';

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
