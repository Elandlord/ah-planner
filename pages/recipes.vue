<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import { useRecipeStore } from '~/stores/recipeStore';

const recipeStore = useRecipeStore();

const activeTab = ref<'suggested' | 'all' | 'saved' | 'mine' | 'weekplan'>('suggested');
const selectedDay = ref('');
const isFormOpen = ref(false);
const editedRecipe = ref<RecipeInterface | null>(null);

const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

const formKey = computed(() => editedRecipe.value?.id ?? 'new');

function assignRecipe(recipeId: string): void {
    if (!selectedDay.value) {
        selectedDay.value = days[0];
    }
    recipeStore.assignToDay(selectedDay.value, recipeId);
}

function openNewRecipeForm(): void {
    editedRecipe.value = null;
    isFormOpen.value = true;
}

function openEditRecipeForm(recipe: RecipeInterface): void {
    editedRecipe.value = recipe;
    isFormOpen.value = true;
}

function closeForm(): void {
    isFormOpen.value = false;
    editedRecipe.value = null;
}

function saveRecipe(recipe: Omit<RecipeInterface, 'id'>): void {
    if (editedRecipe.value) {
        recipeStore.updateRecipe(editedRecipe.value.id, recipe);
    } else {
        recipeStore.addRecipe(recipe);
    }
    closeForm();
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
                :class="{ 'tab--active': activeTab === 'mine' }"
                @click="activeTab = 'mine'"
            >
                Mijn recepten
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
                v-for="recipe in recipeStore.availableRecipes"
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

        <div
            v-if="activeTab === 'mine'"
            class="recipe-grid"
        >
            <RecipeForm
                v-if="isFormOpen"
                :key="formKey"
                :recipe="editedRecipe"
                @submit="saveRecipe"
                @cancel="closeForm"
            />
            <button
                v-else
                class="new-recipe-btn"
                @click="openNewRecipeForm"
            >
                Nieuw recept
            </button>

            <p
                v-if="recipeStore.userRecipes.length === 0"
                class="empty-state"
            >
                Nog geen eigen recepten.
            </p>
            <div
                v-for="recipe in recipeStore.userRecipes"
                :key="recipe.id"
                class="user-recipe"
            >
                <RecipeCard
                    :recipe="recipe"
                    :is-saved="recipeStore.savedRecipeIds.includes(recipe.id)"
                    @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                    @assign="assignRecipe(recipe.id)"
                />
                <div class="user-recipe-actions">
                    <button
                        class="edit-recipe-btn"
                        @click="openEditRecipeForm(recipe)"
                    >
                        Bewerken
                    </button>
                    <button
                        class="delete-recipe-btn"
                        @click="recipeStore.deleteRecipe(recipe.id)"
                    >
                        Verwijderen
                    </button>
                </div>
            </div>
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

.new-recipe-btn {
    @apply bg-blue-600 text-white text-sm rounded px-4 py-2;
}

.user-recipe {
    @apply bg-white rounded-lg shadow;
}

.user-recipe-actions {
    @apply flex gap-3 px-4 pb-4;
}

.edit-recipe-btn {
    @apply text-sm text-blue-600 hover:text-blue-800;
}

.delete-recipe-btn {
    @apply text-sm text-red-600 hover:text-red-800;
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
