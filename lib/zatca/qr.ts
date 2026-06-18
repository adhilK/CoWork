/** Render any QR code data string (TLV base64, URL, etc.) to a PNG data URL. */
export async function qrToDataUrl(qrData: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });
  } catch {
    return null;
  }
}
