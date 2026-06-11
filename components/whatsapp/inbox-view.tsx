"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare, Send, Search, Plus, Loader2, Check, CheckCheck, AlertCircle,
  Settings as SettingsIcon, ArrowLeft, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn, initials, formatRelative, formatTime, formatDate } from "@/lib/utils";

type Conversation = {
  phone: string;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  memberAvatar: string | null;
  lastMessage: string;
  lastDirection: string;
  lastAt: string;
  lastStatus: string;
  unreadCount: number;
  totalCount: number;
};

type Message = {
  id: string;
  phone: string;
  direction: "OUTBOUND" | "INBOUND";
  content: string;
  status: string;
  sentAt: string;
  templateName: string | null;
  failedReason: string | null;
  member: { user: { name: string | null; email: string } } | null;
};

type Member = {
  id: string;
  whatsAppNumber: string | null;
  user: { name: string | null; email: string };
};

type Props = {
  conversations: Conversation[];
  members: Member[];
  configured: boolean;
  displayNumber: string | null;
};

function StatusTick({ status }: { status: string }) {
  if (status === "READ") return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
  if (status === "DELIVERED") return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  if (status === "SENT") return <Check className="w-3.5 h-3.5 text-gray-400" />;
  if (status === "QUEUED") return <Clock className="w-3 h-3 text-gray-400" />;
  if (status === "FAILED") return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  return null;
}

export function InboxView({ conversations: initialConvos, members, configured, displayNumber }: Props) {
  const [conversations, setConversations] = useState(initialConvos);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newSending, setNewSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.phone === activePhone) ?? null;

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.phone.includes(q) ||
      (c.memberName ?? "").toLowerCase().includes(q) ||
      (c.memberEmail ?? "").toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  const loadThread = useCallback(async (phone: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setMessages(json.data ?? []);
      // Mark read
      await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}`, { method: "POST" });
      setConversations((prev) =>
        prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  function openConversation(phone: string) {
    setActivePhone(phone);
    loadThread(phone);
  }

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendDraft() {
    if (!draft.trim() || !active) return;
    setSending(true);
    const body = draft;
    setDraft("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: active.phone, memberId: active.memberId, body }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      await loadThread(active.phone);
      setConversations((prev) =>
        prev.map((c) =>
          c.phone === active.phone
            ? { ...c, lastMessage: body, lastDirection: "OUTBOUND", lastAt: new Date().toISOString(), lastStatus: "SENT" }
            : c
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  async function startNewConversation() {
    const member = members.find((m) => m.id === newMemberId);
    const to = member?.whatsAppNumber ?? newPhone;
    if (!to.trim()) { toast.error("Select a member or enter a phone number"); return; }
    if (!newBody.trim()) { toast.error("Enter a message"); return; }
    setNewSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, memberId: member?.id ?? null, body: newBody }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      const normalized = to.replace(/[^\d]/g, "");
      toast.success("Message sent");
      setNewOpen(false);
      setNewBody(""); setNewPhone(""); setNewMemberId("");
      // Optimistically add/raise the conversation
      setConversations((prev) => {
        const without = prev.filter((c) => c.phone !== normalized);
        return [
          {
            phone: normalized,
            memberId: member?.id ?? null,
            memberName: member?.user.name ?? null,
            memberEmail: member?.user.email ?? null,
            memberAvatar: null,
            lastMessage: newBody,
            lastDirection: "OUTBOUND",
            lastAt: new Date().toISOString(),
            lastStatus: "SENT",
            unreadCount: 0,
            totalCount: 1,
          },
          ...without,
        ];
      });
      openConversation(normalized);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setNewSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">WhatsApp</h1>
          <p className="page-subtitle">
            Two-way member messaging
            {displayNumber && <span className="text-gray-400"> · {displayNumber}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/whatsapp/templates">
            <Button variant="outline" className="h-9">Templates</Button>
          </Link>
          <Link href="/dashboard/whatsapp/broadcasts">
            <Button variant="outline" className="h-9">Broadcasts</Button>
          </Link>
          <Button onClick={() => setNewOpen(true)} className="h-9 text-white"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
            <Plus className="w-4 h-4 mr-1.5" /> New
          </Button>
        </div>
      </div>

      {!configured && (
        <div className="dashboard-card p-4 flex items-center gap-3 border-amber-200 bg-amber-50/50">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            WhatsApp Business API isn't connected yet. Messages won't be delivered until you add credentials.
          </p>
          <Link href="/dashboard/whatsapp/settings">
            <Button variant="outline" size="sm" className="h-8 border-amber-300 text-amber-700">
              <SettingsIcon className="w-3.5 h-3.5 mr-1.5" /> Configure
            </Button>
          </Link>
        </div>
      )}

      <div className="dashboard-card overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 460 }}>
        <div className="flex h-full">
          {/* Conversation list */}
          <div className={cn(
            "w-full sm:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col",
            activePhone ? "hidden sm:flex" : "flex"
          )}>
            <div className="p-3 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-8 h-9 text-sm" placeholder="Search conversations..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No conversations</p>
                  <button onClick={() => setNewOpen(true)} className="text-xs text-emerald-600 mt-1">
                    Start one →
                  </button>
                </div>
              ) : filtered.map((c) => (
                <button key={c.phone} onClick={() => openConversation(c.phone)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50",
                    activePhone === c.phone && "bg-emerald-50/60"
                  )}>
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="text-[11px] font-bold bg-emerald-100 text-emerald-700">
                      {c.memberName ? initials(c.memberName) : c.phone.slice(-2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.memberName ?? `+${c.phone}`}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatRelative(c.lastAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {c.lastDirection === "OUTBOUND" && <StatusTick status={c.lastStatus} />}
                      <p className="text-xs text-gray-500 truncate flex-1">{c.lastMessage}</p>
                      {c.unreadCount > 0 && (
                        <span className="flex-shrink-0 text-[10px] font-bold text-white bg-emerald-500 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className={cn("flex-1 flex flex-col min-w-0", activePhone ? "flex" : "hidden sm:flex")}>
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(34,197,94,0.1)" }}>
                  <MessageSquare className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                <p className="text-xs text-gray-400 mt-1">Choose a chat from the left or start a new one</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                  <button className="sm:hidden p-1 -ml-1" onClick={() => setActivePhone(null)}>
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-[11px] font-bold bg-emerald-100 text-emerald-700">
                      {active.memberName ? initials(active.memberName) : active.phone.slice(-2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {active.memberName ?? `+${active.phone}`}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      +{active.phone}
                      {active.memberId && active.memberEmail && ` · ${active.memberEmail}`}
                    </p>
                  </div>
                  {active.memberId && (
                    <Link href={`/dashboard/members/${active.memberId}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">View member</Button>
                    </Link>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
                  style={{ background: "#F7F8F7" }}>
                  {loadingThread ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-8">No messages yet</div>
                  ) : messages.map((m, i) => {
                    const showDate = i === 0 || formatDate(messages[i - 1]!.sentAt) !== formatDate(m.sentAt);
                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] font-medium text-gray-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
                              {formatDate(m.sentAt)}
                            </span>
                          </div>
                        )}
                        <div className={cn("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3 py-2 shadow-sm",
                            m.direction === "OUTBOUND"
                              ? "bg-emerald-500 text-white rounded-br-md"
                              : "bg-white text-gray-800 rounded-bl-md"
                          )}>
                            {m.templateName && (
                              <p className={cn("text-[10px] font-semibold mb-0.5",
                                m.direction === "OUTBOUND" ? "text-emerald-100" : "text-emerald-600")}>
                                ⚡ {m.templateName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <div className={cn("flex items-center gap-1 justify-end mt-0.5",
                              m.direction === "OUTBOUND" ? "text-emerald-100" : "text-gray-400")}>
                              <span className="text-[10px]">{formatTime(m.sentAt)}</span>
                              {m.direction === "OUTBOUND" && <StatusTick status={m.status} />}
                            </div>
                            {m.status === "FAILED" && m.failedReason && (
                              <p className="text-[10px] text-red-200 mt-0.5">Failed: {m.failedReason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>

                {/* Composer */}
                <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
                  <Textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDraft(); }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 resize-none max-h-32 min-h-[40px]"
                  />
                  <Button onClick={sendDraft} disabled={sending || !draft.trim()}
                    className="h-10 w-10 p-0 rounded-full text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New conversation dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Member <span className="text-gray-400 font-normal text-[11px]">with WhatsApp number</span></Label>
              <Select value={newMemberId} onValueChange={(v) => { setNewMemberId(v ?? ""); setNewPhone(""); }}>
                <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
                <SelectContent>
                  {members.length === 0 ? (
                    <SelectItem value="" disabled>No members have WhatsApp numbers</SelectItem>
                  ) : members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user.name ?? m.user.email} — {m.whatsAppNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input placeholder="+971 50 000 0000" value={newPhone}
                onChange={(e) => { setNewPhone(e.target.value); setNewMemberId(""); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={3} placeholder="Type your message..." value={newBody}
                onChange={(e) => setNewBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={startNewConversation} disabled={newSending} className="text-white"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {newSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
