import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SpendingChart from '~/components/SpendingChart.vue';

function makeSpending(overrides: Record<string, number> = {}): Record<string, number> {
    return {
        zuivel: 10,
        vlees: 30,
        groente: 20,
        ...overrides,
    };
}

function mountChart(spendingByCategory: Record<string, number>, totalSpent: number) {
    return mount(SpendingChart, {
        props: { spendingByCategory, totalSpent },
    });
}

describe('SpendingChart', () => {
    describe('ordering', () => {
        it('renders the categories in descending amount order', () => {
            // #given
            const wrapper = mountChart(makeSpending(), 60);

            // #when
            const labels = wrapper.findAll('.chart-label').map((label) => label.text());

            // #then
            expect(labels).toEqual(['vlees', 'groente', 'zuivel']);
        });

        it('renders a chart row for every category', () => {
            // #given
            const wrapper = mountChart(makeSpending(), 60);

            // #then
            expect(wrapper.findAll('.chart-row')).toHaveLength(3);
        });

        it('renders no chart rows when there is no spending data', () => {
            // #given
            const wrapper = mountChart({}, 0);

            // #then
            expect(wrapper.findAll('.chart-row')).toHaveLength(0);
        });
    });

    describe('bar width', () => {
        it('sets the bar width to the share of the total spent', () => {
            // #given
            const wrapper = mountChart(makeSpending(), 60);

            // #when
            const widths = wrapper
                .findAll('.chart-bar')
                .map((bar) => Number.parseFloat(bar.attributes('style')!.replace(/\D*([\d.]+)%.*/, '$1')));

            // #then
            expect(widths[0]).toBeCloseTo(50);
            expect(widths[1]).toBeCloseTo(100 / 3);
            expect(widths[2]).toBeCloseTo(100 / 6);
        });

        it('falls back to a zero width when the total spent is zero', () => {
            // #given
            const wrapper = mountChart({ zuivel: 10 }, 0);

            // #then
            expect(wrapper.find('.chart-bar').attributes('style')).toBe('width: 0%;');
        });
    });

    describe('amounts', () => {
        it('renders the amount formatted with two decimals', () => {
            // #given
            const wrapper = mountChart({ zuivel: 10.5 }, 10.5);

            // #then
            expect(wrapper.find('.chart-amount').text()).toBe('€10.50');
        });
    });
});
