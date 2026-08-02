import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RecipeCard from '~/components/RecipeCard.vue';
import type RecipeInterface from '~/types/RecipeInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

function makeRecipe(overrides: Partial<RecipeInterface> = {}): RecipeInterface {
    return {
        id: 'r1',
        name: 'Pasta Bolognese',
        description: 'Klassieke Italiaanse pasta',
        servings: 4,
        prepTimeMinutes: 30,
        ingredients: [
            { name: 'Gehakt', amount: '500g', category: ProductCategoryEnum.vlees },
        ],
        instructions: ['Kook de pasta', 'Bak het gehakt'],
        tags: ['italiaans'],
        ...overrides,
    };
}

describe('RecipeCard', () => {
    describe('expand', () => {
        it('hides the recipe details by default and toggles them on expand click', async () => {
            // #given
            const wrapper = mount(RecipeCard, {
                attachTo: document.body,
                props: { recipe: makeRecipe(), isSaved: false },
            });

            // #then
            expect(wrapper.find('.recipe-details').isVisible()).toBe(false);

            // #when
            await wrapper.find('.expand-btn').trigger('click');

            // #then
            expect(wrapper.find('.recipe-details').isVisible()).toBe(true);

            // #when
            await wrapper.find('.expand-btn').trigger('click');

            // #then
            expect(wrapper.find('.recipe-details').isVisible()).toBe(false);
        });
    });

    describe('save', () => {
        it('emits toggleSave when the save button is clicked', async () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: false },
            });

            // #when
            await wrapper.find('.save-btn').trigger('click');

            // #then
            expect(wrapper.emitted('toggleSave')).toHaveLength(1);
        });

        it('applies the save-btn--saved class when isSaved is true', () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: true },
            });

            // #then
            expect(wrapper.find('.save-btn').classes()).toContain('save-btn--saved');
        });

        it('does not apply the save-btn--saved class when isSaved is false', () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: false },
            });

            // #then
            expect(wrapper.find('.save-btn').classes()).not.toContain('save-btn--saved');
        });
    });

    describe('assign', () => {
        it('emits assign when the assign button is clicked', async () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: false },
            });
            await wrapper.find('.expand-btn').trigger('click');

            // #when
            await wrapper.find('.assign-btn').trigger('click');

            // #then
            expect(wrapper.emitted('assign')).toHaveLength(1);
        });
    });
});
