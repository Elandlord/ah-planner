<script setup lang="ts">
const emit = defineEmits<{
    filesSelected: [files: File[]];
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function isValidFile(file: File): boolean {
    return file.type.startsWith('image/') || file.type === 'application/pdf';
}

function onDrop(event: DragEvent): void {
    isDragging.value = false;
    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles?.length) {
        return;
    }

    const validFiles = Array.from(droppedFiles).filter(isValidFile);
    if (validFiles.length > 0) {
        emit('filesSelected', validFiles);
    }
}

function onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const selectedFiles = target.files;
    if (!selectedFiles?.length) {
        return;
    }

    emit('filesSelected', Array.from(selectedFiles));
    target.value = '';
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
            accept="image/*,.pdf,application/pdf"
            multiple
            class="file-input"
            @change="onFileChange"
        >
        <div class="drop-zone-content">
            <p class="drop-zone-title">
                Sleep een foto of PDF van je bon hierheen
            </p>
            <p class="drop-zone-subtitle">
                of klik om bestanden te selecteren
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
