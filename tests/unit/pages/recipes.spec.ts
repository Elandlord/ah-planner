import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecipesPage from '~/pages/recipes.vue';
import RecipeForm from '~/components/RecipeForm.vue';
import { useRecipeStore } from '~/stores/recipeStore';
import type RecipeInterface from '~/types/RecipeInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const RecipeCardStub = {
    name: 'RecipeCard',
    props: ['recipe', 'isSaved'],
    template: '<div class="recipe-card-stub">{{ recipe.name }}</div>',
};

const NEW_RECIPE: Omit<RecipeInterface, 'id'> = {
    name: 'Eigen recept',
    description: 'Zelfbedacht',
    servings: 2,
    prepTimeMinutes: 15,
    ingredients: [{ name: 'melk', amount: '100ml', category: ProductCategoryEnum.zuivel }],
    instructions: ['Verwarm de melk'],
    tags: ['snel'],
};

function mountPage() {
    return mount(RecipesPage, {
        global: {
            components: {
                RecipeCard: RecipeCardStub,
                RecipeForm,
            },
        },
    });
}

async function openMyRecipesTab(wrapper: ReturnType<typeof mountPage>): Promise<void> {
    await wrapper.findAll('.tab')[3].trigger('click');
}

describe('pages/recipes.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('my recipes tab', () => {
        it('shows an empty state when the user has no own recipes', async () => {
            // #given
            const wrapper = mountPage();

            // #when
            await openMyRecipesTab(wrapper);

            // #then
            expect(wrapper.find('.empty-state').text()).toBe('Nog geen eigen recepten.');
        });

        it('lists the user recipes', async () => {
            // #given
            const wrapper = mountPage();
            useRecipeStore().addRecipe(NEW_RECIPE);

            // #when
            await openMyRecipesTab(wrapper);

            // #then
            expect(wrapper.findAll('.user-recipe')).toHaveLength(1);
        });

        it('adds the submitted recipe to the store', async () => {
            // #given
            const wrapper = mountPage();
            const store = useRecipeStore();
            await openMyRecipesTab(wrapper);

            // #when
            await wrapper.find('.new-recipe-btn').trigger('click');
            wrapper.findComponent(RecipeForm).vm.$emit('submit', NEW_RECIPE);
            await wrapper.vm.$nextTick();

            // #then
            expect(store.userRecipes).toEqual([{ ...NEW_RECIPE, id: 'user-1' }]);
        });

        it('closes the form after adding a recipe', async () => {
            // #given
            const wrapper = mountPage();
            await openMyRecipesTab(wrapper);

            // #when
            await wrapper.find('.new-recipe-btn').trigger('click');
            wrapper.findComponent(RecipeForm).vm.$emit('submit', NEW_RECIPE);
            await wrapper.vm.$nextTick();

            // #then
            expect(wrapper.findComponent(RecipeForm).exists()).toBe(false);
        });

        it('updates the edited recipe instead of adding a new one', async () => {
            // #given
            const wrapper = mountPage();
            const store = useRecipeStore();
            store.addRecipe(NEW_RECIPE);
            await openMyRecipesTab(wrapper);

            // #when
            await wrapper.find('.edit-recipe-btn').trigger('click');
            wrapper
                .findComponent(RecipeForm)
                .vm.$emit('submit', { ...NEW_RECIPE, name: 'Andere naam' });
            await wrapper.vm.$nextTick();

            // #then
            expect(store.userRecipes).toEqual([
                { ...NEW_RECIPE, name: 'Andere naam', id: 'user-1' },
            ]);
        });

        it('closes the form on cancel', async () => {
            // #given
            const wrapper = mountPage();
            await openMyRecipesTab(wrapper);

            // #when
            await wrapper.find('.new-recipe-btn').trigger('click');
            wrapper.findComponent(RecipeForm).vm.$emit('cancel');
            await wrapper.vm.$nextTick();

            // #then
            expect(wrapper.findComponent(RecipeForm).exists()).toBe(false);
        });

        it('deletes the recipe from the store', async () => {
            // #given
            const wrapper = mountPage();
            const store = useRecipeStore();
            store.addRecipe(NEW_RECIPE);
            await openMyRecipesTab(wrapper);

            // #when
            await wrapper.find('.delete-recipe-btn').trigger('click');

            // #then
            expect(store.userRecipes).toEqual([]);
        });
    });

    describe('all recipes tab', () => {
        it('lists the user recipes next to the built-in ones', async () => {
            // #given
            const wrapper = mountPage();
            const store = useRecipeStore();
            store.allRecipes = [];
            store.addRecipe(NEW_RECIPE);

            // #when
            await wrapper.findAll('.tab')[1].trigger('click');

            // #then
            expect(wrapper.findAll('.recipe-card-stub')).toHaveLength(1);
        });
    });
});
