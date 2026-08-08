<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import { useRecipeBonus } from '~/composables/useRecipeBonus';

const { recipe, isSaved, days = [], startOpen = false } = defineProps<{
    recipe: RecipeInterface;
    isSaved: boolean;
    days?: string[];
    startOpen?: boolean;
}>();

const emit = defineEmits<{
    toggleSave: [];
    plan: [days: string[]];
}>();

const { bonusCountFor } = useRecipeBonus();

const bonusCount = computed(() => bonusCountFor(recipe.id));
const isExpanded = ref(startOpen);
const planDays = ref<string[]>([]);

function toggleDay(day: string): void {
    planDays.value = planDays.value.includes(day)
        ? planDays.value.filter((selected) => selected !== day)
        : [...planDays.value, day];
}

function plan(): void {
    if (planDays.value.length === 0) {
        return;
    }
    emit('plan', [...planDays.value]);
    planDays.value = [];
}

watch(() => startOpen, (open) => {
    if (open) {
        isExpanded.value = true;
    }
});
</script>

<template>
    <div class="recipe-card">
        <div class="recipe-header">
            <RecipeImage :recipe="recipe" />
            <div class="recipe-heading">
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
            <span
                v-if="bonusCount > 0"
                class="bonus-pill"
            >{{ bonusCount }} in de bonus</span>
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

        <div class="card-actions">
            <button
                class="expand-btn"
                @click="isExpanded = !isExpanded"
            >
                {{ isExpanded ? 'Minder tonen' : 'Meer tonen' }}
            </button>

            <div class="plan-control">
                <button
                    v-for="day in days"
                    :key="day"
                    class="day-chip"
                    :class="{ 'day-chip--on': planDays.includes(day) }"
                    :title="day"
                    @click="toggleDay(day)"
                >
                    {{ day.slice(0, 2) }}
                </button>
                <button
                    class="plan-btn"
                    :disabled="planDays.length === 0"
                    @click="plan"
                >
                    Inplannen
                </button>
            </div>
        </div>

        <div
            v-if="isExpanded"
            class="recipe-details"
        >
            <RecipeShoppingPanel :recipe="recipe" />

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
        </div>
    </div>
</template>

<style scoped>
.recipe-card {
    @apply bg-white rounded-lg shadow p-4;
}

.recipe-heading {
    @apply flex-1 min-w-0;
}

.recipe-header {
    @apply flex justify-between items-start gap-3;
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

.bonus-pill {
    @apply px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700;
}

.recipe-tag {
    @apply bg-gray-100 px-2 py-0.5 rounded;
}

.card-actions {
    @apply flex flex-wrap items-center justify-between gap-2;
}

.plan-control {
    @apply flex items-center gap-2;
}

.day-chip {
    @apply w-8 h-7 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50;
}

.day-chip--on {
    @apply bg-blue-600 border-blue-600 text-white hover:bg-blue-700;
}

.plan-btn {
    @apply px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed;
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
