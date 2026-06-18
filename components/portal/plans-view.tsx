"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Sparkles,
  Loader2,
  Star,
  CreditCard,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  billingCycle: string;
  includedCredits: number;
  meetingRoomHours: number;
  features: string[];
  isActive: boolean;
};

type Props = {
  plans: Plan[];
  currentPlanId: string | null;
  currency: string;
};

function PlanCard({
  plan,
  isCurrent,
  currency,
  onSubscribe,
  loading,
}: {
  plan: Plan;
  isCurrent: boolean;
  currency: string;
  onSubscribe: (planId: string) => void;
  loading: boolean;
}) {
  const isPopular = plan.type === "PRIVATE_OFFICE" || plan.type === "DEDICATED_DESK";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        isCurrent
          ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
          : isPopular
          ? "border-emerald-200 bg-white shadow-md"
          : "border-gray-100 bg-white"
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
            <Star className="w-2.5 h-2.5" /> Current plan
          </span>
        </div>
      )}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
            <Zap className="w-2.5 h-2.5" /> Popular
          </span>
        </div>
      )}

      <div className="p-6 pb-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          {humanizeEnum(plan.type)}
        </p>
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
        )}

        {/* Price */}
        <div className="mt-5 flex items-end gap-1">
          <span className="text-3xl font-bold text-gray-900">
            {formatCurrency(plan.price, currency)}
          </span>
          <span className="text-sm text-gray-400 mb-0.5">
            /{plan.billingCycle === "YEARLY" ? "yr" : plan.billingCycle === "WEEKLY" ? "wk" : "mo"}
          </span>
        </div>

        {/* Key stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {plan.includedCredits > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-center">
              <p className="text-lg font-bold text-emerald-700">{plan.includedCredits}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Credits/mo</p>
            </div>
          )}
          {plan.meetingRoomHours > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-center">
              <p className="text-lg font-bold text-blue-700">{plan.meetingRoomHours}h</p>
              <p className="text-[10px] text-blue-600 font-medium">Meeting rooms</p>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      {plan.features.length > 0 && (
        <div className="px-6 pb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
            Included
          </p>
          <ul className="space-y-1.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-6 pt-3 mt-auto">
        {isCurrent ? (
          <Button
            variant="outline"
            className="w-full text-sm border-emerald-200 text-emerald-700"
            disabled
          >
            <Check className="w-4 h-4 mr-1.5" />
            Active plan
          </Button>
        ) : (
          <Button
            className="w-full text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            onClick={() => onSubscribe(plan.id)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Get {plan.name}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PlansView({ plans, currentPlanId, currency }: Props) {
  const router = useRouter();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    setLoadingPlanId(planId);
    try {
      const res = await fetch("/api/portal/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not initiate subscription");
        return;
      }
      const { checkoutUrl } = data.data ?? data;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.success("Invoice created — you can pay from your invoices page.");
        router.push("/portal/invoices");
      }
    } catch {
      toast.error("Something went wrong, please try again");
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="page-title">Membership plans</h1>
        <p className="page-subtitle">Choose the plan that fits your working style.</p>
      </div>

      {plans.length === 0 ? (
        <div className="dashboard-card p-16 text-center">
          <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No plans available yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Contact the space team to find the right plan for you.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${plans.length === 1 ? "max-w-sm" : plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              currency={currency}
              onSubscribe={handleSubscribe}
              loading={loadingPlanId === plan.id}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Prices are exclusive of VAT, which will be added at checkout. Subscriptions are billed monthly.
        Contact reception if you need a custom plan or enterprise pricing.
      </p>
    </div>
  );
}
