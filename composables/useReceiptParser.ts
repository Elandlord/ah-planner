import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import type ReceiptInterface from '~/types/ReceiptInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const CATEGORY_KEYWORDS: Record<string, ProductCategoryEnum> = {
    sla: ProductCategoryEnum.groente,
    tomaat: ProductCategoryEnum.groente,
    tomaten: ProductCategoryEnum.groente,
    komkommer: ProductCategoryEnum.groente,
    paprika: ProductCategoryEnum.groente,
    ui: ProductCategoryEnum.groente,
    uien: ProductCategoryEnum.groente,
    wortel: ProductCategoryEnum.groente,
    aardappel: ProductCategoryEnum.groente,
    aardappelen: ProductCategoryEnum.groente,
    broccoli: ProductCategoryEnum.groente,
    bloemkool: ProductCategoryEnum.groente,
    spinazie: ProductCategoryEnum.groente,
    prei: ProductCategoryEnum.groente,
    champignon: ProductCategoryEnum.groente,
    champignons: ProductCategoryEnum.groente,
    courgette: ProductCategoryEnum.groente,
    boerenkool: ProductCategoryEnum.groente,
    andijvie: ProductCategoryEnum.groente,
    witlof: ProductCategoryEnum.groente,

    appel: ProductCategoryEnum.fruit,
    banaan: ProductCategoryEnum.fruit,
    bananen: ProductCategoryEnum.fruit,
    peer: ProductCategoryEnum.fruit,
    sinaasappel: ProductCategoryEnum.fruit,
    druiven: ProductCategoryEnum.fruit,
    citroen: ProductCategoryEnum.fruit,
    aardbei: ProductCategoryEnum.fruit,

    kip: ProductCategoryEnum.vlees,
    kipfilet: ProductCategoryEnum.vlees,
    gehakt: ProductCategoryEnum.vlees,
    rookworst: ProductCategoryEnum.vlees,
    spek: ProductCategoryEnum.vlees,
    ham: ProductCategoryEnum.vlees,
    worst: ProductCategoryEnum.vlees,
    biefstuk: ProductCategoryEnum.vlees,

    zalm: ProductCategoryEnum.vis,
    tilapia: ProductCategoryEnum.vis,
    garnalen: ProductCategoryEnum.vis,
    vis: ProductCategoryEnum.vis,
    schelvis: ProductCategoryEnum.vis,

    melk: ProductCategoryEnum.zuivel,
    kaas: ProductCategoryEnum.zuivel,
    yoghurt: ProductCategoryEnum.zuivel,
    boter: ProductCategoryEnum.zuivel,
    ei: ProductCategoryEnum.zuivel,
    eieren: ProductCategoryEnum.zuivel,
    room: ProductCategoryEnum.zuivel,
    kwark: ProductCategoryEnum.zuivel,

    brood: ProductCategoryEnum.brood,
    croissant: ProductCategoryEnum.brood,
    pita: ProductCategoryEnum.brood,
    wrap: ProductCategoryEnum.brood,
    tortilla: ProductCategoryEnum.brood,

    cola: ProductCategoryEnum.dranken,
    sap: ProductCategoryEnum.dranken,
    water: ProductCategoryEnum.dranken,
    bier: ProductCategoryEnum.dranken,
    wijn: ProductCategoryEnum.dranken,
    thee: ProductCategoryEnum.dranken,
    koffie: ProductCategoryEnum.dranken,

    spaghetti: ProductCategoryEnum.pasta,
    macaroni: ProductCategoryEnum.pasta,
    penne: ProductCategoryEnum.pasta,
    pasta: ProductCategoryEnum.pasta,
    noodles: ProductCategoryEnum.pasta,

    rijst: ProductCategoryEnum.rijst,
    basmati: ProductCategoryEnum.rijst,

    blik: ProductCategoryEnum.conserven,
    tomatensaus: ProductCategoryEnum.conserven,
    bonen: ProductCategoryEnum.conserven,
    kokosmelk: ProductCategoryEnum.conserven,

    peper: ProductCategoryEnum.kruiden,
    zout: ProductCategoryEnum.kruiden,
    kerrie: ProductCategoryEnum.kruiden,
    ketjap: ProductCategoryEnum.kruiden,
    sambal: ProductCategoryEnum.kruiden,
    kruiden: ProductCategoryEnum.kruiden,

    chips: ProductCategoryEnum.snacks,
    noten: ProductCategoryEnum.snacks,
    koek: ProductCategoryEnum.snacks,
    chocola: ProductCategoryEnum.snacks,
    snoep: ProductCategoryEnum.snacks,

    diepvries: ProductCategoryEnum.diepvries,

    schoonmaak: ProductCategoryEnum.huishouden,
    afwasmiddel: ProductCategoryEnum.huishouden,
    toiletpapier: ProductCategoryEnum.huishouden,
    wc: ProductCategoryEnum.huishouden,
    wasmiddel: ProductCategoryEnum.huishouden,
};

function categorizeProduct(name: string): ProductCategoryEnum {
    const lowerName = name.toLowerCase();
    for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
        if (lowerName.includes(keyword)) {
            return category;
        }
    }
    return ProductCategoryEnum.overig;
}

export function parseReceiptText(rawText: string): ReceiptItemInterface[] {
    const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);
    const items: ReceiptItemInterface[] = [];

    const pricePattern = /^(.+?)\s+(\d+[.,]\d{2})\s*$/;
    const quantityPricePattern = /^(\d+)\s*[xX]\s*(.+?)\s+(\d+[.,]\d{2})\s*$/;

    for (const line of lines) {
        if (isIgnoredLine(line)) {
            continue;
        }

        const qtyMatch = line.match(quantityPricePattern);
        if (qtyMatch) {
            items.push({
                name: qtyMatch[2].trim(),
                quantity: parseInt(qtyMatch[1], 10),
                price: parsePrice(qtyMatch[3]),
                category: categorizeProduct(qtyMatch[2]),
            });
            continue;
        }

        const priceMatch = line.match(pricePattern);
        if (priceMatch) {
            items.push({
                name: priceMatch[1].trim(),
                quantity: 1,
                price: parsePrice(priceMatch[2]),
                category: categorizeProduct(priceMatch[1]),
            });
        }
    }

    return items;
}

function isIgnoredLine(line: string): boolean {
    const ignoredPatterns = [
        /^albert\s*heijn/i,
        /^ah\s(?!.*\d+[.,]\d{2}\s*$)/i,
        /^subtotaal/i,
        /^totaal/i,
        /^pin\s/i,
        /^betaald/i,
        /^datum/i,
        /^kassanr/i,
        /^bon\s*nr/i,
        /^btw/i,
        /^\d{2}[-.\/]\d{2}[-.\/]\d{2,4}/,
        /^-+$/,
        /^=+$/,
        /^\*+$/,
    ];
    return ignoredPatterns.some((pattern) => pattern.test(line.trim()));
}

function parsePrice(priceStr: string): number {
    return parseFloat(priceStr.replace(',', '.'));
}

export function extractTotal(rawText: string): number {
    const lines = rawText.split('\n');
    for (const line of lines) {
        const totalMatch = line.match(/(?:totaal|subtotaal)\s+(\d+[.,]\d{2})/i);
        if (totalMatch) {
            return parsePrice(totalMatch[1]);
        }
    }
    return 0;
}

export function extractDate(rawText: string): string {
    const lines = rawText.split('\n');
    for (const line of lines) {
        const dateMatch = line.match(/(\d{2})[-.\/](\d{2})[-.\/](\d{2,4})/);
        if (dateMatch) {
            const day = dateMatch[1];
            const month = dateMatch[2];
            const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
            return `${year}-${month}-${day}`;
        }
    }
    return new Date().toISOString().split('T')[0];
}

export function buildReceipt(rawText: string): ReceiptInterface {
    const items = parseReceiptText(rawText);
    const total = extractTotal(rawText) || items.reduce(
        (sum, item) => sum + item.price * item.quantity, 0,
    );
    const date = extractDate(rawText);

    return {
        id: crypto.randomUUID(),
        date,
        items,
        total,
        storeName: 'Albert Heijn',
    };
}

export function useReceiptParser() {
    return {
        parseReceiptText,
        extractTotal,
        extractDate,
        buildReceipt,
        categorizeProduct,
    };
}
