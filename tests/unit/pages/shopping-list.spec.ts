import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShoppingListPage from '~/pages/shopping-list.vue';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { useReceiptStore } from '~/stores/receiptStore';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
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

function makeReceiptItem(
    overrides: Partial<ReceiptItemInterface> = {},
): ReceiptItemInterface {
    return {
        name: 'melk',
        price: 1.5,
        quantity: 1,
        category: ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

const ProposalPanelStub = { name: 'ProposalPanel', template: '<div class="proposal-panel-stub" />' };

async function mountListTab() {
    const wrapper = mount(ShoppingListPage, {
        global: { stubs: { ProposalPanel: ProposalPanelStub } },
    });
    const listTab = wrapper.findAll('.tab').find((tab) => tab.text() === 'Mijn lijst');
    await listTab?.trigger('click');
    return wrapper;
}

describe('pages/shopping-list.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    describe('empty state', () => {
        it('renders the empty state and no category groups when there are no items', async () => {
            // #given
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.empty-state').text()).toContain(EMPTY_STATE_TEXT);
            expect(wrapper.findAll('.category-group')).toHaveLength(0);
        });
    });

    describe('items by category', () => {
        it('renders a group per category with its items', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [
                makeListItem({ name: 'Melk', category: ProductCategoryEnum.zuivel }),
                makeListItem({ name: 'Kaas', category: ProductCategoryEnum.zuivel }),
                makeListItem({ name: 'Appel', category: ProductCategoryEnum.fruit }),
            ];

            // #when
            const wrapper = await mountListTab();

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
            const wrapper = await mountListTab();

            // #when
            await wrapper.find('.item-checkbox').trigger('change');

            // #then
            expect(store.items[0].checked).toBe(true);
            expect(wrapper.find('.list-item').classes()).toContain('list-item--checked');
        });
    });

    describe('estimated cost', () => {
        it('shows the estimated total for the unchecked items', async () => {
            // #given
            const receiptStore = useReceiptStore();
            receiptStore.receipts = [
                {
                    id: 'receipt-1',
                    date: '2026-01-10',
                    items: [makeReceiptItem({ name: 'melk', price: 1.5, quantity: 1 })],
                    total: 1.5,
                    storeName: 'Albert Heijn',
                },
            ];
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Melk', checked: false })];

            // #when
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.estimated-total-value').text()).toContain('1.50');
        });

        it('shows the item price when purchase history exists', async () => {
            // #given
            const receiptStore = useReceiptStore();
            receiptStore.receipts = [
                {
                    id: 'receipt-1',
                    date: '2026-01-10',
                    items: [makeReceiptItem({ name: 'melk', price: 1.5, quantity: 1 })],
                    total: 1.5,
                    storeName: 'Albert Heijn',
                },
            ];
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Melk' })];

            // #when
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.item-price').text()).toContain('1.50');
        });

        it('shows a no-price-data state for items without purchase history', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Onbekend' })];

            // #when
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.item-price').text()).toContain('geen prijsdata');
        });
    });

    describe('generate from week plan', () => {
        it('calls generateFromWeekPlan when the button is clicked', async () => {
            // #given
            const store = useShoppingListStore();
            const generateSpy = vi.spyOn(store, 'generateFromWeekPlan');
            const wrapper = await mountListTab();
            const button = wrapper
                .findAll('.action-btn')
                .find((btn) => btn.text() === 'Genereer uit weekplan');

            // #when
            await button?.trigger('click');

            // #then
            expect(generateSpy).toHaveBeenCalledOnce();
        });

        it('shows which day and recipe a generated item came from', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [
                makeListItem({
                    name: 'Boerenkool',
                    sources: [{ day: 'Maandag', recipeName: 'Stamppot' }],
                }),
            ];

            // #when
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.item-sources').text()).toContain('Maandag (Stamppot)');
        });

        it('does not show the sources note for manually added items', async () => {
            // #given
            const store = useShoppingListStore();
            store.items = [makeListItem({ name: 'Melk' })];

            // #when
            const wrapper = await mountListTab();

            // #then
            expect(wrapper.find('.item-sources').exists()).toBe(false);
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
            const wrapper = await mountListTab();

            // #when
            await wrapper.findAll('.item-remove')[0].trigger('click');

            // #then
            expect(store.items.map((item) => item.name)).toEqual(['Kaas']);
            expect(wrapper.findAll('.item-text').map((item) => item.text())).toEqual(['Kaas']);
        });
    });
});
