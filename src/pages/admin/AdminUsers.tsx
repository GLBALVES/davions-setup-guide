import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2, Shield, ShieldOff, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Studio = {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_country: string | null;
  business_currency: string | null;
  store_slug: string | null;
  stripe_account_id: string | null;
  created_at: string;
  isAdmin?: boolean;
};

export default function AdminUsers() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: sData }, { data: rData }] = await Promise.all([
        (supabase as any).from("photographers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      setStudios(sData || []);
      setAdminIds(new Set((rData || []).map((r: { user_id: string }) => r.user_id)));
      setLoading(false);
    };
    load();
  }, []);

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    setToggling(userId);
    if (currentlyAdmin) {
      const { error } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) { toast.error("Failed to remove admin"); setToggling(null); return; }
      setAdminIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
      toast.success("Admin role removed");
    } else {
      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error) { toast.error("Failed to grant admin"); setToggling(null); return; }
      setAdminIds((prev) => new Set(prev).add(userId));
      toast.success("Admin role granted");
    }
    setToggling(null);
  };

  const filtered = studios.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.business_name || "").toLowerCase().includes(q) ||
      (s.full_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">Management</h1>
            <p className="text-2xl font-light mt-1">Studios</p>
          </div>
          <p className="text-xs text-muted-foreground font-light tabular-nums">{studios.length} total</p>
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
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">Studio</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground hidden md:table-cell">Country</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground hidden lg:table-cell">Joined</th>
                  <th className="text-right px-4 py-2.5 text-[10px] tracking-widest uppercase font-light text-muted-foreground">Role</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isAdmin = adminIds.has(s.id);
                  const isExpanded = expandedId === s.id;
                  return (
                    <>
                      <tr
                        key={s.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-light">{s.business_name || s.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground/60">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-light hidden md:table-cell">
                          {s.business_country || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-light tabular-nums hidden lg:table-cell">
                          {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAdmin(s.id, isAdmin); }}
                            disabled={toggling === s.id}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border font-light transition-all duration-150",
                              isAdmin
                                ? "border-foreground/30 text-foreground bg-foreground/5 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                            )}
                          >
                            {toggling === s.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : isAdmin ? (
                              <Shield size={10} />
                            ) : (
                              <ShieldOff size={10} />
                            )}
                            {isAdmin ? "Admin" : "User"}
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          {isExpanded
                            ? <ChevronUp size={13} className="text-muted-foreground" />
                            : <ChevronDown size={13} className="text-muted-foreground" />}
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {isExpanded && (
                        <tr key={`${s.id}-detail`} className="border-b border-border bg-muted/10">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { label: "User ID", value: s.id.slice(0, 16) + "…" },
                                { label: "Currency", value: s.business_currency || "—" },
                                { label: "Store Slug", value: s.store_slug || "—" },
                                { label: "Stripe", value: s.stripe_account_id ? "Connected" : "Not connected" },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-light mb-0.5">{label}</p>
                                  <p className="text-xs font-light text-foreground/80">{value}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
