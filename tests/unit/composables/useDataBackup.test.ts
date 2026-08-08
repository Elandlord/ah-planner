import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDataBackup } from '~/composables/useDataBackup';
import { useCategoryOverrideStore } from '~/stores/categoryOverrideStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { useRecipeStore } from '~/stores/recipeStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import type CategoryOverridesInterface from '~/types/CategoryOverridesInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type RecipeInterface from '~/types/RecipeInterface';
import type ShoppingListItemInterface from '~/types/ShoppingListItemInterface';
import type BackupInterface from '~/types/BackupInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const { downloadFileMock } = vi.hoisted(() => ({
    downloadFileMock: vi.fn(),
}));

vi.mock('~/composables/useReceiptExport', () => ({
    downloadFile: downloadFileMock,
}));

function createLocalStorageStub() {
    const entries = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

function makeItem(overrides: Partial<ReceiptItemInterface> = {}): ReceiptItemInterface {
    return {
        name: 'melk',
        price: 1.29,
        quantity: 1,
        category: ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

function makeReceipt(overrides: Partial<ReceiptInterface> = {}): ReceiptInterface {
    return {
        id: 'receipt-1',
        date: '2026-01-10',
        items: [makeItem()],
        total: 1.29,
        storeName: 'Albert Heijn',
        ...overrides,
    };
}

function makeListItem(
    overrides: Partial<ShoppingListItemInterface> = {},
): ShoppingListItemInterface {
    return {
        name: 'Melk',
        category: ProductCategoryEnum.zuivel,
        checked: false,
        frequency: 1,
        ...overrides,
    };
}

function makeRecipe(overrides: Partial<RecipeInterface> = {}): RecipeInterface {
    return {
        id: 'user-1',
        name: 'Pannenkoeken',
        description: 'Nederlandse pannenkoeken.',
        servings: 4,
        prepTimeMinutes: 20,
        ingredients: [],
        instructions: ['Bak de pannenkoeken.'],
        tags: ['klassiek'],
        ...overrides,
    };
}

function makeCategoryOverrides(
    overrides: Partial<CategoryOverridesInterface> = {},
): CategoryOverridesInterface {
    return {
        'ah zuivelspr': ProductCategoryEnum.zuivel,
        ...overrides,
    };
}

function makeBackup(overrides: Partial<BackupInterface> = {}): BackupInterface {
    return {
        version: 2,
        exportedAt: '2026-01-10T00:00:00.000Z',
        receipts: [makeReceipt()],
        savedRecipeIds: ['recipe-1'],
        weekPlans: { '2026-01-05': { woensdag: 'recipe-1' } },
        shoppingList: [makeListItem()],
        userRecipes: [makeRecipe()],
        categoryOverrides: makeCategoryOverrides(),
        ...overrides,
    } as BackupInterface;
}

describe('useDataBackup', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createLocalStorageStub());
        setActivePinia(createPinia());
        downloadFileMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('exportBackup', () => {
        it('downloads a JSON file containing every store', () => {
            // #given
            const recipeStore = useRecipeStore();
            useReceiptStore().receipts = [makeReceipt()];
            recipeStore.savedRecipeIds = ['recipe-1'];
            recipeStore.weekPlans[recipeStore.currentWeekStart] = { woensdag: 'recipe-1' };
            recipeStore.userRecipes = [makeRecipe()];
            useShoppingListStore().items = [makeListItem()];
            useCategoryOverrideStore().overrides = makeCategoryOverrides();
            const { exportBackup } = useDataBackup();

            // #when
            exportBackup();

            // #then
            expect(downloadFileMock).toHaveBeenCalledTimes(1);
            const [content, filename, mimeType] = downloadFileMock.mock.calls[0];
            const parsed = JSON.parse(content) as BackupInterface;
            expect(parsed).toEqual({
                version: 2,
                exportedAt: parsed.exportedAt,
                receipts: [makeReceipt()],
                savedRecipeIds: ['recipe-1'],
                weekPlans: { [recipeStore.currentWeekStart]: { woensdag: 'recipe-1' } },
                shoppingList: [makeListItem()],
                userRecipes: [makeRecipe()],
                categoryOverrides: makeCategoryOverrides(),
            });
            expect(filename).toBe(`ah-planner-backup-${parsed.exportedAt.slice(0, 10)}.json`);
            expect(mimeType).toBe('application/json');
        });
    });

    describe('importBackup', () => {
        it('restores the receipts, recipe data and shopping list into their stores', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = makeBackup();

            // #when
            importBackup(JSON.stringify(backup));

            // #then
            const backupV2 = backup as Extract<BackupInterface, { version: 2 }>;
            expect(useReceiptStore().receipts).toEqual(backup.receipts);
            expect(useRecipeStore().savedRecipeIds).toEqual(backup.savedRecipeIds);
            expect(useRecipeStore().weekPlans).toEqual(backupV2.weekPlans);
            expect(useRecipeStore().userRecipes).toEqual(backup.userRecipes);
            expect(useShoppingListStore().items).toEqual(backup.shoppingList);
            expect(useCategoryOverrideStore().overrides).toEqual(backup.categoryOverrides);
        });

        it('migrates a legacy version 1 backup into the current week', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = makeBackup({
                version: 1,
                weekPlan: { woensdag: 'recipe-1' },
            } as Partial<BackupInterface>);
            delete (backup as unknown as Record<string, unknown>).weekPlans;

            // #when
            importBackup(JSON.stringify(backup));

            // #then
            const recipeStore = useRecipeStore();
            expect(recipeStore.weekPlans).toEqual({
                [recipeStore.currentWeekStart]: { woensdag: 'recipe-1' },
            });
        });

        it('throws when the input is not valid JSON', () => {
            // #given
            const { importBackup } = useDataBackup();

            // #when / #then
            expect(() => importBackup('not json')).toThrow(
                'Ongeldig back-upbestand: geen geldige JSON.',
            );
        });

        it('throws when the version is missing or unsupported', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = { ...makeBackup(), version: 3 };

            // #when / #then
            expect(() => importBackup(JSON.stringify(backup))).toThrow(
                'Ongeldig back-upbestand: onverwachte structuur.',
            );
        });

        it('throws when a required field is missing', () => {
            // #given
            const { importBackup } = useDataBackup();
            const { receipts: _receipts, ...backupWithoutReceipts } = makeBackup();

            // #when / #then
            expect(() => importBackup(JSON.stringify(backupWithoutReceipts))).toThrow(
                'Ongeldig back-upbestand: onverwachte structuur.',
            );
        });

        it('throws when a receipt entry has a malformed shape', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = makeBackup({ receipts: [{}] as unknown as ReceiptInterface[] });

            // #when / #then
            expect(() => importBackup(JSON.stringify(backup))).toThrow(
                'Ongeldig back-upbestand: onverwachte structuur.',
            );
        });

        it('throws when a receipt entry is not an object', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = makeBackup({
                receipts: ['not-an-object'] as unknown as ReceiptInterface[],
            });

            // #when / #then
            expect(() => importBackup(JSON.stringify(backup))).toThrow(
                'Ongeldig back-upbestand: onverwachte structuur.',
            );
        });

        it('throws when a user recipe entry has a malformed shape', () => {
            // #given
            const { importBackup } = useDataBackup();
            const backup = makeBackup({ userRecipes: [{}] as unknown as RecipeInterface[] });

            // #when / #then
            expect(() => importBackup(JSON.stringify(backup))).toThrow(
                'Ongeldig back-upbestand: onverwachte structuur.',
            );
        });

        it('does not modify the stores when the backup is invalid', () => {
            // #given
            useReceiptStore().receipts = [makeReceipt({ id: 'existing' })];
            const { importBackup } = useDataBackup();

            // #when
            try {
                importBackup('not json');
            } catch {
                // expected
            }

            // #then
            expect(useReceiptStore().receipts).toEqual([makeReceipt({ id: 'existing' })]);
        });
    });
});
