"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

type Member = { id: string; user: { name: string | null; email: string } };
type Props = { open: boolean; onClose: () => void; members: Member[]; currency: string; onSuccess: () => void };

export function CreateInvoiceDialog({ open, onClose, members, currency, onSuccess }: Props) {
  const defaultDueDate = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateInvoiceInput>({
      resolver: zodResolver(createInvoiceSchema) as any,
      defaultValues: {
        currency,
        sendImmediately: false,
        dueDate: addDays(new Date(), 14),
        lineItems: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const grandTotal = lineItems?.reduce((s, li) => s + (li.quantity * li.unitPrice || 0), 0) ?? 0;

  async function onSubmit(data: CreateInvoiceInput) {
    // Recalculate totals
    data.lineItems = data.lineItems.map((li) => ({ ...li, total: li.quantity * li.unitPrice }));
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Invoice created");
      onSuccess();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create invoice"); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Member */}
          <div className="space-y-1.5">
            <Label>Member *</Label>
            <Controller control={control} name="memberId" render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.user.name ?? m.user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.memberId && <p className="text-xs text-danger">{errors.memberId.message}</p>}
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label>Due date *</Label>
            <Controller control={control} name="dueDate" render={({ field }) => (
              <Input type="date" defaultValue={defaultDueDate}
                onChange={(e) => field.onChange(new Date(e.target.value))} />
            )} />
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <Label>Line items *</Label>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <Input className="col-span-5" placeholder="Description" {...register(`lineItems.${i}.description`)} />
                <Input className="col-span-2" type="number" min={1} placeholder="Qty"
                  {...register(`lineItems.${i}.quantity`, { valueAsNumber: true })} />
                <Input className="col-span-3" type="number" min={0} step="0.01" placeholder="Unit price"
                  {...register(`lineItems.${i}.unitPrice`, { valueAsNumber: true })} />
                <div className="col-span-1 pt-2 text-xs text-gray-500 text-right">
                  {formatCurrency((lineItems[i]?.quantity ?? 1) * (lineItems[i]?.unitPrice ?? 0), currency)}
                </div>
                <Button type="button" variant="ghost" size="icon" className="col-span-1 h-9 w-9 text-gray-400"
                  onClick={() => remove(i)} disabled={fields.length === 1}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: 0, total: 0 })}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add line item
            </Button>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(grandTotal, currency)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
              disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
