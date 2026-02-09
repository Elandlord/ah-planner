<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';

const { recipe, isSaved } = defineProps<{
    recipe: RecipeInterface;
    isSaved: boolean;
}>();

const emit = defineEmits<{
    toggleSave: [];
    assign: [];
}>();

const isExpanded = ref(false);
</script>

<template>
    <div class="recipe-card">
        <div class="recipe-header">
            <div>
                <h3 class="recipe-name">
                    {{ recipe.name }}
                </h3>
                <p class="recipe-description">
                    {{ recipe.description }}
                </p>
            </div>
            <button
                class="save-btn"
                :class="{ 'save-btn--saved': isSaved }"
                @click="emit('toggleSave')"
            >
                {{ isSaved ? '&#9829;' : '&#9825;' }}
            </button>
        </div>

        <div class="recipe-meta">
            <span>{{ recipe.servings }} personen</span>
            <span>{{ recipe.prepTimeMinutes }} min</span>
            <span
                v-for="tag in recipe.tags"
                :key="tag"
                class="recipe-tag"
            >
                {{ tag }}
            </span>
        </div>

        <button
            class="expand-btn"
            @click="isExpanded = !isExpanded"
        >
            {{ isExpanded ? 'Minder tonen' : 'Meer tonen' }}
        </button>

        <div
            v-show="isExpanded"
            class="recipe-details"
        >
            <div class="ingredients-section">
                <h4 class="section-title">
                    Ingrediënten
                </h4>
                <ul class="ingredient-list">
                    <li
                        v-for="ingredient in recipe.ingredients"
                        :key="ingredient.name"
                    >
                        {{ ingredient.amount }} {{ ingredient.name }}
                    </li>
                </ul>
            </div>
            <div class="instructions-section">
                <h4 class="section-title">
                    Bereiding
                </h4>
                <ol class="instruction-list">
                    <li
                        v-for="(step, idx) in recipe.instructions"
                        :key="idx"
                    >
                        {{ step }}
                    </li>
                </ol>
            </div>
            <button
                class="assign-btn"
                @click="emit('assign')"
            >
                Toevoegen aan weekplan
            </button>
        </div>
    </div>
</template>

<style scoped>
.recipe-card {
    @apply bg-white rounded-lg shadow p-4;
}

.recipe-header {
    @apply flex justify-between items-start;
}

.recipe-name {
    @apply text-lg font-semibold;
}

.recipe-description {
    @apply text-sm text-gray-600 mt-1;
}

.save-btn {
    @apply text-2xl text-gray-400 hover:text-red-500;
}

.save-btn--saved {
    @apply text-red-500;
}

.recipe-meta {
    @apply flex flex-wrap gap-2 mt-2 text-xs text-gray-500;
}

.recipe-tag {
    @apply bg-gray-100 px-2 py-0.5 rounded;
}

.expand-btn {
    @apply text-sm text-blue-600 hover:text-blue-800 mt-2;
}

.recipe-details {
    @apply mt-3 pt-3 border-t;
}

.section-title {
    @apply text-sm font-semibold mb-1;
}

.ingredient-list {
    @apply text-sm text-gray-700 list-disc list-inside mb-3;
}

.instruction-list {
    @apply text-sm text-gray-700 list-decimal list-inside mb-3;
}

.assign-btn {
    @apply text-sm text-blue-600 hover:text-blue-800;
}
</style>
