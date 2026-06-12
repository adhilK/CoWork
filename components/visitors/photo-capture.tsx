"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RotateCcw, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Called with a JPEG data URL when a photo is captured/confirmed, or null to clear. */
  onCapture: (dataUrl: string | null) => void;
  value: string | null;
};

/**
 * Webcam capture for visitor photos. Streams the device camera, captures a
 * still to a canvas, and emits a compressed JPEG data URL. Gracefully degrades
 * if no camera / permission is denied.
 */
export function PhotoCapture({ onCapture, value }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      // Wait a tick for the video element to mount.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setError("Camera unavailable or permission denied.");
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(dataUrl);
    stop();
  }

  function retake() {
    onCapture(null);
    start();
  }

  // Already captured → preview + retake/clear
  if (value) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Visitor" className="w-28 h-28 rounded-xl object-cover border border-gray-200" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={retake}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50" onClick={() => onCapture(null)}>
            <X className="w-3.5 h-3.5 mr-1" /> Remove
          </Button>
        </div>
      </div>
    );
  }

  // Live camera
  if (active) {
    return (
      <div className="space-y-2">
        <video ref={videoRef} className="w-full max-w-[280px] rounded-xl bg-black aspect-[4/3] object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }} onClick={capture}>
            <Check className="w-3.5 h-3.5 mr-1" /> Capture
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={stop}>Cancel</Button>
        </div>
      </div>
    );
  }

  // Idle
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={start}
        className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
        <Camera className="w-6 h-6 mb-1" />
        <span className="text-[11px]">Take photo</span>
      </button>
      {error && <p className="text-[11px] text-amber-600">{error}</p>}
    </div>
  );
}
