import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const EXACT_KEYWORD_LENGTH = 3;
const TRUNCATION_MIN_LENGTH = 4;
const CONTAINS_MIN_LENGTH = 4;

/**
 * Receipt lines are abbreviated and truncated (`VLOER VOLK`, `BIO TAGLIATE`) and often carry
 * only a brand (`ANDRELON`, `LAVAZZA`), so brands and stems belong here next to plain words.
 */
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
    courgette: ProductCategoryEnum.groente,
    boerenkool: ProductCategoryEnum.groente,
    andijvie: ProductCategoryEnum.groente,
    witlof: ProductCategoryEnum.groente,
    groente: ProductCategoryEnum.groente,
    roerbak: ProductCategoryEnum.groente,
    avocado: ProductCategoryEnum.groente,
    salade: ProductCategoryEnum.groente,
    rucola: ProductCategoryEnum.groente,
    bospeen: ProductCategoryEnum.groente,
    doperwt: ProductCategoryEnum.groente,

    appel: ProductCategoryEnum.fruit,
    banaan: ProductCategoryEnum.fruit,
    bananen: ProductCategoryEnum.fruit,
    peer: ProductCategoryEnum.fruit,
    sinaasappel: ProductCategoryEnum.fruit,
    druiven: ProductCategoryEnum.fruit,
    citroen: ProductCategoryEnum.fruit,
    aardbei: ProductCategoryEnum.fruit,
    aardbeien: ProductCategoryEnum.fruit,
    bessen: ProductCategoryEnum.fruit,
    blauwe: ProductCategoryEnum.fruit,
    framboos: ProductCategoryEnum.fruit,
    mandarijn: ProductCategoryEnum.fruit,
    meloen: ProductCategoryEnum.fruit,
    mango: ProductCategoryEnum.fruit,
    kiwi: ProductCategoryEnum.fruit,
    ananas: ProductCategoryEnum.fruit,
    nectarine: ProductCategoryEnum.fruit,
    lady: ProductCategoryEnum.fruit,
    elstar: ProductCategoryEnum.fruit,
    jonagold: ProductCategoryEnum.fruit,
    fruit: ProductCategoryEnum.fruit,

    kip: ProductCategoryEnum.vlees,
    kipfilet: ProductCategoryEnum.vlees,
    kipblokjes: ProductCategoryEnum.vlees,
    gehakt: ProductCategoryEnum.vlees,
    rookworst: ProductCategoryEnum.vlees,
    spek: ProductCategoryEnum.vlees,
    ham: ProductCategoryEnum.vlees,
    worst: ProductCategoryEnum.vlees,
    biefstuk: ProductCategoryEnum.vlees,
    schnitzel: ProductCategoryEnum.vlees,
    pate: ProductCategoryEnum.vlees,
    salami: ProductCategoryEnum.vlees,
    shoarma: ProductCategoryEnum.vlees,
    burger: ProductCategoryEnum.vlees,
    speklap: ProductCategoryEnum.vlees,
    rundvlees: ProductCategoryEnum.vlees,

    zalm: ProductCategoryEnum.vis,
    tilapia: ProductCategoryEnum.vis,
    garnalen: ProductCategoryEnum.vis,
    vis: ProductCategoryEnum.vis,
    schelvis: ProductCategoryEnum.vis,
    tonijn: ProductCategoryEnum.vis,
    haring: ProductCategoryEnum.vis,

    melk: ProductCategoryEnum.zuivel,
    kaas: ProductCategoryEnum.zuivel,
    yoghurt: ProductCategoryEnum.zuivel,
    boter: ProductCategoryEnum.zuivel,
    ei: ProductCategoryEnum.zuivel,
    eieren: ProductCategoryEnum.zuivel,
    room: ProductCategoryEnum.zuivel,
    kwark: ProductCategoryEnum.zuivel,
    vla: ProductCategoryEnum.zuivel,
    dzh: ProductCategoryEnum.zuivel,
    philadelphia: ProductCategoryEnum.zuivel,
    activia: ProductCategoryEnum.zuivel,
    campina: ProductCategoryEnum.zuivel,
    melkunie: ProductCategoryEnum.zuivel,
    breaker: ProductCategoryEnum.zuivel,
    alpro: ProductCategoryEnum.zuivel,
    zuivel: ProductCategoryEnum.zuivel,
    goudse: ProductCategoryEnum.zuivel,
    brie: ProductCategoryEnum.zuivel,
    mozzarella: ProductCategoryEnum.zuivel,
    scharrelei: ProductCategoryEnum.zuivel,

    brood: ProductCategoryEnum.brood,
    croissant: ProductCategoryEnum.brood,
    pita: ProductCategoryEnum.brood,
    wrap: ProductCategoryEnum.brood,
    tortilla: ProductCategoryEnum.brood,
    vloer: ProductCategoryEnum.brood,
    volkoren: ProductCategoryEnum.brood,
    tijger: ProductCategoryEnum.brood,
    stokbrood: ProductCategoryEnum.brood,
    bagel: ProductCategoryEnum.brood,
    muesli: ProductCategoryEnum.brood,
    cracker: ProductCategoryEnum.brood,
    beschuit: ProductCategoryEnum.brood,
    pannenkoek: ProductCategoryEnum.brood,
    pancake: ProductCategoryEnum.brood,
    burrito: ProductCategoryEnum.brood,
    spelt: ProductCategoryEnum.brood,

    cola: ProductCategoryEnum.dranken,
    sap: ProductCategoryEnum.dranken,
    fruitsap: ProductCategoryEnum.dranken,
    vruchtensap: ProductCategoryEnum.dranken,
    water: ProductCategoryEnum.dranken,
    bier: ProductCategoryEnum.dranken,
    wijn: ProductCategoryEnum.dranken,
    thee: ProductCategoryEnum.dranken,
    koffie: ProductCategoryEnum.dranken,
    lavazza: ProductCategoryEnum.dranken,
    pickwick: ProductCategoryEnum.dranken,
    guarana: ProductCategoryEnum.dranken,
    limonade: ProductCategoryEnum.dranken,
    drink: ProductCategoryEnum.dranken,
    smoothie: ProductCategoryEnum.dranken,

    spaghetti: ProductCategoryEnum.pasta,
    macaroni: ProductCategoryEnum.pasta,
    penne: ProductCategoryEnum.pasta,
    pasta: ProductCategoryEnum.pasta,
    noodles: ProductCategoryEnum.pasta,
    tagliatelle: ProductCategoryEnum.pasta,
    gnocchi: ProductCategoryEnum.pasta,
    lasagne: ProductCategoryEnum.pasta,
    couscous: ProductCategoryEnum.pasta,

    rijst: ProductCategoryEnum.rijst,
    basmati: ProductCategoryEnum.rijst,

    blik: ProductCategoryEnum.conserven,
    tomatensaus: ProductCategoryEnum.conserven,
    bonen: ProductCategoryEnum.conserven,
    kokosmelk: ProductCategoryEnum.conserven,
    soep: ProductCategoryEnum.conserven,
    pindakaas: ProductCategoryEnum.conserven,
    jam: ProductCategoryEnum.conserven,
    honing: ProductCategoryEnum.conserven,
    olijven: ProductCategoryEnum.conserven,
    mais: ProductCategoryEnum.conserven,

    peper: ProductCategoryEnum.kruiden,
    zout: ProductCategoryEnum.kruiden,
    kerrie: ProductCategoryEnum.kruiden,
    ketjap: ProductCategoryEnum.kruiden,
    sambal: ProductCategoryEnum.kruiden,
    kruiden: ProductCategoryEnum.kruiden,
    bouillon: ProductCategoryEnum.kruiden,
    olijfolie: ProductCategoryEnum.kruiden,
    azijn: ProductCategoryEnum.kruiden,
    mayonaise: ProductCategoryEnum.kruiden,

    chips: ProductCategoryEnum.snacks,
    noten: ProductCategoryEnum.snacks,
    notenmix: ProductCategoryEnum.snacks,
    koek: ProductCategoryEnum.snacks,
    chocola: ProductCategoryEnum.snacks,
    snoep: ProductCategoryEnum.snacks,
    smint: ProductCategoryEnum.snacks,
    donut: ProductCategoryEnum.snacks,
    popcorn: ProductCategoryEnum.snacks,
    haribo: ProductCategoryEnum.snacks,
    verkade: ProductCategoryEnum.snacks,
    bites: ProductCategoryEnum.snacks,
    stroopwafel: ProductCategoryEnum.snacks,
    pinda: ProductCategoryEnum.snacks,

    diepvries: ProductCategoryEnum.diepvries,
    ijs: ProductCategoryEnum.diepvries,
    magnum: ProductCategoryEnum.diepvries,
    jerrys: ProductCategoryEnum.diepvries,
    pizza: ProductCategoryEnum.diepvries,
    friet: ProductCategoryEnum.diepvries,
    ola: ProductCategoryEnum.diepvries,

    schoonmaak: ProductCategoryEnum.huishouden,
    afwasmiddel: ProductCategoryEnum.huishouden,
    toiletpapier: ProductCategoryEnum.huishouden,
    wc: ProductCategoryEnum.huishouden,
    wasmiddel: ProductCategoryEnum.huishouden,
    zeep: ProductCategoryEnum.huishouden,
    soap: ProductCategoryEnum.huishouden,
    marcel: ProductCategoryEnum.huishouden,
    andrelon: ProductCategoryEnum.huishouden,
    robijn: ProductCategoryEnum.huishouden,
    doekje: ProductCategoryEnum.huishouden,
    shampoo: ProductCategoryEnum.huishouden,
    tandpasta: ProductCategoryEnum.huishouden,
    deodorant: ProductCategoryEnum.huishouden,
    pledge: ProductCategoryEnum.huishouden,
    vuilniszak: ProductCategoryEnum.huishouden,
    luier: ProductCategoryEnum.huishouden,
};

const SORTED_KEYWORDS = Object.entries(CATEGORY_KEYWORDS)
    .sort(([a], [b]) => b.length - a.length);

export function tokenize(name: string): string[] {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9+]+/g, ' ')
        .split(' ')
        .filter(Boolean);
}

/**
 * Short keywords must match a whole word, otherwise `ui` would file `AH FRUITSAP` as vegetables.
 * Longer ones may match a truncated receipt word from either side.
 */
export function keywordMatchesToken(keyword: string, token: string): boolean {
    if (keyword.length <= EXACT_KEYWORD_LENGTH) {
        return token === keyword;
    }
    if (token.length >= TRUNCATION_MIN_LENGTH && keyword.startsWith(token)) {
        return true;
    }
    if (keyword.length >= CONTAINS_MIN_LENGTH && token.includes(keyword)) {
        return true;
    }
    return token.startsWith(keyword);
}

export function categorizeProduct(name: string): ProductCategoryEnum {
    const tokens = tokenize(name);
    for (const [keyword, category] of SORTED_KEYWORDS) {
        if (tokens.some((token) => keywordMatchesToken(keyword, token))) {
            return category;
        }
    }
    return ProductCategoryEnum.overig;
}

export function useProductCategories() {
    return { categorizeProduct };
}
