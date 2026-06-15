"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createResourceSchema, type CreateResourceInput } from "@/lib/validations";
import { ImageUploader } from "@/components/shared/image-uploader";
import type { ResourceType } from "@prisma/client";

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "HOT_DESK", label: "Hot Desk" },
  { value: "DEDICATED_DESK", label: "Dedicated Desk" },
  { value: "PRIVATE_OFFICE", label: "Private Office" },
  { value: "MEETING_ROOM", label: "Meeting Room" },
  { value: "EVENT_SPACE", label: "Event Space" },
  { value: "PHONE_BOOTH", label: "Phone Booth" },
  { value: "PODCAST_ROOM", label: "Podcast Room" },
  { value: "OTHER", label: "Other" },
];

type Location = { id: string; name: string };

type Props = {
  locations: Location[];
  currency: string;
  resourceId?: string;
  defaultValues?: Partial<CreateResourceInput>;
};

export function ResourceForm({ locations, currency, resourceId, defaultValues }: Props) {
  const router = useRouter();
  const isEdit = !!resourceId;
  const [amenityInput, setAmenityInput] = useState("");

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateResourceInput>({
      resolver: zodResolver(createResourceSchema) as any,
      defaultValues: {
        capacity: 1,
        amenities: [],
        images: [],
        requiresApproval: false,
        advanceBookingDays: 30,
        minBookingMinutes: 30,
        maxBookingHours: 8,
        ...defaultValues,
      },
    });

  const amenities = watch("amenities") ?? [];

  function addAmenity() {
    const trimmed = amenityInput.trim();
    if (!trimmed || amenities.includes(trimmed)) return;
    setValue("amenities", [...amenities, trimmed]);
    setAmenityInput("");
  }

  function removeAmenity(a: string) {
    setValue("amenities", amenities.filter((x) => x !== a));
  }

  async function onSubmit(data: CreateResourceInput) {
    try {
      const url = isEdit ? `/api/resources/${resourceId}` : "/api/resources";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save resource");
      }
      toast.success(isEdit ? "Resource updated" : "Resource created");
      router.push("/dashboard/resources");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save resource");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input placeholder="e.g. Meeting Room A" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Controller control={control} name="type" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <span className={!field.value ? "text-muted-foreground" : ""}>
                  {field.value ? RESOURCE_TYPES.find((t) => t.value === field.value)?.label : "Select type"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label>Location *</Label>
          <Controller control={control} name="locationId" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <span className={!field.value ? "text-muted-foreground" : ""}>
                  {field.value ? locations.find((l) => l.id === field.value)?.name : "Select location"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.locationId && <p className="text-xs text-red-500">{errors.locationId.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea placeholder="Optional description of this space..." {...register("description")} rows={3} />
      </div>

      {/* Capacity */}
      <div className="space-y-1.5">
        <Label>Capacity *</Label>
        <Input type="number" min={1} className="w-32" {...register("capacity", { valueAsNumber: true })} />
        {errors.capacity && <p className="text-xs text-red-500">{errors.capacity.message}</p>}
      </div>

      {/* Rates */}
      <div>
        <Label className="mb-3 block">Pricing ({currency})</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Hourly rate</Label>
            <Input type="number" step="0.01" min={0} placeholder="0.00"
              {...register("hourlyRate", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Half-day rate</Label>
            <Input type="number" step="0.01" min={0} placeholder="0.00"
              {...register("halfDayRate", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Full-day rate</Label>
            <Input type="number" step="0.01" min={0} placeholder="0.00"
              {...register("fullDayRate", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })} />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-1.5">
        <Label>Amenities</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Whiteboard, TV, Video call setup"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addAmenity}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {amenities.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                {a}
                <button type="button" onClick={() => removeAmenity(a)} className="ml-0.5 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="space-y-1.5">
        <Label>Photos</Label>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageUploader value={field.value ?? []} onChange={field.onChange} kind="resource" />
          )}
        />
      </div>

      {/* Booking settings */}
      <div>
        <Label className="mb-3 block">Booking settings</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Advance booking (days)</Label>
            <Input type="number" min={1} max={365} {...register("advanceBookingDays", { valueAsNumber: true })} />
            {errors.advanceBookingDays && <p className="text-xs text-red-500">{errors.advanceBookingDays.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Min booking (mins)</Label>
            <Input type="number" min={15} step={15} {...register("minBookingMinutes", { valueAsNumber: true })} />
            {errors.minBookingMinutes && <p className="text-xs text-red-500">{errors.minBookingMinutes.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Max booking (hours)</Label>
            <Input type="number" min={1} max={24} {...register("maxBookingHours", { valueAsNumber: true })} />
            {errors.maxBookingHours && <p className="text-xs text-red-500">{errors.maxBookingHours.message}</p>}
          </div>
        </div>
      </div>

      {/* Requires approval */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" {...register("requiresApproval")} className="w-4 h-4 accent-green-600" />
        <span className="text-sm text-gray-700">Requires approval before confirming bookings</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button
          type="submit"
          className="text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
          {isEdit ? "Save changes" : "Create resource"}
        </Button>
      </div>
    </form>
  );
}
