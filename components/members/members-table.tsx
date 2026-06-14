"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, UserPlus, ChevronRight, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, initials, humanizeEnum, cn } from "@/lib/utils";
import { InviteMemberDialog } from "@/components/members/invite-member-dialog";
import type { MemberStatus } from "@prisma/client";

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-800",
};

type Member = {
  id: string; status: MemberStatus; credits: number; company: string | null;
  jobTitle: string | null; startDate: Date | null; createdAt: Date;
  user: { name: string | null; email: string; avatar: string | null };
  membershipPlan: { name: string; price: any; billingCycle: string } | null;
};

type Plan = { id: string; name: string; price: any };

type Props = {
  members: Member[]; total: number; page: number; limit: number;
  currency: string; plans: Plan[]; organizationId: string;
};

export function MembersTable({ members, total, page, limit, currency, plans, organizationId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);

  function updateSearch(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/dashboard/members?${params}`));
  }

  const totalPages = Math.ceil(total / limit);
  const noFilters = !searchParams.get("search") && (!searchParams.get("status") || searchParams.get("status") === "all");

  // Brand-new org → guided empty state instead of an empty table + filter bar.
  if (total === 0 && noFilters) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">The people who use your space</p>
        </div>
        <EmptyState
          icon={Users}
          title="Invite your members"
          description="Members get their own portal to book spaces, view invoices, and manage documents. Invite them by email — they set their own password from the link."
          steps={[
            "Invite a member by name and email.",
            "Optionally put them on a membership plan.",
            "They accept the email invite and can start booking.",
          ]}
          primary={{ label: "Invite your first member", onClick: () => setInviteOpen(true) }}
        />
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          plans={plans}
          organizationId={organizationId}
          onSuccess={() => { setInviteOpen(false); router.refresh(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{total} total member{total !== 1 ? "s" : ""}</p>
        </div>
        <Button id="invite-member-btn" onClick={() => setInviteOpen(true)}
          className="h-9 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Invite member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="member-search"
            placeholder="Search members…"
            className="pl-9 h-9 bg-white"
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => updateSearch("search", e.target.value)}
          />
        </div>
        <Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(v) => updateSearch("status", v ?? "all")}>
          <SelectTrigger className="h-9 w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: card list (< sm) */}
      <div className="sm:hidden dashboard-card divide-y divide-gray-50 overflow-hidden">
        {members.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">No members found</p>
        ) : members.map((m) => (
          <div key={m.id} onClick={() => router.push(`/dashboard/members/${m.id}`)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors active:bg-gray-100">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className="text-xs font-bold bg-green-100 text-green-700">
                {initials(m.user.name ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.user.name ?? "—"}</p>
                <Badge className={cn("text-[10px] font-semibold flex-shrink-0", STATUS_STYLES[m.status])}>
                  {humanizeEnum(m.status)}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
              {m.membershipPlan && (
                <p className="text-xs text-gray-500 mt-0.5">{m.membershipPlan.name} · {formatCurrency(Number(m.membershipPlan.price), currency)}/{m.membershipPlan.billingCycle.toLowerCase()}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Desktop: table (sm+) */}
      <div className="hidden sm:block dashboard-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Member</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-gray-50/50"
                  onClick={() => router.push(`/dashboard/members/${m.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs font-bold bg-green-100 text-green-700">
                          {initials(m.user.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.user.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.membershipPlan ? (
                      <div>
                        <p className="text-sm font-medium">{m.membershipPlan.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(Number(m.membershipPlan.price), currency)}/
                          {m.membershipPlan.billingCycle.toLowerCase()}
                        </p>
                      </div>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs font-medium", STATUS_STYLES[m.status])}>
                      {humanizeEnum(m.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-900">{m.credits}</span>
                    <span className="text-gray-400 text-xs ml-1">cr</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(m.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/members/${m.id}`); }}>
                      View →
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} members)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => updateSearch("page", String(page - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => updateSearch("page", String(page + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        plans={plans}
        organizationId={organizationId}
        onSuccess={() => { setInviteOpen(false); router.refresh(); }}
      />
    </div>
  );
}
