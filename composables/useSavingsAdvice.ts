import type ReceiptInterface from '~/types/ReceiptInterface';
import type { PremiumAdviceInterface, StoreScenarioInterface } from '~/types/SavingsAdviceInterface';
import { koopzegelReturn } from '~/composables/useKoopzegels';

const PREMIUM_COST = 12;
const BIO_BONUS = 0.1;
const SINGLE_STAMP_RATE = 0.1;
const DOUBLE_STAMP_MARGIN = 1.4;
const BIO_PATTERN = /\bbio\b|biolog/i;

export function bioSpend(receipts: ReceiptInterface[]): number {
    return receipts
        .flatMap((receipt) => receipt.items)
        .filter((item) => BIO_PATTERN.test(item.name))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Stamps are bought out of the till total, so redeeming far more than one stamp per euro
 * spent means the double rate is already running.
 */
export function premiumAdvice(receipts: ReceiptInterface[]): PremiumAdviceInterface {
    const tillTotal = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const zegels = koopzegelReturn(receipts);
    const singleRateInvestment = tillTotal * SINGLE_STAMP_RATE;
    const spend = bioSpend(receipts);
    const bioBenefit = spend * BIO_BONUS;

    return {
        bioSpend: spend,
        bioBenefit,
        zegelGain: zegels.gain,
        cost: PREMIUM_COST,
        net: bioBenefit + zegels.gain - PREMIUM_COST,
        doubleStampingLikely: zegels.invested > singleRateInvestment * DOUBLE_STAMP_MARGIN,
    };
}

/**
 * No price data exists for other chains, so this is a what-if on a cheaper basket,
 * minus the Albert Heijn benefits that would disappear with it.
 */
export function storeScenarios(
    receipts: ReceiptInterface[],
    percentages: number[],
): StoreScenarioInterface[] {
    const ownMoney = receipts
        .flatMap((receipt) => receipt.payments ?? [])
        .filter((payment) => payment.method.toUpperCase() === 'PINNEN')
        .reduce((sum, payment) => sum + payment.amount, 0);
    const premium = premiumAdvice(receipts);
    const lostBenefits = premium.zegelGain + premium.bioBenefit;

    return percentages.map((percentage) => {
        const grossSaving = ownMoney * percentage;
        return {
            percentage,
            grossSaving,
            lostBenefits,
            net: grossSaving - lostBenefits,
        };
    });
}

export function useSavingsAdvice() {
    return { bioSpend, premiumAdvice, storeScenarios };
}
