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
type Props = { open: boolean; onClose: () => void; members: Member[]; currency: string; vatRate: number; onSuccess: () => void };

export function CreateInvoiceDialog({ open, onClose, members, currency, vatRate, onSuccess }: Props) {
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
  const subtotal = lineItems?.reduce((s, li) => s + (li.quantity * li.unitPrice || 0), 0) ?? 0;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const grandTotal = Math.round((subtotal + vatAmount) * 100) / 100;
  const vatPct = `${(vatRate * 100).toFixed(vatRate * 100 % 1 === 0 ? 0 : 2)}%`;

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
              <div key={field.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                <Input placeholder="Description (e.g. Hot desk — June)" {...register(`lineItems.${i}.description`)} />
                <div className="flex items-center gap-1.5">
                  {/* Qty */}
                  <Input
                    className="w-14 text-center flex-shrink-0 text-sm px-2"
                    type="number" min={1} placeholder="Qty"
                    {...register(`lineItems.${i}.quantity`, { valueAsNumber: true })}
                  />
                  <span className="text-gray-300 text-sm flex-shrink-0">×</span>
                  {/* Unit price — flex-1 so it fills all remaining space */}
                  <Input
                    type="number" min={0} step="0.01" placeholder="Unit price"
                    className="flex-1 min-w-0 text-sm"
                    {...register(`lineItems.${i}.unitPrice`, { valueAsNumber: true })}
                  />
                  {/* Line total */}
                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0 w-16 text-right tabular-nums">
                    {formatCurrency((lineItems[i]?.quantity ?? 1) * (lineItems[i]?.unitPrice ?? 0), currency)}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-gray-300 hover:text-red-500"
                    onClick={() => remove(i)} disabled={fields.length === 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: 0, total: 0 })}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add line item
            </Button>
          </div>

          {/* Totals — subtotal + VAT + total */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">VAT ({vatPct})</span>
                <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(vatAmount, currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(grandTotal, currency)}</span>
              </div>
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
