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
            expect(wrapper.find('.recipe-details').exists()).toBe(false);

            // #when
            await wrapper.find('.expand-btn').trigger('click');

            // #then
            expect(wrapper.find('.recipe-details').exists()).toBe(true);

            // #when
            await wrapper.find('.expand-btn').trigger('click');

            // #then
            expect(wrapper.find('.recipe-details').exists()).toBe(false);
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

    describe('plan', () => {
        it('emits the days that were picked', async () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: false, days: ['Maandag', 'Dinsdag'] },
            });

            // #when
            await wrapper.findAll('.day-chip')[0].trigger('click');
            await wrapper.findAll('.day-chip')[1].trigger('click');
            await wrapper.find('.plan-btn').trigger('click');

            // #then
            expect(wrapper.emitted('plan')).toEqual([[['Maandag', 'Dinsdag']]]);
        });

        it('does not plan anything without a day', async () => {
            // #given
            const wrapper = mount(RecipeCard, {
                props: { recipe: makeRecipe(), isSaved: false, days: ['Maandag'] },
            });

            // #when
            await wrapper.find('.plan-btn').trigger('click');

            // #then
            expect(wrapper.emitted('plan')).toBeUndefined();
        });
    });
});
