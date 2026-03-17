import { useState, useEffect } from "react";
import { Plus, ShieldCheck, Trash2, UserPlus, Check, X, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

type Permissions = Record<string, boolean>;

interface StudioRole {
  id: string;
  name: string;
  permissions: Permissions;
  created_at: string;
}

interface StudioMember {
  id: string;
  email: string;
  full_name: string;
  role_id: string | null;
  status: string;
  invited_at: string;
  joined_at: string | null;
}

// ── Permission groups ─────────────────────────────────────────────────────────

const PERMISSION_GROUPS: { label: string; keys: { key: string; label: string }[] }[] = [
  {
    label: "Studio",
    keys: [
      { key: "sessions", label: "Sessions" },
      { key: "schedule", label: "Schedule" },
      { key: "bookings", label: "Bookings" },
      { key: "galleries", label: "Galleries" },
      { key: "clients", label: "Clients" },
    ],
  },
  {
    label: "Marketing",
    keys: [
      { key: "website", label: "Website" },
      { key: "blog", label: "Blog" },
      { key: "creative", label: "Creative Studio" },
      { key: "seo", label: "SEO" },
      { key: "emails", label: "Emails" },
      { key: "push", label: "Push" },
      { key: "chat", label: "Chat" },
    ],
  },
  {
    label: "AI & Workflows",
    keys: [
      { key: "agents", label: "AI Agents" },
      { key: "workflow", label: "Kanban" },
      { key: "recurring", label: "Recurring Workflows" },
    ],
  },
  {
    label: "Finance",
    keys: [{ key: "finance", label: "Finance" }],
  },
];

const DEFAULT_PERMISSIONS: Permissions = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.keys.map(({ key }) => [key, false]))
);

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    revoked: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest uppercase font-medium ${
        map[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccessControl() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const ac = t.accessControl;

  const [roles, setRoles] = useState<StudioRole[]>([]);
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invite dialog → now "Create User" dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  // New role dialog
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    fetchRoles();
    fetchMembers();
  }, [user]);

  async function fetchRoles() {
    setLoadingRoles(true);
    const { data, error } = await supabase
      .from("studio_roles")
      .select("*")
      .eq("photographer_id", user!.id)
      .order("created_at", { ascending: true });
    if (!error && data) setRoles(data as StudioRole[]);
    setLoadingRoles(false);
  }

  async function fetchMembers() {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("studio_members")
      .select("*")
      .eq("photographer_id", user!.id)
      .order("invited_at", { ascending: false });
    if (!error && data) setMembers(data as StudioMember[]);
    setLoadingMembers(false);
  }

  // ── Select role ────────────────────────────────────────────────────────────

  function handleSelectRole(role: StudioRole) {
    setSelectedRoleId(role.id);
    setEditingRoleName(role.name);
    const merged = { ...DEFAULT_PERMISSIONS, ...(role.permissions as Permissions) };
    setEditingPerms(merged);
  }

  // ── Save permissions ───────────────────────────────────────────────────────

  async function handleSaveRole() {
    if (!selectedRoleId) return;
    setSavingRole(true);
    const { error } = await supabase
      .from("studio_roles")
      .update({ name: editingRoleName, permissions: editingPerms })
      .eq("id", selectedRoleId)
      .eq("photographer_id", user!.id);
    if (error) {
      toast({ title: ac.errorSavingRole, variant: "destructive" });
    } else {
      toast({ title: ac.roleSaved });
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? { ...r, name: editingRoleName, permissions: editingPerms }
            : r
        )
      );
    }
    setSavingRole(false);
  }

  // ── Create role ────────────────────────────────────────────────────────────

  async function handleCreateRole() {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    const { data, error } = await supabase
      .from("studio_roles")
      .insert({ photographer_id: user!.id, name: newRoleName.trim(), permissions: DEFAULT_PERMISSIONS })
      .select()
      .single();
    if (error) {
      toast({ title: ac.errorCreatingRole, variant: "destructive" });
    } else {
      const newRole = data as StudioRole;
      setRoles((prev) => [...prev, newRole]);
      handleSelectRole(newRole);
      setNewRoleOpen(false);
      setNewRoleName("");
      toast({ title: ac.roleCreated });
    }
    setCreatingRole(false);
  }

  async function handleDeleteRole(roleId: string) {
    const { error } = await supabase
      .from("studio_roles")
      .delete()
      .eq("id", roleId)
      .eq("photographer_id", user!.id);
    if (error) {
      toast({ title: ac.errorDeletingRole, variant: "destructive" });
    } else {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
        setEditingPerms(DEFAULT_PERMISSIONS);
        setEditingRoleName("");
      }
      toast({ title: ac.roleDeleted });
    }
  }

  async function handleCreateUser() {
    if (!inviteEmail.trim() || !inviteName.trim() || !invitePassword.trim()) return;
    if (invitePassword.trim().length < 6) {
      toast({ title: ac.passwordMinError, variant: "destructive" });
      return;
    }
    setInviting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-studio-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          full_name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          password: invitePassword.trim(),
          role_id: inviteRoleId || null,
        }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error ?? ac.errorCreatingRole, variant: "destructive" });
    } else {
      toast({ title: ac.userCreated });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteRoleId("");
      fetchMembers();
    }
    setInviting(false);
  }

  async function handleToggleMemberStatus(member: StudioMember) {
    const newStatus = member.status === "revoked" ? "pending" : "revoked";
    const { error } = await supabase
      .from("studio_members")
      .update({ status: newStatus })
      .eq("id", member.id)
      .eq("photographer_id", user!.id);
    if (error) {
      toast({ title: ac.errorUpdatingMember, variant: "destructive" });
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
      );
    }
  }

  async function handleDeleteMember(memberId: string) {
    const { error } = await supabase
      .from("studio_members")
      .delete()
      .eq("id", memberId)
      .eq("photographer_id", user!.id);
    if (error) {
      toast({ title: ac.errorRemovingMember, variant: "destructive" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast({ title: ac.memberRemoved });
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardHeader />

          {/* Page title bar */}
            <div className="border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <h1 className="text-sm tracking-widest uppercase font-light">{ac.pageTitle}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{ac.pageSubtitle}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              {ac.addUser}
            </Button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: Roles ── */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
              {ac.rolesLabel}
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setNewRoleOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {ac.newRole}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {loadingRoles ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground animate-pulse">{ac.loading}</div>
            ) : roles.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">{ac.noRoles}</div>
            ) : (
              roles.map((role) => (
                <button key={role.id} onClick={() => handleSelectRole(role)} className={`w-full flex items-center justify-between gap-2 px-5 py-3 text-left transition-colors group ${selectedRoleId === role.id ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"}`}>
                  <span className="text-xs tracking-wider uppercase font-light truncate">{role.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" aria-label={ac.deleteRole}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Center panel: Permissions editor ── */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          {selectedRole ? (
            <>
              <div className="px-5 py-4 border-b border-border">
                <Input value={editingRoleName} onChange={(e) => setEditingRoleName(e.target.value)} className="text-xs tracking-wider uppercase font-light h-8" placeholder="Role name" />
              </div>
              <div className="flex-1 overflow-y-auto py-3 px-5 space-y-5">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground/60 font-light mb-2">{group.label}</p>
                    <div className="space-y-2">
                      {group.keys.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2.5">
                          <Checkbox id={`perm-${key}`} checked={!!editingPerms[key]} onCheckedChange={(checked) => setEditingPerms((prev) => ({ ...prev, [key]: !!checked }))} />
                          <label htmlFor={`perm-${key}`} className="text-xs tracking-wider font-light cursor-pointer select-none">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <Button size="sm" className="w-full" onClick={handleSaveRole} disabled={savingRole}>
                  {savingRole ? ac.savingRole : ac.saveRole}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center px-6">{ac.selectRoleHint}</p>
            </div>
          )}
        </div>

        {/* ── Right panel: Members ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{ac.membersLabel}</span>
          </div>
          <div className="flex-1 overflow-auto">
            {loadingMembers ? (
              <div className="px-6 py-12 text-center text-xs text-muted-foreground animate-pulse">
                Loading…
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <UserPlus className="h-10 w-10 opacity-20" />
                <p className="text-xs tracking-wider">No users yet. Create the first one.</p>
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] tracking-widest uppercase">Name</TableHead>
                    <TableHead className="text-[10px] tracking-widest uppercase">Email</TableHead>
                    <TableHead className="text-[10px] tracking-widest uppercase">Role</TableHead>
                    <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
                    <TableHead className="text-[10px] tracking-widest uppercase w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const role = roles.find((r) => r.id === member.role_id);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="text-xs font-light">
                          {member.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-light">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          {role ? (
                            <span className="text-xs tracking-wider uppercase font-light">
                              {role.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={member.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleToggleMemberStatus(member)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-1"
                              title={member.status === "revoked" ? "Restore access" : "Revoke access"}
                            >
                              {member.status === "revoked" ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              title="Remove member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>{/* right panel scroll */}
        </div>{/* right panel */}
        </div>{/* body flex */}
        </div>{/* flex-1 flex flex-col min-w-0 */}

      {/* ── Create User Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) { setInviteEmail(""); setInviteName(""); setInvitePassword(""); setInviteRoleId(""); setShowPassword(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase font-light">
              Add Team Member
            </DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Create a login for a collaborator and assign their access level.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-light">Full Name</Label>
              <Input
                placeholder="Ana Lima"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-light">Email</Label>
              <Input
                type="email"
                placeholder="ana@studio.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-light">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {invitePassword && invitePassword.length < 6 && (
                <p className="text-[10px] text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase font-light">Role</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateUser}
              disabled={inviting || !inviteEmail.trim() || !inviteName.trim() || invitePassword.length < 6}
            >
              {inviting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Role Dialog ── */}
      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase font-light">
              New Role
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. Editor, Assistant"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateRole}
              disabled={creatingRole || !newRoleName.trim()}
            >
            {creatingRole ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>{/* min-h-screen flex w-full */}
    </SidebarProvider>
  );
}
