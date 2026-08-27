<template>
  <ui-modal
    :model-value="modelValue"
    title="Vault Secrets & AES Encryption"
    content-class="max-w-3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4 py-1 text-xs text-foreground">
      <!-- Tabs Navigation -->
      <div class="flex items-center gap-1.5 border-b border-border pb-2">
        <Button
          :variant="activeTab === 'credentials' ? 'default' : 'ghost'"
          size="sm"
          @click="activeTab = 'credentials'"
        >
          Encrypted Credentials
        </Button>
        <Button
          :variant="activeTab === 'playground' ? 'default' : 'ghost'"
          size="sm"
          @click="activeTab = 'playground'"
        >
          AES Encryption Playground
        </Button>
      </div>

      <!-- Tab 1: Encrypted Credentials -->
      <div v-if="activeTab === 'credentials'" class="space-y-3">
        <div class="flex items-center justify-between">
          <Button
            variant="default"
            size="sm"
            data-testid="btn-add-credential"
            @click="showAddForm = !showAddForm"
          >
            <Plus class="size-3.5 mr-1" />
            <span>New Secret</span>
          </Button>

          <Button variant="outline" size="sm" @click="loadCredentials">
            <RefreshCw
              class="size-3.5 mr-1"
              :class="{ 'animate-spin': isLoading }"
            />
            <span>Refresh</span>
          </Button>
        </div>

        <!-- Add Credential Form (Collapsible) -->
        <div
          v-if="showAddForm"
          class="p-3 rounded-lg bg-muted/40 border border-border space-y-2.5"
        >
          <h4
            class="font-semibold text-xs text-foreground flex items-center gap-1.5"
          >
            <KeyRound class="size-3.5 text-primary" />
            <span>Add Encrypted Secret (HMAC-SHA256 + AES-256-CBC)</span>
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                class="block text-[11px] font-medium text-muted-foreground mb-1"
              >
                Secret Key / Name *
              </label>
              <Input
                v-model="newCred.name"
                type="text"
                placeholder="e.g. TWITTER_AUTH_TOKEN, API_KEY"
                class="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label
                class="block text-[11px] font-medium text-muted-foreground mb-1"
              >
                Plaintext Value *
              </label>
              <Input
                v-model="newCred.value"
                type="password"
                placeholder="Secret raw value"
                class="h-8 text-xs"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="xs" @click="showAddForm = false">
              Cancel
            </Button>
            <Button
              variant="default"
              size="xs"
              :disabled="!newCred.name || !newCred.value || isSubmitting"
              @click="onAddCredential"
            >
              Save Encrypted Secret
            </Button>
          </div>
        </div>

        <!-- Credentials List -->
        <div class="max-h-64 overflow-y-auto space-y-2 pr-1">
          <div v-if="isLoading" class="py-8 text-center text-muted-foreground">
            <Loader2
              class="size-5 animate-spin inline-block mb-1 text-primary"
            />
            <p>Loading credentials from SQLite Vault...</p>
          </div>

          <div
            v-else-if="credentials.length === 0"
            class="py-8 text-center text-muted-foreground"
          >
            <Lock class="size-7 inline-block mb-1 text-muted-foreground/50" />
            <p class="font-medium">No encrypted secrets found</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              Stored secrets can be referenced inside workflows via
              <span class="font-mono text-primary">\{\{secrets.key\}\}</span>
            </p>
          </div>

          <div
            v-for="c in credentials"
            :key="c.name || c.id"
            class="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between"
          >
            <div class="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                class="size-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"
              >
                <KeyRound class="size-4" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="font-mono font-medium text-xs text-foreground truncate"
                >
                  \{\{secrets.{{ c.name || c.key }}\}\}
                </span>
                <span class="text-[10px] text-muted-foreground truncate">
                  Value: •••••••••••• (Encrypted AES-256)
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              data-testid="btn-delete-credential"
              class="text-muted-foreground hover:text-destructive"
              title="Delete credential"
              @click="onDeleteCredential(c.name || c.key)"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Tab 2: AES Playground -->
      <div v-else-if="activeTab === 'playground'" class="space-y-3">
        <p class="text-muted-foreground">
          Test Automa Core AES-256-CBC encryption endpoint directly:
        </p>

        <div class="space-y-2">
          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Plaintext to Encrypt
            </label>
            <Input
              v-model="playground.secret"
              type="text"
              placeholder="Enter sensitive text..."
              class="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <label
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              Master Passphrase (Optional)
            </label>
            <Input
              v-model="playground.passphrase"
              type="password"
              placeholder="Defaults to system master passphrase"
              class="h-8 text-xs"
            />
          </div>

          <Button
            variant="default"
            size="sm"
            :disabled="!playground.secret || playground.isLoading"
            @click="onEncryptPlayground"
          >
            <Lock class="size-3.5 mr-1" />
            <span>Encrypt with Automa Core</span>
          </Button>

          <div
            v-if="playground.encryptedResult"
            class="p-2.5 rounded-lg bg-muted/50 border border-border"
          >
            <span
              class="block text-[11px] font-medium text-muted-foreground mb-1"
            >
              AES-256 Ciphertext:
            </span>
            <p class="font-mono text-[11px] break-all text-primary select-all">
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
import { Button, Input } from '@automa/ui';
import {
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next';
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
