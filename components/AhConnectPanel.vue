<script setup lang="ts">
import { useAhApi } from '~/composables/useAhApi';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const { fetchStatus, startLogin, syncReceipts } = useAhApi();

const connected = ref<boolean | null>(null);
const busy = ref(false);
const message = ref('');
const waitingForLogin = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const statusLabel = computed(() => {
    if (connected.value === null) {
        return 'Status controleren...';
    }
    return connected.value ? 'Verbonden met Albert Heijn' : 'Niet verbonden';
});

async function refreshStatus(): Promise<void> {
    connected.value = await fetchStatus();
}

function stopPolling(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    waitingForLogin.value = false;
}

function pollUntilConnected(): void {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    pollTimer = setInterval(async () => {
        if (Date.now() > deadline) {
            stopPolling();
            message.value = 'Inloggen duurde te lang. Probeer het opnieuw.';
            return;
        }
        if (await fetchStatus()) {
            stopPolling();
            connected.value = true;
            message.value = 'Verbonden. Bonnen worden opgehaald...';
            await sync();
        }
    }, POLL_INTERVAL_MS);
}

async function login(): Promise<void> {
    busy.value = true;
    message.value = '';
    try {
        const loginUrl = await startLogin();
        window.open(loginUrl, '_blank');
        waitingForLogin.value = true;
        message.value = 'Log in op het nieuwe tabblad. Deze pagina wacht op je.';
        pollUntilConnected();
    } catch {
        message.value = 'Inloggen starten mislukt. Draait de dev server?';
    } finally {
        busy.value = false;
    }
}

async function sync(): Promise<void> {
    busy.value = true;
    message.value = '';
    try {
        const count = await syncReceipts();
        message.value = count > 0
            ? `${count} nieuwe bonnen opgehaald.`
            : 'Geen nieuwe bonnen gevonden.';
    } catch {
        message.value = 'Synchroniseren mislukt. Verbind opnieuw als dit blijft gebeuren.';
        connected.value = await fetchStatus();
    } finally {
        busy.value = false;
    }
}

onMounted(refreshStatus);
onUnmounted(stopPolling);
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <p class="panel-title">
                    Albert Heijn koppeling
                </p>
                <p :class="connected ? 'status-ok' : 'status-off'">
                    {{ statusLabel }}
                </p>
            </div>
            <button
                v-if="connected"
                class="sync-btn"
                :disabled="busy"
                @click="sync"
            >
                {{ busy ? 'Bezig...' : 'Bonnen synchroniseren' }}
            </button>
        </div>

        <div
            v-if="connected === false"
            class="connect-section"
        >
            <p class="connect-intro">
                Log in met je eigen Albert Heijn account. Je bonnen en boodschappenlijst
                komen dan automatisch binnen.
            </p>
            <button
                class="login-btn"
                :disabled="busy || waitingForLogin"
                @click="login"
            >
                {{ waitingForLogin ? 'Wachten op inloggen...' : 'Inloggen bij Albert Heijn' }}
            </button>
        </div>

        <p
            v-if="message"
            class="panel-message"
        >
            {{ message }}
        </p>
    </div>
</template>

<style scoped>
.panel {
    @apply bg-white rounded-lg shadow p-4 mb-4;
}

.panel-header {
    @apply flex items-center justify-between gap-3;
}

.panel-title {
    @apply font-semibold;
}

.status-ok {
    @apply text-sm text-green-600;
}

.status-off {
    @apply text-sm text-gray-500;
}

.sync-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.connect-section {
    @apply mt-3 space-y-2;
}

.connect-intro {
    @apply text-sm text-gray-600;
}

.login-btn {
    @apply px-4 py-2 text-sm font-medium bg-sky-700 text-white rounded-md hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed;
}

.panel-message {
    @apply mt-2 text-sm text-gray-600;
}
</style>
