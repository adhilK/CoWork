import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifyCheckinToken } from "@/lib/checkin-token";
import { CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Check in â€” Maktaby" };
export const dynamic = "force-dynamic";

function Frame({ tint, icon, title, message, detail }: {
  tint: string; icon: React.ReactNode; title: string; message: string; detail?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F8FAFC" }}>
      <div className="text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: tint }}>
          {icon}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1.5">{message}</p>
        {detail && <div className="mt-5 dashboard-card p-4 text-left">{detail}</div>}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Building2 className="w-3.5 h-3.5" /> Maktaby
        </div>
      </div>
    </div>
  );
}

export default async function CheckinPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  // Verify the signed token before touching the DB
  if (!verifyCheckinToken(params.id, searchParams.t)) {
    return (
      <Frame tint="#FEE2E2" icon={<XCircle className="w-8 h-8 text-red-500" />}
        title="Invalid check-in link" message="This QR code isn't valid. Please ask the front desk for help." />
    );
  }

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { resource: { select: { name: true } }, member: { include: { user: { select: { name: true } } } } },
  });

  if (!booking) {
    return (
      <Frame tint="#FEE2E2" icon={<XCircle className="w-8 h-8 text-red-500" />}
        title="Booking not found" message="We couldn't find this booking. It may have been cancelled." />
    );
  }

  const detail = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-gray-400">Space</dt><dd className="font-medium text-gray-800">{booking.resource.name}</dd></div>
      <div className="flex justify-between"><dt className="text-gray-400">Guest</dt><dd className="font-medium text-gray-800">{booking.member?.user?.name ?? "Walk-in"}</dd></div>
      <div className="flex justify-between"><dt className="text-gray-400">Time</dt><dd className="font-medium text-gray-800">{format(booking.startTime, "HH:mm")} â€“ {format(booking.endTime, "HH:mm")}</dd></div>
    </dl>
  );

  // Already checked in
  if (booking.status === "CHECKED_IN") {
    return (
      <Frame tint="#DCFCE7" icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
        title="Already checked in" message={`Checked in at ${booking.checkedInAt ? format(booking.checkedInAt, "HH:mm") : "earlier"}.`}
        detail={detail} />
    );
  }

  // Not checkable
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED" || booking.status === "NO_SHOW") {
    return (
      <Frame tint="#F3F4F6" icon={<Clock className="w-8 h-8 text-gray-400" />}
        title="Can't check in" message={`This booking is ${booking.status.toLowerCase().replace("_", " ")}.`} detail={detail} />
    );
  }

  // Only valid within the booking window (15 min early grace â†’ booking end)
  const nowMs = Date.now();
  if (nowMs < booking.startTime.getTime() - 15 * 60 * 1000) {
    return (
      <Frame tint="#FEF3C7" icon={<Clock className="w-8 h-8 text-amber-500" />}
        title="Too early to check in"
        message={`Check-in opens at ${format(new Date(booking.startTime.getTime() - 15 * 60 * 1000), "HH:mm")}. Please come back closer to your booking.`}
        detail={detail} />
    );
  }
  if (nowMs > booking.endTime.getTime()) {
    return (
      <Frame tint="#F3F4F6" icon={<Clock className="w-8 h-8 text-gray-400" />}
        title="Check-in closed" message="This booking has already ended." detail={detail} />
    );
  }

  // Perform the check-in (CONFIRMED or PENDING â†’ CHECKED_IN)
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });

  return (
    <Frame tint="#DCFCE7" icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
      title="You're checked in!" message={`Welcome${booking.member?.user?.name ? `, ${booking.member.user.name}` : ""}. Enjoy your space.`}
      detail={detail} />
  );
}