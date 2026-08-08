<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import { useRecipeShopping } from '~/composables/useRecipeShopping';

const { recipe } = defineProps<{ recipe: RecipeInterface }>();

const HERO_TAGS: Record<string, string> = {
    ovenschotel: 'from-orange-400 to-rose-500',
    salade: 'from-lime-400 to-emerald-500',
    vis: 'from-sky-400 to-cyan-500',
    soep: 'from-amber-400 to-orange-500',
    stamppot: 'from-emerald-500 to-teal-600',
};

const { resolveIngredients } = useRecipeShopping();

const productImage = ref<string | null>(null);

const gradient = computed(() => {
    const match = recipe.tags.find((tag) => HERO_TAGS[tag]);
    return HERO_TAGS[match ?? ''] ?? 'from-blue-500 to-indigo-600';
});

const initials = computed(() =>
    recipe.name
        .split(' ')
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join(''));

/** No recipe photo is shipped, so the hero ingredient's product shot stands in. */
async function loadHeroImage(): Promise<void> {
    if (recipe.imageUrl) {
        productImage.value = recipe.imageUrl;
        return;
    }
    try {
        const resolved = await resolveIngredients(recipe);
        const hero = recipe.ingredients.find((ingredient) =>
            ingredient.productQuery && resolved.get(ingredient.productQuery)?.product?.imageUrl);
        productImage.value = hero?.productQuery
            ? resolved.get(hero.productQuery)?.product?.imageUrl ?? null
            : null;
    } catch {
        productImage.value = null;
    }
}

onMounted(loadHeroImage);
</script>

<template>
    <div class="recipe-image">
        <img
            v-if="productImage"
            :src="productImage"
            class="photo"
            :alt="recipe.name"
        >
        <div
            v-else
            :class="['placeholder', 'bg-gradient-to-br', gradient]"
        >
            {{ initials }}
        </div>
    </div>
</template>

<style scoped>
.recipe-image {
    @apply w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center;
}

.photo {
    @apply w-full h-full object-contain;
}

.placeholder {
    @apply w-full h-full flex items-center justify-center text-white text-xl font-bold;
}
</style>
