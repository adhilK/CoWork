import { Armchair, Monitor, DoorClosed, Users, Mic, Phone, Radio, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResourceType } from "@prisma/client";

/** Lucide icon + colour per resource type — replaces the old emoji map. */
export const RESOURCE_ICON: Record<ResourceType, { icon: any; tint: string; bg: string }> = {
  HOT_DESK:       { icon: Armchair,   tint: "#0EA5E9", bg: "#E0F2FE" },
  DEDICATED_DESK: { icon: Monitor,    tint: "#6366F1", bg: "#EEF2FF" },
  PRIVATE_OFFICE: { icon: DoorClosed, tint: "#8B5CF6", bg: "#F5F3FF" },
  MEETING_ROOM:   { icon: Users,      tint: "#16A34A", bg: "#DCFCE7" },
  EVENT_SPACE:    { icon: Mic,        tint: "#EC4899", bg: "#FCE7F3" },
  PHONE_BOOTH:    { icon: Phone,      tint: "#F59E0B", bg: "#FEF3C7" },
  PODCAST_ROOM:   { icon: Radio,      tint: "#14B8A6", bg: "#CCFBF1" },
  OTHER:          { icon: Box,        tint: "#64748B", bg: "#F1F5F9" },
};

const SIZES = {
  sm: { box: "w-7 h-7 rounded-lg", icon: 14 },
  md: { box: "w-9 h-9 rounded-xl", icon: 17 },
  lg: { box: "w-12 h-12 rounded-2xl", icon: 22 },
};

export function ResourceIcon({
  type,
  size = "md",
  className,
}: {
  type: ResourceType;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const cfg = RESOURCE_ICON[type] ?? RESOURCE_ICON.OTHER;
  const Icon = cfg.icon;
  const s = SIZES[size];
  return (
    <span className={cn("flex items-center justify-center flex-shrink-0", s.box, className)} style={{ background: cfg.bg }}>
      <Icon style={{ color: cfg.tint, width: s.icon, height: s.icon }} />
    </span>
  );
}
