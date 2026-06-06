"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addHours } from "date-fns";
import { Loader2, Trash2, LogIn, LogOut, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBookingSchema, type CreateBookingInput } from "@/lib/validations";
import { humanizeEnum, formatDateTime, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ResourceType, BookingStatus } from "@prisma/client";

type Resource = { id: string; name: string; type: ResourceType; capacity: number; hourlyRate: any };
type Member = { id: string; userId: string; user: { name: string | null; email: string } };

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId: string | null;
  defaultDate: Date | null;
  resources: Resource[];
  members: Member[];
  currency: string;
  onSuccess: () => void;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: "bg-amber-50",   text: "text-amber-700",   label: "Pending approval" },
  CONFIRMED:  { bg: "bg-blue-50",    text: "text-blue-700",    label: "Confirmed" },
  CHECKED_IN: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Checked in" },
  COMPLETED:  { bg: "bg-gray-50",    text: "text-gray-500",    label: "Completed" },
  CANCELLED:  { bg: "bg-red-50",     text: "text-red-600",     label: "Cancelled" },
  NO_SHOW:    { bg: "bg-orange-50",  text: "text-orange-600",  label: "No show" },
};

function toDatetimeLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function BookingDialog({ open, onClose, bookingId, defaultDate, resources, members, currency, onSuccess }: Props) {
  const isEdit = !!bookingId;
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [checkingAction, setCheckingAction] = useState<"in" | "out" | null>(null);
  const [amountCharged, setAmountCharged] = useState<number | null>(null);
  const [checkinLink, setCheckinLink] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<CreateBookingInput>({
      resolver: zodResolver(createBookingSchema) as any,
      defaultValues: { attendees: 1, externalGuests: [] },
    });

  useEffect(() => {
    if (open && !isEdit && defaultDate) {
      const start = defaultDate;
      const end = addHours(start, 1);
      reset({ startTime: start, endTime: end, attendees: 1, externalGuests: [] });
      setBookingStatus(null);
      setAmountCharged(null);
    }
  }, [open, isEdit, defaultDate, reset]);

  useEffect(() => {
    if (open && isEdit && bookingId) {
      fetch(`/api/bookings/${bookingId}`)
        .then((r) => r.json())
        .then((b) => {
          if (b.id) {
            reset({
              resourceId: b.resourceId,
              memberId: b.memberId ?? undefined,
              title: b.title ?? undefined,
              description: b.description ?? undefined,
              startTime: new Date(b.startTime),
              endTime: new Date(b.endTime),
              attendees: b.attendees ?? 1,
            });
            setBookingStatus(b.status as BookingStatus);
            setAmountCharged(Number(b.amountCharged) || null);
            setCheckinLink(b.checkinUrl ?? null);
            setShowQr(false);
          }
        })
        .catch(() => toast.error("Failed to load booking"));
    }
  }, [open, isEdit, bookingId, reset]);

  async function onSubmit(data: CreateBookingInput) {
    try {
      const url = isEdit ? `/api/bookings/${bookingId}` : "/api/bookings";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save booking");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save booking");
    }
  }

  async function handleDelete() {
    if (!bookingId) return;
    if (!confirm("Cancel this booking?")) return;
    try {
      await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      toast.success("Booking cancelled");
      onSuccess();
    } catch {
      toast.error("Failed to cancel booking");
    }
  }

  async function handleCheckIn() {
    if (!bookingId) return;
    setCheckingAction("in");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/check-in`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setBookingStatus("CHECKED_IN");
      toast.success("Checked in!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingAction(null);
    }
  }

  async function handleCheckOut() {
    if (!bookingId) return;
    setCheckingAction("out");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/check-out`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setBookingStatus("COMPLETED");
      toast.success("Checked out!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setCheckingAction(null);
    }
  }

  const statusStyle = bookingStatus ? STATUS_STYLES[bookingStatus] : null;
  const canCheckIn = bookingStatus === "CONFIRMED" || bookingStatus === "PENDING";
  const canCheckOut = bookingStatus === "CHECKED_IN";
  const isReadOnly = bookingStatus === "COMPLETED" || bookingStatus === "CANCELLED" || bookingStatus === "NO_SHOW";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{isEdit ? "Booking details" : "New booking"}</DialogTitle>
            {statusStyle && (
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusStyle.bg, statusStyle.text)}>
                {statusStyle.label}
              </span>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Resource */}
          <div className="space-y-1.5">
            <Label>Resource *</Label>
            <Controller control={control} name="resourceId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                <SelectTrigger>
                  <span className={!field.value ? "text-muted-foreground" : ""}>
                    {field.value ? (resources.find((r) => r.id === field.value)?.name ?? "Select resource") : "Select resource"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.resourceId && <p className="text-xs text-red-500">{errors.resourceId.message}</p>}
          </div>

          {/* Member */}
          <div className="space-y-1.5">
            <Label>Member (optional)</Label>
            <Controller control={control} name="memberId" render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isReadOnly}>
                <SelectTrigger>
                  <span className={!field.value ? "text-muted-foreground" : ""}>
                    {field.value
                      ? (members.find((m) => m.id === field.value)?.user.name ?? members.find((m) => m.id === field.value)?.user.email ?? "Walk-in / No member")
                      : "Walk-in / No member"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Walk-in / No member</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user.name ?? m.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input placeholder="e.g. Team standup" {...register("title")} disabled={isReadOnly} />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time *</Label>
              <Controller control={control} name="startTime" render={({ field }) => (
                <Input type="datetime-local"
                  value={field.value ? toDatetimeLocal(new Date(field.value)) : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  disabled={isReadOnly}
                />
              )} />
              {errors.startTime && <p className="text-xs text-red-500">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End time *</Label>
              <Controller control={control} name="endTime" render={({ field }) => (
                <Input type="datetime-local"
                  value={field.value ? toDatetimeLocal(new Date(field.value)) : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  disabled={isReadOnly}
                />
              )} />
              {errors.endTime && <p className="text-xs text-red-500">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-1.5">
            <Label>Attendees</Label>
            <Input type="number" min={1} {...register("attendees", { valueAsNumber: true })} className="w-28" disabled={isReadOnly} />
          </div>

          {/* Charge summary */}
          {amountCharged !== null && amountCharged > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Booking charge</p>
                {bookingStatus && bookingStatus !== "CANCELLED" && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {bookingStatus === "COMPLETED" || bookingStatus === "CHECKED_IN"
                      ? "Completed — ready to invoice"
                      : "Will be invoiced after completion"}
                  </p>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(amountCharged, currency)}</span>
            </div>
          )}

          {/* QR check-in — for bookings that can still be checked in */}
          {isEdit && checkinLink && (canCheckIn || canCheckOut) && (
            <div className="rounded-xl border border-gray-100 p-3">
              <button type="button" onClick={() => setShowQr((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full">
                <QrCode className="w-4 h-4 text-gray-500" />
                {showQr ? "Hide check-in QR" : "Show check-in QR"}
                <span className="ml-auto text-xs text-gray-400">{showQr ? "▲" : "▼"}</span>
              </button>
              {showQr && (
                <div className="flex flex-col items-center mt-3 gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Check-in QR code"
                    width={170} height={170}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=8&data=${encodeURIComponent(checkinLink)}`}
                    className="rounded-lg border border-gray-100"
                  />
                  <p className="text-[11px] text-gray-400 text-center">
                    Member scans this to check in. Or
                    <button type="button" className="text-indigo-600 hover:underline ml-1"
                      onClick={() => { navigator.clipboard.writeText(checkinLink); toast.success("Check-in link copied"); }}>
                      copy the link
                    </button>.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {isEdit && !isReadOnly && (
              <Button type="button" variant="outline" className="text-red-600 hover:text-red-700 mr-auto"
                onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Cancel booking
              </Button>
            )}

            {/* Check-in / Check-out */}
            {canCheckIn && (
              <Button type="button" variant="outline"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={handleCheckIn} disabled={checkingAction !== null}>
                {checkingAction === "in" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <LogIn className="w-4 h-4 mr-1.5" />}
                Check in
              </Button>
            )}
            {canCheckOut && (
              <Button type="button" variant="outline"
                className="text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={handleCheckOut} disabled={checkingAction !== null}>
                {checkingAction === "out" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <LogOut className="w-4 h-4 mr-1.5" />}
                Check out
              </Button>
            )}

            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            {!isReadOnly && (
              <Button type="submit" className="text-white"
                style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
                disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save changes" : "Create booking"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
