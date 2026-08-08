import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RecipeForm from '~/components/RecipeForm.vue';
import type RecipeInterface from '~/types/RecipeInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

function makeRecipe(overrides: Partial<RecipeInterface> = {}): RecipeInterface {
    return {
        id: 'user-1',
        name: 'Pasta Bolognese',
        description: 'Klassieke Italiaanse pasta',
        servings: 4,
        prepTimeMinutes: 30,
        ingredients: [{ name: 'Gehakt', amount: '500g', category: ProductCategoryEnum.vlees }],
        instructions: ['Kook de pasta', 'Bak het gehakt'],
        tags: ['italiaans', 'snel'],
        ...overrides,
    };
}

async function fillMinimalRecipe(wrapper: ReturnType<typeof mount>): Promise<void> {
    const fields = wrapper.findAll('.field-input');
    await fields[0].setValue('Eigen recept');
    await wrapper.find('.ingredient-name').setValue('melk');
}

describe('RecipeForm', () => {
    describe('submit', () => {
        it('emits the filled in recipe without an id', async () => {
            // #given
            const wrapper = mount(RecipeForm);
            const fields = wrapper.findAll('.field-input');

            // #when
            await fields[0].setValue('Eigen recept');
            await fields[1].setValue('Zelfbedacht');
            await fields[2].setValue(2);
            await fields[3].setValue(15);
            await wrapper.find('.ingredient-name').setValue('melk');
            await wrapper.find('.ingredient-amount').setValue('100ml');
            await wrapper.find('.ingredient-category').setValue(ProductCategoryEnum.zuivel);
            await wrapper.find('textarea').setValue('Verwarm de melk\nServeer');
            await wrapper.findAll('.field-input').at(-1)?.setValue('snel, zoet');
            await wrapper.find('form').trigger('submit');

            // #then
            expect(wrapper.emitted('submit')?.[0]).toEqual([
                {
                    name: 'Eigen recept',
                    description: 'Zelfbedacht',
                    servings: 2,
                    prepTimeMinutes: 15,
                    ingredients: [
                        {
                            name: 'melk',
                            amount: '100ml',
                            category: ProductCategoryEnum.zuivel,
                        },
                    ],
                    instructions: ['Verwarm de melk', 'Serveer'],
                    tags: ['snel', 'zoet'],
                },
            ]);
        });

        it('drops ingredients that were left empty', async () => {
            // #given
            const wrapper = mount(RecipeForm);
            await fillMinimalRecipe(wrapper);

            // #when
            await wrapper.find('.add-ingredient').trigger('click');
            await wrapper.find('form').trigger('submit');

            // #then
            const submitted = wrapper.emitted('submit')?.[0][0] as Omit<RecipeInterface, 'id'>;
            expect(submitted.ingredients).toHaveLength(1);
        });

        it('does not emit without a name', async () => {
            // #given
            const wrapper = mount(RecipeForm);

            // #when
            await wrapper.find('.ingredient-name').setValue('melk');
            await wrapper.find('form').trigger('submit');

            // #then
            expect(wrapper.emitted('submit')).toBeUndefined();
        });

        it('does not emit without a single ingredient', async () => {
            // #given
            const wrapper = mount(RecipeForm);

            // #when
            await wrapper.findAll('.field-input')[0].setValue('Eigen recept');
            await wrapper.find('form').trigger('submit');

            // #then
            expect(wrapper.emitted('submit')).toBeUndefined();
        });
    });

    describe('editing', () => {
        it('prefills the fields with the given recipe', () => {
            // #given
            const recipe = makeRecipe();

            // #when
            const wrapper = mount(RecipeForm, { props: { recipe } });

            // #then
            const fields = wrapper.findAll('input');
            expect((fields[0].element as HTMLInputElement).value).toBe('Pasta Bolognese');
            expect(wrapper.find('textarea').element.value).toBe('Kook de pasta\nBak het gehakt');
            expect((fields.at(-1)?.element as HTMLInputElement).value).toBe('italiaans, snel');
        });

        it('emits the edited recipe', async () => {
            // #given
            const wrapper = mount(RecipeForm, { props: { recipe: makeRecipe() } });

            // #when
            await wrapper.findAll('.field-input')[0].setValue('Andere naam');
            await wrapper.find('form').trigger('submit');

            // #then
            const submitted = wrapper.emitted('submit')?.[0][0] as Omit<RecipeInterface, 'id'>;
            expect(submitted.name).toBe('Andere naam');
        });

        it('leaves the given recipe untouched while editing', async () => {
            // #given
            const recipe = makeRecipe();
            const wrapper = mount(RecipeForm, { props: { recipe } });

            // #when
            await wrapper.find('.ingredient-name').setValue('Kip');

            // #then
            expect(recipe.ingredients[0].name).toBe('Gehakt');
        });
    });

    describe('ingredients', () => {
        it('adds an ingredient row', async () => {
            // #given
            const wrapper = mount(RecipeForm);

            // #when
            await wrapper.find('.add-ingredient').trigger('click');

            // #then
            expect(wrapper.findAll('.ingredient-row')).toHaveLength(2);
        });

        it('removes an ingredient row', async () => {
            // #given
            const wrapper = mount(RecipeForm);
            await wrapper.find('.add-ingredient').trigger('click');

            // #when
            await wrapper.findAll('.remove-ingredient')[0].trigger('click');

            // #then
            expect(wrapper.findAll('.ingredient-row')).toHaveLength(1);
        });
    });

    describe('cancel', () => {
        it('emits cancel', async () => {
            // #given
            const wrapper = mount(RecipeForm);

            // #when
            await wrapper.find('.cancel-btn').trigger('click');

            // #then
            expect(wrapper.emitted('cancel')).toHaveLength(1);
        });
    });
});
