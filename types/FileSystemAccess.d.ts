export {};

declare global {
    interface FileSystemPermissionDescriptor {
        mode?: 'read' | 'readwrite';
    }

    interface FileSystemWritableFileStream extends WritableStream {
        write(data: string | BufferSource | Blob): Promise<void>;
        close(): Promise<void>;
    }

    interface FileSystemFileHandle {
        queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
        requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
        createWritable(): Promise<FileSystemWritableFileStream>;
    }

    interface SaveFilePickerOptions {
        suggestedName?: string;
        types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }

    interface Window {
        showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    }
}
