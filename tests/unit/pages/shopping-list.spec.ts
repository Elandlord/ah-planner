import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShoppingListPage from '~/pages/shopping-list.vue';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const EMPTY_STATE_TEXT = 'Je boodschappenlijst is leeg';

function makeListItem(
    overrides: Partial<ShoppingListItemInterface> = {},
): ShoppingListItemInterface {
    return {
        name: 'Melk',
        category: ProductCategoryEnum.zuivel,
        checked: false,
        frequency: 3,
        ...overrides,
    };
}

describe('pages/shopping-list.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('empty state', () => {
        it('renders the empty state and no category groups when there are no items', () => {
            // #given
            const wrapper = mount(ShoppingListPage);

            // #then
            expect(wrapper.find('.empty-state').text()).toContain(EMPTY_STATE_TEXT);
            expect(wrapper.findAll('.category-group')).toHaveLength(0);
        });
    });

    describe('items by category', () => {
        it('renders a group per category with its items', () => {
            // #given
            const store = useShoppingListStore();
            store.items = [
                makeListItem({ name: 'Melk', category: ProductCategoryEnum.zuivel }),
                makeListItem({ name: 'Kaas', category: ProductCategoryEnum.zuivel }),
                makeListItem({ name: 'Appel', category: ProductCategoryEnum.fruit }),
            ];

            // #when
            const wrapper = mount(ShoppingListPage);

            // #then
            const groups = wrapper.findAll('.category-group');
            expect(groups).toHaveLength(2);
            expect(groups[0].find('.category-title').text()).toBe(ProductCategoryEnum.zuivel);
            expect(groups[0].findAll('.item-text').map((item) => item.text())).toEqual([
                'Melk',
                'Kaas',
            ]);
            expect(groups[1].find('.category-title').text()).toBe(ProductCategoryEnum.fruit);
            expect(groups[1].findAll('.item-text').map((item) => item.text())).toEqual(['Appel']);
            expect(wrapper.find('.empty-state').exists()).toBe(false);
        });
    });

    describe('toggle', () => {
        it('checks the item in the store and marks the row as checked', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Melk' })];
            const wrapper = mount(ShoppingListPage);

            // #when
            await wrapper.find('.item-checkbox').trigger('change');

            // #then
            expect(store.items[0].checked).toBe(true);
            expect(wrapper.find('.list-item').classes()).toContain('list-item--checked');
        });
    });

    describe('remove', () => {
        it('removes the item from the store and from the list', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [
                makeListItem({ name: 'Melk' }),
                makeListItem({ name: 'Kaas' }),
            ];
            const wrapper = mount(ShoppingListPage);

            // #when
            await wrapper.findAll('.item-remove')[0].trigger('click');

            // #then
            expect(store.items.map((item) => item.name)).toEqual(['Kaas']);
            expect(wrapper.findAll('.item-text').map((item) => item.text())).toEqual(['Kaas']);
        });
    });
});
