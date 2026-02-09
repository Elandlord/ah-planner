<script setup lang="ts">
import { useRecipeStore } from '~/stores/recipeStore';

const recipeStore = useRecipeStore();

const activeTab = ref<'suggested' | 'all' | 'saved' | 'weekplan'>('suggested');
const selectedDay = ref('');

const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function assignRecipe(recipeId: string): void {
    if (!selectedDay.value) {
        selectedDay.value = days[0];
    }
    recipeStore.assignToDay(selectedDay.value, recipeId);
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Recepten
        </h1>

        <div class="tabs">
            <button
                class="tab"
                :class="{ 'tab--active': activeTab === 'suggested' }"
                @click="activeTab = 'suggested'"
            >
                Aanbevolen
            </button>
            <button
                class="tab"
                :class="{ 'tab--active': activeTab === 'all' }"
                @click="activeTab = 'all'"
            >
                Alle recepten
            </button>
            <button
                class="tab"
                :class="{ 'tab--active': activeTab === 'saved' }"
                @click="activeTab = 'saved'"
            >
                Opgeslagen
            </button>
            <button
                class="tab"
                :class="{ 'tab--active': activeTab === 'weekplan' }"
                @click="activeTab = 'weekplan'"
            >
                Weekplan
            </button>
        </div>

        <div
            v-if="activeTab === 'weekplan'"
            class="week-plan"
        >
            <div class="day-selector">
                <label class="day-label">Dag selecteren:</label>
                <select
                    v-model="selectedDay"
                    class="day-select"
                >
                    <option
                        v-for="day in days"
                        :key="day"
                        :value="day"
                    >
                        {{ day }}
                    </option>
                </select>
            </div>
            <div class="day-list">
                <div
                    v-for="day in days"
                    :key="day"
                    class="day-row"
                >
                    <span class="day-name">{{ day }}</span>
                    <span
                        v-if="recipeStore.weekPlanRecipes[day]"
                        class="day-recipe"
                    >
                        {{ recipeStore.weekPlanRecipes[day]?.name }}
                        <button
                            class="remove-day"
                            @click="recipeStore.removeFromDay(day)"
                        >
                            &times;
                        </button>
                    </span>
                    <span
                        v-else
                        class="day-empty"
                    >
                        Geen recept
                    </span>
                </div>
            </div>
        </div>

        <div
            v-if="activeTab === 'suggested'"
            class="recipe-grid"
        >
            <p
                v-if="recipeStore.suggestedRecipes.length === 0"
                class="empty-state"
            >
                Upload eerst bonnen voor persoonlijke aanbevelingen.
            </p>
            <RecipeCard
                v-for="recipe in recipeStore.suggestedRecipes"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="recipeStore.savedRecipeIds.includes(recipe.id)"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @assign="assignRecipe(recipe.id)"
            />
        </div>

        <div
            v-if="activeTab === 'all'"
            class="recipe-grid"
        >
            <RecipeCard
                v-for="recipe in recipeStore.allRecipes"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="recipeStore.savedRecipeIds.includes(recipe.id)"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @assign="assignRecipe(recipe.id)"
            />
        </div>

        <div
            v-if="activeTab === 'saved'"
            class="recipe-grid"
        >
            <p
                v-if="recipeStore.savedRecipes.length === 0"
                class="empty-state"
            >
                Nog geen opgeslagen recepten.
            </p>
            <RecipeCard
                v-for="recipe in recipeStore.savedRecipes"
                :key="recipe.id"
                :recipe="recipe"
                :is-saved="true"
                @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                @assign="assignRecipe(recipe.id)"
            />
        </div>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.tabs {
    @apply flex gap-1 mb-6 bg-gray-100 rounded-lg p-1;
}

.tab {
    @apply flex-1 py-2 text-sm text-center rounded-md transition-colors;
}

.tab--active {
    @apply bg-white shadow font-semibold;
}

.recipe-grid {
    @apply space-y-4;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.week-plan {
    @apply bg-white rounded-lg shadow p-4;
}

.day-selector {
    @apply mb-4 flex items-center gap-2;
}

.day-label {
    @apply text-sm text-gray-600;
}

.day-select {
    @apply border rounded px-3 py-1 text-sm;
}

.day-list {
    @apply space-y-2;
}

.day-row {
    @apply flex justify-between items-center py-2 border-b last:border-0;
}

.day-name {
    @apply font-medium w-28;
}

.day-recipe {
    @apply flex-1 text-sm flex items-center gap-2;
}

.remove-day {
    @apply text-red-500 hover:text-red-700;
}

.day-empty {
    @apply flex-1 text-sm text-gray-400;
}
</style>
