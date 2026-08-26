<template>
  <ui-modal
    :model-value="modelValue"
    title="Vault Secrets & AES Encryption"
    content-class="max-w-3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4 py-1 text-xs text-gray-800 dark:text-gray-200">
      <!-- Tabs Navigation -->
      <div
        class="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2"
      >
        <button
          class="px-3 py-1.5 rounded-lg font-medium transition"
          :class="
            activeTab === 'credentials'
              ? 'bg-accent text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="activeTab = 'credentials'"
        >
          Encrypted Credentials
        </button>
        <button
          class="px-3 py-1.5 rounded-lg font-medium transition"
          :class="
            activeTab === 'playground'
              ? 'bg-accent text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="activeTab = 'playground'"
        >
          AES Encryption Playground
        </button>
      </div>

      <!-- Tab 1: Encrypted Credentials -->
      <div v-if="activeTab === 'credentials'" class="space-y-3">
        <div class="flex items-center justify-between">
          <button
            data-testid="btn-add-credential"
            class="px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center space-x-1 transition shadow-xs"
            @click="showAddForm = !showAddForm"
          >
            <v-remixicon name="riAddLine" size="14" />
            <span>New Secret</span>
          </button>

          <button
            class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1 transition"
            @click="loadCredentials"
          >
            <v-remixicon
              name="riRefreshLine"
              size="14"
              :class="{ 'animate-spin': isLoading }"
            />
            <span>Refresh</span>
          </button>
        </div>

        <!-- Add Credential Form (Collapsible) -->
        <div
          v-if="showAddForm"
          class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2.5"
        >
          <h4
            class="font-semibold text-xs text-gray-900 dark:text-gray-100 flex items-center"
          >
            <v-remixicon name="riKey2Line" size="14" class="mr-1 text-accent" />
            Add Encrypted Secret (HMAC-SHA256 + AES-256-CBC)
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
                >Secret Key / Name *</label
              >
              <input
                v-model="newCred.name"
                type="text"
                placeholder="e.g. TWITTER_AUTH_TOKEN, API_KEY"
                class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              />
            </div>

            <div>
              <label
                class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
                >Plaintext Value *</label
              >
              <input
                v-model="newCred.value"
                type="password"
                placeholder="Secret raw value"
                class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-1">
            <button
              class="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="showAddForm = false"
            >
              Cancel
            </button>
            <button
              class="px-3 py-1 text-xs rounded-md bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
              :disabled="!newCred.name || !newCred.value || isSubmitting"
              @click="onAddCredential"
            >
              Save Encrypted Secret
            </button>
          </div>
        </div>

        <!-- Credentials List -->
        <div class="max-h-64 overflow-y-auto space-y-2 pr-1">
          <div v-if="isLoading" class="py-8 text-center text-gray-400">
            <v-remixicon
              name="riLoader2Line"
              size="20"
              class="animate-spin inline-block mb-1"
            />
            <p>Loading credentials from SQLite Vault...</p>
          </div>

          <div
            v-else-if="credentials.length === 0"
            class="py-8 text-center text-gray-400"
          >
            <v-remixicon
              name="riLock2Line"
              size="24"
              class="inline-block mb-1 text-gray-300 dark:text-gray-600"
            />
            <p class="font-medium">No encrypted secrets found</p>
            <p class="text-[11px] text-gray-400 mt-0.5">
              Stored secrets can be referenced inside workflows via
              <span class="font-mono text-accent">\{\{secrets.key\}\}</span>
            </p>
          </div>

          <div
            v-for="c in credentials"
            :key="c.name || c.id"
            class="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 flex items-center justify-between"
          >
            <div class="flex items-center space-x-2.5 min-w-0 pr-2">
              <div
                class="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0"
              >
                <v-remixicon name="riKey2Line" size="16" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="font-mono font-medium text-xs text-gray-900 dark:text-gray-100 truncate"
                  >\{\{secrets.{{ c.name || c.key }}\}\}</span
                >
                <span class="text-[10px] text-gray-400 truncate"
                  >Value: •••••••••••• (Encrypted AES-256)</span
                >
              </div>
            </div>

            <button
              data-testid="btn-delete-credential"
              class="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
              title="Delete credential"
              @click="onDeleteCredential(c.name || c.key)"
            >
              <v-remixicon name="riDeleteBin7Line" size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: AES Playground -->
      <div v-else-if="activeTab === 'playground'" class="space-y-3">
        <p class="text-gray-500 dark:text-gray-400">
          Test Automa Core AES-256-CBC encryption endpoint directly:
        </p>

        <div class="space-y-2">
          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Plaintext to Encrypt</label
            >
            <input
              v-model="playground.secret"
              type="text"
              placeholder="Enter sensitive text..."
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
              >Master Passphrase (Optional)</label
            >
            <input
              v-model="playground.passphrase"
              type="password"
              placeholder="Defaults to system master passphrase"
              class="w-full px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            class="px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:bg-accent/90 flex items-center space-x-1"
            :disabled="!playground.secret || playground.isLoading"
            @click="onEncryptPlayground"
          >
            <v-remixicon name="riLock2Line" size="14" />
            <span>Encrypt with Automa Core</span>
          </button>

          <div
            v-if="playground.encryptedResult"
            class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          >
            <span class="block text-[11px] font-medium text-gray-500 mb-1"
              >AES-256 Ciphertext:</span
            >
            <p class="font-mono text-[11px] break-all text-accent select-all">
              {{ playground.encryptedResult }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </ui-modal>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import {
  fetchStorageCredentials,
  createStorageCredential,
  deleteStorageCredential,
  encryptSecretText,
} from '../services/storage.service';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
const toast = useToast();

const activeTab = ref('credentials');
const credentials = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showAddForm = ref(false);

const newCred = reactive({
  name: '',
  value: '',
});

const playground = reactive({
  secret: '',
  passphrase: '',
  encryptedResult: '',
  isLoading: false,
});

async function loadCredentials() {
  isLoading.value = true;
  try {
    credentials.value = await fetchStorageCredentials();
  } catch (err) {
    toast.error(`Failed to load credentials: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function onAddCredential() {
  if (!newCred.name || !newCred.value) return;
  isSubmitting.value = true;
  try {
    await createStorageCredential({
      name: newCred.name,
      value: newCred.value,
    });
    toast.success('Secret saved and encrypted in SQLite Vault!');
    newCred.name = '';
    newCred.value = '';
    showAddForm.value = false;
    await loadCredentials();
  } catch (err) {
    toast.error(`Save secret failed: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}

async function onDeleteCredential(name) {
  try {
    await deleteStorageCredential(name);
    toast.success('Secret deleted.');
    await loadCredentials();
  } catch (err) {
    toast.error(`Delete failed: ${err.message}`);
  }
}

async function onEncryptPlayground() {
  if (!playground.secret) return;
  playground.isLoading = true;
  try {
    const res = await encryptSecretText(
      playground.secret,
      playground.passphrase || undefined
    );
    playground.encryptedResult =
      res.encrypted || res.data || JSON.stringify(res);
    toast.success('Text encrypted successfully!');
  } catch (err) {
    toast.error(`Encryption failed: ${err.message}`);
  } finally {
    playground.isLoading = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadCredentials();
  }
);

onMounted(() => {
  if (props.modelValue) loadCredentials();
});
</script>
