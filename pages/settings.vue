<script setup lang="ts">
import { ref } from 'vue';
import { useAutoBackup } from '~/composables/useAutoBackup';
import { useDataBackup } from '~/composables/useDataBackup';

const { exportBackup, importBackup } = useDataBackup();
const { isSupported: autoBackupSupported, isEnabled: autoBackupEnabled, enable, disable } =
    useAutoBackup();

const statusMessage = ref('');
const statusIsError = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const autoBackupStatus = ref('');
const autoBackupStatusIsError = ref(false);

function onExport(): void {
    exportBackup();
    statusIsError.value = false;
    statusMessage.value = 'Back-up gedownload.';
}

function onImportClick(): void {
    fileInput.value?.click();
}

function onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            importBackup(reader.result as string);
            statusIsError.value = false;
            statusMessage.value = 'Back-up hersteld.';
        } catch (error) {
            statusIsError.value = true;
            statusMessage.value = error instanceof Error ? error.message : 'Herstellen mislukt.';
        }
    };
    reader.readAsText(file);
    input.value = '';
}

async function onEnableAutoBackup(): Promise<void> {
    try {
        await enable();
        if (autoBackupEnabled.value) {
            autoBackupStatusIsError.value = false;
            autoBackupStatus.value = 'Automatische back-up ingeschakeld.';
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return;
        }
        autoBackupStatusIsError.value = true;
        autoBackupStatus.value = error instanceof Error ? error.message : 'Inschakelen mislukt.';
    }
}

async function onDisableAutoBackup(): Promise<void> {
    await disable();
    autoBackupStatusIsError.value = false;
    autoBackupStatus.value = 'Automatische back-up uitgeschakeld.';
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Instellingen
        </h1>

        <div class="section">
            <h2 class="section-title">
                Back-up &amp; overzetten naar ander apparaat
            </h2>
            <p class="section-description">
                Exporteer al je bonnen, recepten, weekplan en boodschappenlijst als
                bestand. Importeer dat bestand op een ander apparaat om verder te gaan.
            </p>

            <div class="actions">
                <button
                    class="action-btn"
                    @click="onExport"
                >
                    Exporteer back-up
                </button>
                <button
                    class="action-btn action-btn-secondary"
                    @click="onImportClick"
                >
                    Importeer back-up
                </button>
                <input
                    ref="fileInput"
                    type="file"
                    accept="application/json"
                    class="hidden-input"
                    @change="onFileSelected"
                >
            </div>

            <p
                v-if="statusMessage"
                class="status-message"
                :class="{ 'status-error': statusIsError }"
            >
                {{ statusMessage }}
            </p>
        </div>

        <div
            v-if="autoBackupSupported"
            class="section"
        >
            <h2 class="section-title">
                Automatische back-up
            </h2>
            <p class="section-description">
                Kies een bestand op je apparaat. AH Planner houdt dat bestand
                automatisch bij na elke wijziging, zodat je data bewaard blijft
                als de browser leeg raakt. Werkt alleen in Chrome-achtige browsers.
            </p>

            <div class="actions">
                <button
                    v-if="!autoBackupEnabled"
                    class="autobackup-btn"
                    @click="onEnableAutoBackup"
                >
                    Automatische back-up inschakelen
                </button>
                <button
                    v-else
                    class="autobackup-btn autobackup-btn-secondary"
                    @click="onDisableAutoBackup"
                >
                    Automatische back-up uitschakelen
                </button>
            </div>

            <p
                v-if="autoBackupStatus"
                class="autobackup-status"
                :class="{ 'status-error': autoBackupStatusIsError }"
            >
                {{ autoBackupStatus }}
            </p>
        </div>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.section {
    @apply bg-white rounded-lg shadow p-4 mb-6;
}

.section-title {
    @apply text-lg font-semibold mb-2;
}

.section-description {
    @apply text-sm text-gray-500 mb-4;
}

.actions {
    @apply flex gap-3;
}

.action-btn {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}

.action-btn-secondary {
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.autobackup-btn {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}

.autobackup-btn-secondary {
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.hidden-input {
    @apply hidden;
}

.status-message,
.autobackup-status {
    @apply mt-3 text-sm text-green-600;
}

.status-error {
    @apply text-red-600;
}
</style>
