"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  orgName: z.string().min(2, "Space name must be at least 2 characters").max(100),
});

type FormInput = z.infer<typeof schema>;

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormInput) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: data.orgName,
          orgSlug: slugify(data.orgName),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create organization");
      }

      toast.success("Your coworking space is ready!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1712] to-[#1a2e1f]">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CoWork<span className="text-green-400">Pro</span></span>
          </div>
          <h1 className="text-3xl font-bold text-white">Set up your space</h1>
          <p className="text-gray-400 mt-2">Almost there — tell us about your coworking space</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-gray-700 font-medium">
                Space name
              </Label>
              <Input
                id="orgName"
                placeholder="e.g. LaunchHub Coworking"
                className="h-11 border-gray-200"
                {...register("orgName")}
              />
              {errors.orgName && (
                <p className="text-sm text-red-500">{errors.orgName.message}</p>
              )}
              {watch("orgName") && (
                <p className="text-xs text-gray-400">
                  URL slug: <strong>{slugify(watch("orgName") ?? "")}</strong>
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating your space…</>
              ) : (
                "Launch my space →"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
