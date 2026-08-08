<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import { useRecipeStore } from '~/stores/recipeStore';
import { useToast } from '~/composables/useToast';

const SUGGESTED_SITES = [
    { label: 'Allerhande', url: 'https://www.ah.nl/allerhande' },
    { label: 'Leukerecepten', url: 'https://www.leukerecepten.nl' },
    { label: 'Dagelijkse kost', url: 'https://dagelijksekost.vrt.be' },
];

const recipeStore = useRecipeStore();
const toast = useToast();

const url = ref('');
const busy = ref(false);

async function importRecipe(): Promise<void> {
    if (!url.value.trim()) {
        return;
    }
    busy.value = true;
    try {
        const response = await $fetch<{ recipe: RecipeInterface }>('/api/recipes/import', {
            method: 'POST',
            body: { url: url.value.trim() },
        });
        recipeStore.importRecipe(response.recipe);
        toast.success(`${response.recipe.name} toegevoegd aan je recepten.`);
        url.value = '';
    } catch (error) {
        const message = (error as { statusMessage?: string }).statusMessage;
        toast.error(message ?? 'Importeren mislukt.');
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <div class="importer">
        <div class="row">
            <input
                v-model="url"
                type="url"
                class="url-input"
                placeholder="Plak een recept-URL, bijvoorbeeld van Allerhande"
                @keyup.enter="importRecipe"
            >
            <button
                class="import-btn"
                :disabled="busy || !url.trim()"
                @click="importRecipe"
            >
                {{ busy ? 'Bezig...' : 'Importeren' }}
            </button>
        </div>
        <p class="hint">
            Werkt op elke site met receptgegevens in de pagina, zoals
            <a
                v-for="(site, index) in SUGGESTED_SITES"
                :key="site.url"
                :href="site.url"
                target="_blank"
                rel="noopener"
                class="site-link"
            >{{ site.label }}{{ index < SUGGESTED_SITES.length - 1 ? ', ' : '' }}</a>.
            Geïmporteerde recepten blijven in deze browser staan.
        </p>
    </div>
</template>

<style scoped>
.importer {
    @apply bg-white rounded-lg shadow p-4 mb-4;
}

.row {
    @apply flex gap-2;
}

.url-input {
    @apply flex-1 px-3 py-2 text-sm border rounded-md;
}

.import-btn {
    @apply px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.hint {
    @apply text-xs text-gray-500 mt-2;
}

.site-link {
    @apply text-blue-600 hover:underline;
}
</style>
