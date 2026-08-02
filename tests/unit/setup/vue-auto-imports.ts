import { ref } from 'vue';
import { vi } from 'vitest';

vi.stubGlobal('ref', ref);
