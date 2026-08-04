import { computed, ref, watch } from 'vue';
import { vi } from 'vitest';

vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('watch', watch);
