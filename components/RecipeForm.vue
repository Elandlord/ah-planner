<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const { recipe = null } = defineProps<{
    recipe?: RecipeInterface | null;
}>();

const emit = defineEmits<{
    submit: [Omit<RecipeInterface, 'id'>];
    cancel: [];
}>();

const categories = Object.values(ProductCategoryEnum);

function emptyIngredient(): RecipeIngredientInterface {
    return { name: '', amount: '', category: ProductCategoryEnum.overig };
}

const name = ref(recipe?.name ?? '');
const description = ref(recipe?.description ?? '');
const servings = ref(recipe?.servings ?? 4);
const prepTimeMinutes = ref(recipe?.prepTimeMinutes ?? 30);
const ingredients = ref<RecipeIngredientInterface[]>(
    recipe ? recipe.ingredients.map((ingredient) => ({ ...ingredient })) : [emptyIngredient()],
);
const instructions = ref(recipe?.instructions.join('\n') ?? '');
const tags = ref(recipe?.tags.join(', ') ?? '');

const filledIngredients = computed(() =>
    ingredients.value
        .filter((ingredient) => ingredient.name.trim().length > 0)
        .map((ingredient) => ({
            name: ingredient.name.trim(),
            amount: ingredient.amount.trim(),
            category: ingredient.category,
        })),
);

const canSubmit = computed(
    () => name.value.trim().length > 0 && filledIngredients.value.length > 0,
);

const submitLabel = computed(() => (recipe ? 'Opslaan' : 'Recept toevoegen'));

function addIngredient(): void {
    ingredients.value.push(emptyIngredient());
}

function removeIngredient(index: number): void {
    ingredients.value.splice(index, 1);
}

function submit(): void {
    if (!canSubmit.value) {
        return;
    }
    emit('submit', {
        name: name.value.trim(),
        description: description.value.trim(),
        servings: servings.value,
        prepTimeMinutes: prepTimeMinutes.value,
        ingredients: filledIngredients.value,
        instructions: instructions.value
            .split('\n')
            .map((step) => step.trim())
            .filter((step) => step.length > 0),
        tags: tags.value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
    });
}
</script>

<template>
    <form
        class="recipe-form"
        @submit.prevent="submit"
    >
        <label class="field">
            <span class="field-label">Naam</span>
            <input
                v-model="name"
                class="field-input"
                type="text"
            >
        </label>

        <label class="field">
            <span class="field-label">Omschrijving</span>
            <input
                v-model="description"
                class="field-input"
                type="text"
            >
        </label>

        <div class="field-row">
            <label class="field">
                <span class="field-label">Personen</span>
                <input
                    v-model.number="servings"
                    class="field-input"
                    type="number"
                    min="1"
                >
            </label>
            <label class="field">
                <span class="field-label">Bereidingstijd (min)</span>
                <input
                    v-model.number="prepTimeMinutes"
                    class="field-input"
                    type="number"
                    min="1"
                >
            </label>
        </div>

        <div class="ingredients">
            <span class="field-label">Ingrediënten</span>
            <div
                v-for="(ingredient, index) in ingredients"
                :key="index"
                class="ingredient-row"
            >
                <input
                    v-model="ingredient.name"
                    class="field-input ingredient-name"
                    type="text"
                    placeholder="Naam"
                >
                <input
                    v-model="ingredient.amount"
                    class="field-input ingredient-amount"
                    type="text"
                    placeholder="Hoeveelheid"
                >
                <select
                    v-model="ingredient.category"
                    class="field-input ingredient-category"
                >
                    <option
                        v-for="category in categories"
                        :key="category"
                        :value="category"
                    >
                        {{ category }}
                    </option>
                </select>
                <button
                    class="remove-ingredient"
                    type="button"
                    @click="removeIngredient(index)"
                >
                    &times;
                </button>
            </div>
            <button
                class="add-ingredient"
                type="button"
                @click="addIngredient"
            >
                Ingrediënt toevoegen
            </button>
        </div>

        <label class="field">
            <span class="field-label">Bereiding (één stap per regel)</span>
            <textarea
                v-model="instructions"
                class="field-input"
                rows="4"
            />
        </label>

        <label class="field">
            <span class="field-label">Tags (komma-gescheiden)</span>
            <input
                v-model="tags"
                class="field-input"
                type="text"
            >
        </label>

        <div class="form-actions">
            <button
                class="submit-btn"
                type="submit"
                :disabled="!canSubmit"
            >
                {{ submitLabel }}
            </button>
            <button
                class="cancel-btn"
                type="button"
                @click="emit('cancel')"
            >
                Annuleren
            </button>
        </div>
    </form>
</template>

<style scoped>
.recipe-form {
    @apply bg-white rounded-lg shadow p-4 space-y-3;
}

.field {
    @apply block;
}

.field-row {
    @apply flex gap-3;
}

.field-label {
    @apply block text-sm text-gray-600 mb-1;
}

.field-input {
    @apply w-full border rounded px-3 py-1 text-sm;
}

.ingredients {
    @apply space-y-2;
}

.ingredient-row {
    @apply flex items-center gap-2;
}

.ingredient-name {
    @apply flex-1;
}

.ingredient-amount {
    @apply w-28;
}

.ingredient-category {
    @apply w-32;
}

.remove-ingredient {
    @apply text-red-500 hover:text-red-700;
}

.add-ingredient {
    @apply text-sm text-blue-600 hover:text-blue-800;
}

.form-actions {
    @apply flex gap-3 pt-2;
}

.submit-btn {
    @apply bg-blue-600 text-white text-sm rounded px-4 py-2 disabled:bg-gray-300;
}

.cancel-btn {
    @apply text-sm text-gray-600 hover:text-gray-800;
}
</style>
