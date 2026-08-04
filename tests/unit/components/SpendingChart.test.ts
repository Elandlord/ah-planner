import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SpendingChart from '~/components/SpendingChart.vue';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

function mountChart(spendingByCategory: Record<string, number>, totalSpent: number) {
    return mount(SpendingChart, { props: { spendingByCategory, totalSpent } });
}

describe('SpendingChart', () => {
    describe('rows', () => {
        it('renders one row per category sorted by amount descending', () => {
            // #given
            const spendingByCategory = {
                [ProductCategoryEnum.zuivel]: 5,
                [ProductCategoryEnum.fruit]: 15,
                [ProductCategoryEnum.brood]: 10,
            };

            // #when
            const wrapper = mountChart(spendingByCategory, 30);

            // #then
            const rows = wrapper.findAll('.chart-row');
            expect(rows).toHaveLength(3);
            expect(rows.map((row) => row.find('.chart-label').text())).toEqual([
                ProductCategoryEnum.fruit,
                ProductCategoryEnum.brood,
                ProductCategoryEnum.zuivel,
            ]);
        });

        it('renders the formatted amount per row', () => {
            // #given
            const spendingByCategory = { [ProductCategoryEnum.zuivel]: 12.5 };

            // #when
            const wrapper = mountChart(spendingByCategory, 12.5);

            // #then
            expect(wrapper.find('.chart-amount').text()).toBe('€12.50');
        });

        it('renders no rows when spendingByCategory is empty', () => {
            // #when
            const wrapper = mountChart({}, 0);

            // #then
            expect(wrapper.findAll('.chart-row')).toHaveLength(0);
        });
    });

    describe('bar width', () => {
        it('sizes each bar as a percentage of the total spent', () => {
            // #given
            const spendingByCategory = { [ProductCategoryEnum.zuivel]: 25 };

            // #when
            const wrapper = mountChart(spendingByCategory, 100);

            // #then
            expect(wrapper.find('.chart-bar').attributes('style')).toContain('width: 25%');
        });

        it('renders a zero-width bar when totalSpent is zero', () => {
            // #given
            const spendingByCategory = { [ProductCategoryEnum.zuivel]: 0 };

            // #when
            const wrapper = mountChart(spendingByCategory, 0);

            // #then
            expect(wrapper.find('.chart-bar').attributes('style')).toContain('width: 0%');
        });
    });
});
