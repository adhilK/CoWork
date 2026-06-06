/**
 * Shared booking pricing + credit logic, used by both the admin booking
 * API and the member portal booking API so they price identically.
 *
 * Credit model (per spec): 1 credit = 1 hour. A member booking first
 * spends the member's available credits (rounded up to whole hours);
 * if they don't have enough, it falls back to pay-per-use pricing.
 */

type RateResource = {
  hourlyRate: any;
  halfDayRate: any;
  fullDayRate: any;
};

export function computeCharge(resource: RateResource, startTime: Date | string, endTime: Date | string) {
  const durationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000;
  let amount = 0;
  if (resource.hourlyRate) {
    amount = durationHours * Number(resource.hourlyRate);
  } else if (resource.fullDayRate && durationHours >= 7) {
    amount = Number(resource.fullDayRate);
  } else if (resource.halfDayRate && durationHours >= 3.5) {
    amount = Number(resource.halfDayRate);
  }
  return {
    durationHours,
    amount: Math.round(amount * 100) / 100,
    creditsNeeded: Math.ceil(durationHours),
  };
}

/**
 * Decides how a member booking is paid: by credits (if they have enough
 * and the resource is chargeable) or pay-per-use.
 */
export function settleBooking(opts: {
  amount: number;
  creditsNeeded: number;
  memberCredits: number | null; // null = no member (walk-in)
}) {
  const { amount, creditsNeeded, memberCredits } = opts;
  const canUseCredits =
    memberCredits !== null && amount > 0 && creditsNeeded > 0 && memberCredits >= creditsNeeded;
  return {
    creditsUsed: canUseCredits ? creditsNeeded : 0,
    amountCharged: canUseCredits ? 0 : amount,
  };
}
