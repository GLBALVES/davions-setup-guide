import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PendingUser = {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  approval_status: string;
  created_at: string;
};

type FilterTab = "pending" | "approved" | "rejected" | "all";

export default function AdminApprovals() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("photographers")
      .select("id, email, full_name, business_name, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message || "Failed to load approvals");
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (userId: string, status: "approved" | "rejected") => {
    setActing(userId);

    const { data, error } = await (supabase as any)
      .from("photographers")
      .update({ approval_status: status })
      .eq("id", userId)
      .select("id, approval_status")
      .maybeSingle();

    if (error) {
      toast.error(error.message || "Failed to update status");
      setActing(null);
      return;
    }

    if (!data || data.approval_status !== status) {
      toast.error("Status was not saved. Please try again.");
      await load();
      setActing(null);
      return;
    }

    await load();
    toast.success(status === "approved" ? "User approved" : "User rejected");
    setActing(null);
  };

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.approval_status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.business_name || "").toLowerCase().includes(q)
    );
  });

  const counts = {
    pending: users.filter((u) => u.approval_status === "pending").length,
    approved: users.filter((u) => u.approval_status === "approved").length,
    rejected: users.filter((u) => u.approval_status === "rejected").length,
    all: users.length,
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "all", label: `All (${counts.all})` },
  ];

  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">
            Management
          </h1>
          <p className="text-2xl font-light mt-1">User Approvals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-2 text-xs font-light tracking-wide transition-colors border-b-2 -mb-px",
                filter === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm h-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm font-light">
            No users found
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                    User
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground hidden md:table-cell">
                    Signed Up
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-light">
                        {u.business_name || u.full_name || "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-light tabular-nums hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded font-light",
                          u.approval_status === "approved" && "bg-green-500/10 text-green-600",
                          u.approval_status === "pending" && "bg-yellow-500/10 text-yellow-600",
                          u.approval_status === "rejected" && "bg-red-500/10 text-red-600"
                        )}
                      >
                        {u.approval_status === "approved" && <CheckCircle size={10} />}
                        {u.approval_status === "pending" && <Clock size={10} />}
                        {u.approval_status === "rejected" && <XCircle size={10} />}
                        {u.approval_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.approval_status !== "approved" && (
                          <button
                            onClick={() => updateStatus(u.id, "approved")}
                            disabled={acting === u.id}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border border-green-500/30 text-green-600 hover:bg-green-500/10 transition-colors font-light"
                          >
                            {acting === u.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <CheckCircle size={10} />
                            )}
                            Approve
                          </button>
                        )}
                        {u.approval_status !== "rejected" && (
                          <button
                            onClick={() => updateStatus(u.id, "rejected")}
                            disabled={acting === u.id}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors font-light"
                          >
                            {acting === u.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <XCircle size={10} />
                            )}
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
