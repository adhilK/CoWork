"use client";

import { useState } from "react";
import { Plus, Pin, Trash2, Megaphone, Calendar, MapPin, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, isFuture, isPast } from "date-fns";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  capacity: number | null;
  isPublic: boolean;
  createdAt: Date;
};

type Props = {
  initialAnnouncements: Announcement[];
  initialEvents: Event[];
};

function AnnouncementDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void;
  onSuccess: (a: Announcement) => void;
}) {
  const [form, setForm] = useState({ title: "", body: "", isPinned: false });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { toast.error("Title and body required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const a = await res.json();
      onSuccess(a);
      toast.success("Announcement posted");
      setForm({ title: "", body: "", isPinned: false });
    } catch {
      toast.error("Failed to post announcement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Office closure, new amenities…" value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea rows={4} placeholder="Write your announcement…" value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
            <span className="text-sm text-gray-700">Pin to top</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? "Posting…" : "Post announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void;
  onSuccess: (e: Event) => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    title: "", description: "",
    startTime: format(now, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(now, "yyyy-MM-dd'T'HH:mm"),
    location: "", capacity: "", isPublic: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? parseInt(form.capacity) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const ev = await res.json();
      onSuccess(ev);
      toast.success("Event created");
      setForm({ title: "", description: "", startTime: format(now, "yyyy-MM-dd'T'HH:mm"), endTime: format(now, "yyyy-MM-dd'T'HH:mm"), location: "", capacity: "", isPublic: false });
    } catch {
      toast.error("Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Networking mixer, Workshop…" value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="What's this event about?" value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start *</Label>
              <Input type="datetime-local" value={form.startTime}
                onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End *</Label>
              <Input type="datetime-local" value={form.endTime}
                onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Main hall, Room B…" value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min={1} placeholder="50" value={form.capacity}
                onChange={(e) => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
            <span className="text-sm text-gray-700">Public event (visible on booking page)</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {saving ? "Creating…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CommunityView({ initialAnnouncements, initialEvents }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [tab, setTab] = useState("announcements");

  async function togglePin(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !current }),
      });
      if (!res.ok) throw new Error();
      setAnnouncements(prev => {
        const updated = prev.map(a => a.id === id ? { ...a, isPinned: !current } : a);
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      toast.success(current ? "Unpinned" : "Pinned");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const upcomingEvents = events.filter(e => isFuture(new Date(e.endTime)));
  const pastEvents = events.filter(e => isPast(new Date(e.endTime)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Community</h1>
          <p className="page-subtitle">Keep members informed and connected</p>
        </div>
        <Button
          onClick={() => (tab === "announcements" ? setAnnouncementDialog(true) : setEventDialog(true))}
          className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Plus className="w-4 h-4 mr-1.5" />
          {tab === "announcements" ? "New announcement" : "Create event"}
        </Button>
      </div>

      {/* Segmented toggle */}
      <div className="flex rounded-xl border border-gray-200 bg-white p-1 w-full sm:w-fit">
        {([
          ["announcements", "Announcements", Megaphone, announcements.length],
          ["events", "Events", Calendar, upcomingEvents.length],
        ] as const).map(([key, label, Icon, count]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === key ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon className="w-4 h-4" /> {label}
            <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "announcements" && (
        <div>
          {announcements.length === 0 ? (
            <div className="dashboard-card p-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No announcements yet</p>
              <p className="text-sm text-gray-400 mt-1">Post an announcement to keep your members in the loop.</p>
              <Button className="mt-4 text-white" style={{ background: "#22C55E" }} onClick={() => setAnnouncementDialog(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> New announcement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={cn("dashboard-card p-4", a.isPinned && "ring-1 ring-amber-200")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      a.isPinned ? "bg-amber-50" : "bg-indigo-50")}>
                      {a.isPinned
                        ? <Pin className="w-4 h-4 text-amber-500" />
                        : <Megaphone className="w-4 h-4 text-indigo-500" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{a.title}</h3>
                        {a.isPinned && <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pinned</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{format(new Date(a.createdAt), "d MMM yyyy, HH:mm")}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => togglePin(a.id, a.isPinned)} title={a.isPinned ? "Unpin" : "Pin"}
                        className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                          a.isPinned ? "bg-amber-50 text-amber-500 hover:bg-amber-100" : "hover:bg-gray-100 text-gray-400")}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteAnnouncement(a.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <div>
          {events.length === 0 ? (
            <div className="dashboard-card p-12 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No events yet</p>
              <p className="text-sm text-gray-400 mt-1">Create networking events, workshops, and more.</p>
              <Button className="mt-4 text-white" style={{ background: "#22C55E" }} onClick={() => setEventDialog(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Create event
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {upcomingEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming</p>
                  <div className="space-y-3">
                    {upcomingEvents.map((e) => <EventCard key={e.id} event={e} onDelete={() => deleteEvent(e.id)} />)}
                  </div>
                </div>
              )}
              {pastEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past</p>
                  <div className="space-y-3 opacity-60">
                    {pastEvents.slice(0, 5).map((e) => <EventCard key={e.id} event={e} onDelete={() => deleteEvent(e.id)} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AnnouncementDialog
        open={announcementDialog}
        onClose={() => setAnnouncementDialog(false)}
        onSuccess={(a) => { setAnnouncements(prev => [a, ...prev]); setAnnouncementDialog(false); }}
      />
      <EventDialog
        open={eventDialog}
        onClose={() => setEventDialog(false)}
        onSuccess={(e) => { setEvents(prev => [e, ...prev]); setEventDialog(false); }}
      />
    </div>
  );
}

function EventCard({ event: e, onDelete }: { event: Event; onDelete: () => void }) {
  const upcoming = isFuture(new Date(e.startTime));
  return (
    <div className="dashboard-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0",
            upcoming ? "bg-indigo-50" : "bg-gray-50"
          )}>
            <span className={cn("text-xs font-bold", upcoming ? "text-indigo-600" : "text-gray-400")}>
              {format(new Date(e.startTime), "d")}
            </span>
            <span className={cn("text-[9px] uppercase font-semibold", upcoming ? "text-indigo-500" : "text-gray-400")}>
              {format(new Date(e.startTime), "MMM")}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{e.title}</h3>
              {e.isPublic && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">Public</span>}
            </div>
            {e.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{e.description}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span>{format(new Date(e.startTime), "HH:mm")} – {format(new Date(e.endTime), "HH:mm")}</span>
              {e.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {e.location}
                </span>
              )}
              {e.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {e.capacity} max
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onDelete}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
