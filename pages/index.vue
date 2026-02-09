<script setup lang="ts">
import type ReceiptInterface from '~/types/ReceiptInterface';
import { useReceiptStore } from '~/stores/receiptStore';
import { useOcr } from '~/composables/useOcr';

const receiptStore = useReceiptStore();
const { isProcessing, progress, rawText, error, processImage, processText } = useOcr();

const parsedReceipt = ref<ReceiptInterface | null>(null);
const manualInput = ref(false);
const manualText = ref('');

async function onFileSelected(file: File): Promise<void> {
    const reader = new FileReader();
    reader.onload = async () => {
        const result = await processImage(reader.result as string);
        if (result) {
            parsedReceipt.value = result;
        }
    };
    reader.readAsDataURL(file);
}

function onManualProcess(): void {
    parsedReceipt.value = processText(manualText.value);
}

function onSaveReceipt(): void {
    if (parsedReceipt.value) {
        receiptStore.addReceipt(parsedReceipt.value);
        parsedReceipt.value = null;
        manualText.value = '';
        rawText.value = '';
    }
}

function onCancel(): void {
    parsedReceipt.value = null;
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Bon Uploaden
        </h1>

        <div v-if="!parsedReceipt">
            <ReceiptDropZone @file-selected="onFileSelected" />

            <div
                v-if="isProcessing"
                class="processing-indicator"
            >
                <p>{{ progress }}</p>
            </div>

            <div
                v-if="error"
                class="error-message"
            >
                {{ error }}
            </div>

            <div class="manual-section">
                <button
                    class="toggle-manual"
                    @click="manualInput = !manualInput"
                >
                    {{ manualInput ? 'Verberg handmatige invoer' : 'Handmatig bon tekst invoeren' }}
                </button>

                <div
                    v-if="manualInput"
                    class="manual-form"
                >
                    <textarea
                        v-model="manualText"
                        class="manual-textarea"
                        rows="10"
                        placeholder="Plak hier de bon tekst..."
                    />
                    <button
                        class="process-btn"
                        :disabled="!manualText.trim()"
                        @click="onManualProcess"
                    >
                        Verwerken
                    </button>
                </div>
            </div>
        </div>

        <ReceiptReview
            v-if="parsedReceipt"
            v-model="parsedReceipt"
            @save="onSaveReceipt"
            @cancel="onCancel"
        />
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.processing-indicator {
    @apply mt-4 text-center text-blue-600;
}

.error-message {
    @apply mt-4 text-center text-red-600;
}

.manual-section {
    @apply mt-6;
}

.toggle-manual {
    @apply text-sm text-blue-600 hover:text-blue-800;
}

.manual-form {
    @apply mt-3;
}

.manual-textarea {
    @apply w-full border rounded-lg p-3 text-sm font-mono;
}

.process-btn {
    @apply mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
           disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
