import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { vi } from 'vitest';

vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('watch', watch);
vi.stubGlobal('nextTick', nextTick);
vi.stubGlobal('onMounted', onMounted);
vi.stubGlobal('onUnmounted', onUnmounted);
