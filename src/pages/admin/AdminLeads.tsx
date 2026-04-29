import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Download, Trash2, Users, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  created_at: string;
  invited_at?: string | null;
  invited_user_id?: string | null;
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteTarget, setInviteTarget] = useState<Lead | null>(null);
  const [inviting, setInviting] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead removed");
  };

  const handleInvite = async () => {
    if (!inviteTarget) return;
    setInviting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { data, error } = await supabase.functions.invoke("invite-lead-as-user", {
        body: { lead_id: inviteTarget.id, redirect_to: redirectTo },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      if ((data as any)?.recovery_sent) {
        toast.success("User already existed — password reset link sent.");
      } else if ((data as any)?.already_existed) {
        toast.success("User already existed — lead marked as invited.");
      } else {
        toast.success("Invite email sent. The user can now set their password.");
      }

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === inviteTarget.id
            ? { ...l, invited_at: new Date().toISOString(), invited_user_id: (data as any)?.user_id ?? null }
            : l
        )
      );
      setInviteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to invite lead");
    } finally {
      setInviting(false);
    }
  };

  const handleExport = () => {
    const csv = [
      "Name,Email,Phone,Country,Date,Invited",
      ...leads.map((l) =>
        `"${l.name}","${l.email}","${l.phone}","${l.country}","${l.created_at}","${l.invited_at ?? ""}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={18} />
            <h1 className="text-lg font-light tracking-wide">Waitlist Leads</h1>
            <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={leads.length === 0}>
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Country</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No leads yet
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const invited = !!lead.invited_at;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="text-sm font-light">{lead.name}</TableCell>
                      <TableCell className="text-sm font-light">{lead.email}</TableCell>
                      <TableCell className="text-sm font-light">{lead.phone}</TableCell>
                      <TableCell className="text-sm font-light">{lead.country}</TableCell>
                      <TableCell className="text-sm font-light text-muted-foreground">
                        {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {invited ? (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <CheckCircle2 size={10} /> Invited
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={invited}
                            onClick={() => setInviteTarget(lead)}
                            title={invited ? "Already invited" : "Invite as user"}
                          >
                            <UserPlus size={12} className="mr-1" />
                            Invite
                          </Button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Delete lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!inviteTarget} onOpenChange={(open) => !open && !inviting && setInviteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invite as user?</AlertDialogTitle>
            <AlertDialogDescription>
              An account will be created for{" "}
              <span className="font-medium text-foreground">{inviteTarget?.name}</span> (
              <span className="font-medium text-foreground">{inviteTarget?.email}</span>) and an email
              will be sent with a link to define their password and access the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={inviting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 size={13} className="mr-1.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <UserPlus size={13} className="mr-1.5" /> Send invite
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
