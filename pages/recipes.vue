<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import MealSlotEnum from '~/types/MealSlotEnum';
import DietTagEnum from '~/types/DietTagEnum';
import { useRecipeStore } from '~/stores/recipeStore';
import { filterRecipes, recipeCategories } from '~/composables/useRecipeFilters';
import type { WeekPlanSlotConfig } from '~/composables/useWeekPlan';
import { buildWeekPlan, excludeByDietaryTags, pickRandom, recipesNeeded } from '~/composables/useWeekPlan';
import { sortByBonus, useRecipeBonus } from '~/composables/useRecipeBonus';
import { useToast } from '~/composables/useToast';

const DIETARY_TAG_OPTIONS: { tag: DietTagEnum; label: string }[] = [
    { tag: DietTagEnum.vegetarian, label: 'Vegetarisch' },
    { tag: DietTagEnum.vegan, label: 'Veganistisch' },
    { tag: DietTagEnum.glutenFree, label: 'Glutenvrij' },
    { tag: DietTagEnum.lactoseFree, label: 'Lactosevrij' },
];

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const MEAL_SLOTS: { key: MealSlotEnum; label: string }[] = [
    { key: MealSlotEnum.dinner, label: 'Diner' },
    { key: MealSlotEnum.lunch, label: 'Lunch' },
];

const recipeStore = useRecipeStore();
const toast = useToast();
const { bonusByRecipe, loadBonusData } = useRecipeBonus();

type RecipeTab = 'suggested' | 'all' | 'saved' | 'mine' | 'weekplan';

const TABS: { key: RecipeTab; label: string }[] = [
    { key: 'suggested', label: 'Aanbevolen' },
    { key: 'all', label: 'Alle recepten' },
    { key: 'saved', label: 'Opgeslagen' },
    { key: 'mine', label: 'Mijn recepten' },
    { key: 'weekplan', label: 'Weekplan' },
];

const activeTab = ref<RecipeTab>('suggested');
const isFormOpen = ref(false);
const editedRecipe = ref<RecipeInterface | null>(null);
const formKey = computed(() => editedRecipe.value?.id ?? 'new');
const category = ref('Alles');
const search = ref('');
const openRecipeId = ref<string | null>(null);
const draggedSlot = ref<{ day: string; slot: MealSlotEnum } | null>(null);

function byDietaryTags(recipes: RecipeInterface[]): RecipeInterface[] {
    return excludeByDietaryTags(recipes, recipeStore.household.excludedDietaryTags);
}

function toggleDietaryTag(tag: DietTagEnum): void {
    const current = recipeStore.household.excludedDietaryTags;
    const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
    recipeStore.setExcludedDietaryTags(next);
}

/** A recipe whose ingredients are in the bonus this week is worth cooking first. */
const suggested = computed(() => sortByBonus(
    byDietaryTags(filterRecipes(recipeStore.suggestedRecipes, category.value, search.value)),
    bonusByRecipe.value,
));
const all = computed(() => byDietaryTags(
    filterRecipes(recipeStore.availableRecipes, category.value, search.value),
));
const saved = computed(() => byDietaryTags(
    filterRecipes(recipeStore.savedRecipes, category.value, search.value),
));

function planRecipe(recipeId: string, days: string[]): void {
    recipeStore.assignToDays(days, recipeId);
    const name = recipeStore.availableRecipes.find((r) => r.id === recipeId)?.name;
    toast.success(`${name} staat op ${days.join(', ')}.`);
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

const runLength = ref(2);

function pickForSlot(needed: number): RecipeInterface[] {
    const base = byDietaryTags(
        recipeStore.savedRecipes.length >= needed
            ? recipeStore.savedRecipes
            : recipeStore.availableRecipes,
    );
    const withBonus = base.filter((candidate) => (bonusByRecipe.value.get(candidate.id) ?? 0) > 0);
    const pool = withBonus.length >= needed ? withBonus : base;
    return pickRandom(pool, needed, Math.random);
}

function randomiseWeek(): void {
    const needed = recipesNeeded(DAYS.length, runLength.value);
    const dinnerPicked = pickForSlot(needed);
    const lunchPicked = pickForSlot(needed);
    if (dinnerPicked.length === 0 && lunchPicked.length === 0) {
        toast.error('Geen recepten om uit te kiezen.');
        return;
    }
    const slots: WeekPlanSlotConfig[] = [
        { slot: MealSlotEnum.dinner, recipes: dinnerPicked, runLength: runLength.value },
        { slot: MealSlotEnum.lunch, recipes: lunchPicked, runLength: runLength.value },
    ];
    recipeStore.replaceWeekPlan(buildWeekPlan(DAYS, slots));
    toast.success(`Week gevuld met ${dinnerPicked.length + lunchPicked.length} recepten.`);
}

onMounted(() => loadBonusData(recipeStore.availableRecipes));

function startDrag(day: string, slot: MealSlotEnum): void {
    draggedSlot.value = { day, slot };
}

function dropOn(day: string, slot: MealSlotEnum): void {
    if (draggedSlot.value && draggedSlot.value.slot === slot) {
        recipeStore.swapDays(draggedSlot.value.day, day, slot);
    }
    draggedSlot.value = null;
}

function assignSlot(day: string, slot: MealSlotEnum, recipeId: string): void {
    if (!recipeId) {
        return;
    }
    recipeStore.assignToDay(day, recipeId, slot);
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
                v-for="tab in TABS"
                :key="tab.key"
                class="tab"
                :class="{ 'tab--active': activeTab === tab.key }"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
            </button>
        </div>

        <RecipeImporter v-if="activeTab !== 'weekplan'" />

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
            <div class="categories">
                <button
                    v-for="option in DIETARY_TAG_OPTIONS"
                    :key="option.tag"
                    class="category"
                    :class="{ 'category--active': recipeStore.household.excludedDietaryTags.includes(option.tag) }"
                    @click="toggleDietaryTag(option.tag)"
                >
                    {{ option.label }}
                </button>
            </div>
        </div>

        <div
            v-if="activeTab === 'weekplan'"
            class="week-plan"
        >
            <div class="week-controls">
                <div class="household">
                    <span class="control-label">Huishouden</span>
                    <label class="field">
                        volwassenen
                        <input
                            type="number"
                            min="0"
                            class="number-input"
                            :value="recipeStore.household.adults"
                            @input="recipeStore.setHousehold(
                                Number(($event.target as HTMLInputElement).value),
                                recipeStore.household.children,
                            )"
                        >
                    </label>
                    <label class="field">
                        kinderen
                        <input
                            type="number"
                            min="0"
                            class="number-input"
                            :value="recipeStore.household.children"
                            @input="recipeStore.setHousehold(
                                recipeStore.household.adults,
                                Number(($event.target as HTMLInputElement).value),
                            )"
                        >
                    </label>
                </div>
                <div class="randomise">
                    <label class="field">
                        dagen per recept
                        <input
                            v-model.number="runLength"
                            type="number"
                            min="1"
                            max="7"
                            class="number-input"
                        >
                    </label>
                    <button
                        class="randomise-btn"
                        @click="randomiseWeek"
                    >
                        Vul de week ({{ recipesNeeded(DAYS.length, runLength) }} recepten)
                    </button>
                </div>
            </div>

            <p class="week-hint">
                Sleep een dag op een andere dag om te ruilen. Klik op een recept om het te openen.
            </p>
            <div class="day-list">
                <div
                    v-for="day in DAYS"
                    :key="day"
                    class="day-row"
                >
                    <span class="day-name">{{ day }}</span>
                    <div
                        v-for="slot in MEAL_SLOTS"
                        :key="slot.key"
                        class="meal-slot"
                        :class="{
                            'meal-slot--dragging':
                                draggedSlot?.day === day && draggedSlot?.slot === slot.key,
                        }"
                        draggable="true"
                        @dragstart="startDrag(day, slot.key)"
                        @dragover.prevent
                        @drop="dropOn(day, slot.key)"
                    >
                        <span class="slot-label">{{ slot.label }}</span>
                        <button
                            v-if="recipeStore.weekPlanRecipes[day]?.[slot.key]"
                            class="day-recipe"
                            @click="openRecipe(recipeStore.weekPlan[day][slot.key] as string)"
                        >
                            {{ recipeStore.weekPlanRecipes[day]?.[slot.key]?.name }}
                        </button>
                        <select
                            v-else
                            class="slot-select"
                            @change="assignSlot(day, slot.key, ($event.target as HTMLSelectElement).value)"
                        >
                            <option value="">
                                Geen recept
                            </option>
                            <option
                                v-for="recipe in recipeStore.availableRecipes"
                                :key="recipe.id"
                                :value="recipe.id"
                            >
                                {{ recipe.name }}
                            </option>
                        </select>
                        <button
                            v-if="recipeStore.weekPlanRecipes[day]?.[slot.key]"
                            class="remove-day"
                            @click="recipeStore.removeFromDay(day, slot.key)"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            </div>

            <WeekPlanShopping />
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
                    :days="DAYS"
                    :start-open="openRecipeId === recipe.id"
                    @toggle-save="recipeStore.toggleSaveRecipe(recipe.id)"
                    @plan="planRecipe(recipe.id, $event)"
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

.week-controls {
    @apply flex flex-wrap items-end justify-between gap-3 mb-3;
}

.household,
.randomise {
    @apply flex flex-wrap items-end gap-3;
}

.control-label {
    @apply text-sm font-medium text-gray-700;
}

.field {
    @apply flex items-center gap-1.5 text-xs text-gray-500;
}

.number-input {
    @apply w-14 px-2 py-1 text-sm border rounded-md;
}

.randomise-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700;
}

.week-hint {
    @apply text-sm text-gray-500 mb-3;
}

.day-list {
    @apply space-y-2;
}

.day-row {
    @apply flex flex-wrap items-center gap-3 p-2 rounded-md bg-gray-50;
}

.day-name {
    @apply w-28 text-sm font-medium text-gray-700;
}

.meal-slot {
    @apply flex flex-1 items-center gap-2 p-1.5 rounded-md border border-transparent cursor-grab;
}

.meal-slot--dragging {
    @apply border-blue-400 opacity-60;
}

.slot-label {
    @apply w-12 text-xs text-gray-400;
}

.day-recipe {
    @apply flex-1 text-left text-sm text-blue-600 hover:underline;
}

.slot-select {
    @apply flex-1 text-sm text-gray-500 border rounded-md px-1.5 py-0.5;
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
