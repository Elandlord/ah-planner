<script setup lang="ts">
const emit = defineEmits<{
    fileSelected: [file: File];
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function onDrop(event: DragEvent): void {
    isDragging.value = false;
    const file = event.dataTransfer?.files[0];
    if (file && isImageFile(file)) {
        emit('fileSelected', file);
    }
}

function onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        emit('fileSelected', file);
    }
}

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

function openFilePicker(): void {
    fileInput.value?.click();
}
</script>

<template>
    <div
        class="drop-zone"
        :class="{ 'drop-zone--active': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="onDrop"
        @click="openFilePicker"
    >
        <input
            ref="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="file-input"
            @change="onFileChange"
        >
        <div class="drop-zone-content">
            <p class="drop-zone-title">
                Sleep een foto van je bon hierheen
            </p>
            <p class="drop-zone-subtitle">
                of klik om een foto te maken / selecteren
            </p>
        </div>
    </div>
</template>

<style scoped>
.drop-zone {
    @apply border-2 border-dashed border-gray-300 rounded-lg p-8
           text-center cursor-pointer transition-colors hover:border-blue-400;
}

.drop-zone--active {
    @apply border-blue-500 bg-blue-50;
}

.file-input {
    @apply hidden;
}

.drop-zone-content {
    @apply pointer-events-none;
}

.drop-zone-title {
    @apply text-lg font-medium text-gray-700;
}

.drop-zone-subtitle {
    @apply text-sm text-gray-500 mt-1;
}
</style>
