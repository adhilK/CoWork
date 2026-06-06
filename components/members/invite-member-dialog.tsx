"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations";

type Plan = { id: string; name: string; price: any };
type Props = {
  open: boolean; onClose: () => void; plans: Plan[];
  organizationId: string; onSuccess: () => void;
};

export function InviteMemberDialog({ open, onClose, plans, organizationId, onSuccess }: Props) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<InviteMemberInput>({ resolver: zodResolver(inviteMemberSchema) });

  async function onSubmit(data: InviteMemberInput) {
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Invite sent to ${data.email}`);
      reset();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite member");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Full name *</Label>
              <Input placeholder="Sarah Mitchell" {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="sarah@company.com" {...register("email")} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Acme Ltd" {...register("company")} />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input placeholder="Designer" {...register("jobTitle")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Membership plan</Label>
              <Controller control={control} name="membershipPlanId" render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select plan (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No plan</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
