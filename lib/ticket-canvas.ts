/**
 * Client-side canvas ticket generator.
 * Produces a 400×580px PNG booking ticket with header, details, and QR code.
 * Must only be called in browser context (uses HTMLCanvasElement + Image).
 */

export type TicketData = {
  spaceName: string;
  date: string;
  time: string;
  status: string;
};

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function loadDataUrl(qrUrl: string): Promise<string> {
  const res = await fetch(qrUrl);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateBookingTicket(
  checkinUrl: string,
  ticket: TicketData
): Promise<Blob> {
  const W = 400;
  const H = 580;
  const SCALE = 2;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(SCALE, SCALE);

  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

  // ── White background ─────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Green header ─────────────────────────────────────────────────────────
  ctx.fillStyle = "#15803D";
  ctx.fillRect(0, 0, W, 116);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("Booking Ticket", 24, 46);

  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  // Truncate long space names
  const spaceTrunc = ticket.spaceName.length > 38 ? ticket.spaceName.slice(0, 36) + "…" : ticket.spaceName;
  ctx.fillText(spaceTrunc, 24, 72);

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("CoWork Pro — Member Ticket", 24, 96);

  // ── Dashed separator ────────────────────────────────────────────────────
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 132);
  ctx.lineTo(376, 132);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Date ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#9ca3af";
  ctx.font = `bold 10px ${FONT}`;
  ctx.letterSpacing = "1px";
  ctx.fillText("DATE", 24, 158);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#111827";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(ticket.date, 24, 182);

  // ── Time ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#9ca3af";
  ctx.font = `bold 10px ${FONT}`;
  ctx.letterSpacing = "1px";
  ctx.fillText("TIME", 200, 158);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#111827";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(ticket.time, 200, 182);

  // ── Status badge ────────────────────────────────────────────────────────
  const statusColors: Record<string, { bg: string; text: string }> = {
    CONFIRMED: { bg: "#dcfce7", text: "#16a34a" },
    PENDING: { bg: "#fef3c7", text: "#d97706" },
    CHECKED_IN: { bg: "#dbeafe", text: "#2563eb" },
    COMPLETED: { bg: "#f3f4f6", text: "#6b7280" },
  };
  const sc = statusColors[ticket.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
  ctx.fillStyle = sc.bg;
  rr(ctx, 24, 198, 110, 24, 12);
  ctx.fill();
  ctx.fillStyle = sc.text;
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText(ticket.status.replace(/_/g, " "), 36, 214);

  // ── QR code section ─────────────────────────────────────────────────────
  // White card behind QR
  ctx.fillStyle = "#f9fafb";
  rr(ctx, 96, 238, 208, 208, 14);
  ctx.fill();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  rr(ctx, 96, 238, 208, 208, 14);
  ctx.stroke();

  // Fetch QR as data URL to avoid canvas CORS taint
  const qrDataUrl = await loadDataUrl(
    `https://api.qrserver.com/v1/create-qr-code/?size=380x380&margin=0&data=${encodeURIComponent(checkinUrl)}`
  );
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });
  ctx.drawImage(qrImg, 110, 252, 180, 180);

  // ── Caption ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#9ca3af";
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Scan at reception to check in", W / 2, 472);
  ctx.textAlign = "left";

  // ── Footer bar ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#f0fdf4";
  ctx.fillRect(0, H - 48, W, 48);

  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 48);
  ctx.lineTo(W, H - 48);
  ctx.stroke();

  // Green dot
  ctx.fillStyle = "#16a34a";
  ctx.beginPath();
  ctx.arc(24, H - 24, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#16a34a";
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText("coworkpro.vercel.app", 38, H - 20);

  // Export as PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      1.0
    );
  });
}

export async function downloadTicket(
  checkinUrl: string,
  ticket: TicketData,
  filename: string
): Promise<void> {
  const blob = await generateBookingTicket(checkinUrl, ticket);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
