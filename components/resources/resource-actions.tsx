"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Power, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ResourceActions({ resourceId, isActive }: { resourceId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(isActive ? "Resource disabled" : "Resource enabled");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this resource? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Resource deleted");
      router.push("/dashboard/resources");
    } catch {
      toast.error("Failed to delete");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <Button variant="outline" className="h-9" onClick={() => router.push(`/dashboard/resources/${resourceId}/edit`)}>
        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
      </Button>
      <Button variant="outline" className="h-9" onClick={toggleActive} disabled={busy}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5 mr-1.5" />}
        {isActive ? "Disable" : "Enable"}
      </Button>
      <Button variant="outline" className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
        onClick={remove} disabled={busy}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
