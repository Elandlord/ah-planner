<script setup lang="ts">
import { useRecipeStore } from '~/stores/recipeStore';
import { filterRecipes, recipeCategories } from '~/composables/useRecipeFilters';
import { useToast } from '~/composables/useToast';

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

const recipeStore = useRecipeStore();
const toast = useToast();

type RecipeTab = 'suggested' | 'all' | 'saved' | 'weekplan';

const TABS: { key: RecipeTab; label: string }[] = [
    { key: 'suggested', label: 'Aanbevolen' },
    { key: 'all', label: 'Alle recepten' },
    { key: 'saved', label: 'Opgeslagen' },
    { key: 'weekplan', label: 'Weekplan' },
];

const activeTab = ref<RecipeTab>('suggested');
const category = ref('Alles');
const search = ref('');
const openRecipeId = ref<string | null>(null);
const draggedDay = ref<string | null>(null);

const suggested = computed(() =>
    filterRecipes(recipeStore.suggestedRecipes, category.value, search.value));
const all = computed(() => filterRecipes(recipeStore.allRecipes, category.value, search.value));
const saved = computed(() => filterRecipes(recipeStore.savedRecipes, category.value, search.value));

function planRecipe(recipeId: string, day: string): void {
    recipeStore.assignToDay(day, recipeId);
    toast.success(`${recipeStore.allRecipes.find((r) => r.id === recipeId)?.name} staat op ${day}.`);
}

function openRecipe(recipeId: string): void {
    activeTab.value = 'all';
    category.value = 'Alles';
    search.value = '';
    openRecipeId.value = recipeId;
    nextTick(() => {
        document.getElementById(`recipe-${recipeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function startDrag(day: string): void {
    draggedDay.value = day;
}

function dropOn(day: string): void {
    if (draggedDay.value) {
        recipeStore.swapDays(draggedDay.value, day);
    }
    draggedDay.value = null;
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Recepten
        </h1>

        <div class="tabs">
            <button
                v-for="tab in TABS"
                :key="tab.key"
                class="tab"
                :class="{ 'tab--active': activeTab === tab.key }"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
            </button>
        </div>

        <div
            v-if="activeTab !== 'weekplan'"
            class="filter-bar"
        >
            <input
                v-model="search"
                type="search"
                class="search-input"
                placeholder="Zoek op recept of ingredient..."
            >
            <div class="categories">
                <button
                    v-for="option in recipeCategories"
                    :key="option"
                    class="category"
                    :class="{ 'category--active': category === option }"
                    @click="category = option"
                >
                    {{ option }}
                </button>
            </div>
        </div>

        <div
            v-if="activeTab === 'weekplan'"
            class="week-plan"
        >
            <p class="week-hint">
                Sleep een dag op een andere dag om te ruilen. Klik op een recept om het te openen.
            </p>
            <div class="day-list">
                <div
                    v-for="day in DAYS"
                    :key="day"
                    class="day-row"
                    :class="{ 'day-row--dragging': draggedDay === day }"
                    draggable="true"
                    @dragstart="startDrag(day)"
                    @dragover.prevent
                    @drop="dropOn(day)"
                >
                    <span class="day-name">{{ day }}</span>
                    <button
                        v-if="recipeStore.weekPlanRecipes[day]"
                        class="day-recipe"
                        @click="openRecipe(recipeStore.weekPlan[day])"
                    >
                        {{ recipeStore.weekPlanRecipes[day]?.name }}
                    </button>
                    <span
                        v-else
                        class="day-empty"
                    >
                        Geen recept
                    </span>
                    <button
                        v-if="recipeStore.weekPlanRecipes[day]"
                        class="remove-day"
                        @click="recipeStore.removeFromDay(day)"
                    >
                        &times;
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="activeTab === 'suggested'"
            class="recipe-grid"
        >
            <p
                v-if="suggested.length === 0"
                class="empty-state"
            >
                Geen recepten gevonden. Synchroniseer bonnen of pas je zoekterm aan.
            </p>
            <RecipeCard
                v-for="recipe in suggested"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="recipeStore.savedRecipeIds.includes(recipe.id)"
                :days="DAYS"
                :start-open="openRecipeId === recipe.id"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @plan="planRecipe(recipe.id, $event)"
            />
        </div>

        <div
            v-if="activeTab === 'all'"
            class="recipe-grid"
        >
            <p
                v-if="all.length === 0"
                class="empty-state"
            >
                Geen recepten gevonden voor deze zoekterm.
            </p>
            <RecipeCard
                v-for="recipe in all"
                :id="`recipe-${recipe.id}`"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="recipeStore.savedRecipeIds.includes(recipe.id)"
                :days="DAYS"
                :start-open="openRecipeId === recipe.id"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @plan="planRecipe(recipe.id, $event)"
            />
        </div>

        <div
            v-if="activeTab === 'saved'"
            class="recipe-grid"
        >
            <p
                v-if="saved.length === 0"
                class="empty-state"
            >
                Nog geen opgeslagen recepten.
            </p>
            <RecipeCard
                v-for="recipe in saved"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="true"
                :days="DAYS"
                :start-open="openRecipeId === recipe.id"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @plan="planRecipe(recipe.id, $event)"
            />
        </div>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.tabs {
    @apply flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit;
}

.tab {
    @apply px-4 py-1.5 text-sm rounded-md text-gray-600;
}

.tab--active {
    @apply bg-white text-gray-900 shadow-sm;
}

.filter-bar {
    @apply mb-4 space-y-2;
}

.search-input {
    @apply w-full px-3 py-2 text-sm border rounded-md;
}

.categories {
    @apply flex flex-wrap gap-1.5;
}

.category {
    @apply px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50;
}

.category--active {
    @apply bg-blue-600 border-blue-600 text-white hover:bg-blue-700;
}

.week-plan {
    @apply bg-white rounded-lg shadow p-4;
}

.week-hint {
    @apply text-sm text-gray-500 mb-3;
}

.day-list {
    @apply space-y-2;
}

.day-row {
    @apply flex items-center gap-3 p-2 rounded-md border border-transparent bg-gray-50 cursor-grab;
}

.day-row--dragging {
    @apply border-blue-400 opacity-60;
}

.day-name {
    @apply w-28 text-sm font-medium text-gray-700;
}

.day-recipe {
    @apply flex-1 text-left text-sm text-blue-600 hover:underline;
}

.day-empty {
    @apply flex-1 text-sm text-gray-400;
}

.remove-day {
    @apply text-gray-400 hover:text-red-500 px-2;
}

.recipe-grid {
    @apply space-y-3;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}
</style>
