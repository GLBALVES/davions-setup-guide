import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Pencil, Clock } from "lucide-react";
import { fetchPushNotifications, upsertPushNotification, deletePushNotification } from "@/lib/push-api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = { draft: "secondary", scheduled: "outline", sent: "default" };

const emptyForm = {
  name: "", title: "", body: "", image_url: "", action_url: "",
  status: "draft", scheduled_at: "", audience: { type: "all" },
};

export default function PushNotifications() {
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const photographerId = user?.id || "";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mkt-push", photographerId],
    queryFn: () => fetchPushNotifications(photographerId),
    enabled: !!photographerId,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form, photographer_id: user?.id, scheduled_at: form.scheduled_at || null };
      if (editId) payload.id = editId;
      return upsertPushNotification(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-push"] });
      toast.success(editId ? "Notification updated" : "Notification created");
      setOpen(false); setForm(emptyForm); setEditId(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const del = useMutation({
    mutationFn: deletePushNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-push"] }); toast.success("Deleted"); },
  });

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name, title: item.title, body: item.body,
      image_url: item.image_url || "", action_url: item.action_url || "",
      status: item.status, audience: item.audience || { type: "all" },
      scheduled_at: item.scheduled_at ? new Date(item.scheduled_at).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  };

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Push Notifications</h1>
                  <p className="text-sm text-muted-foreground">Create and schedule push notifications</p>
                </div>
              </div>
              <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> New Notification</Button>
            </div>

            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No notifications created yet.</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item: any) => (
                  <Card key={item.id} className="hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <Badge variant={(statusColor[item.status] as any) || "secondary"} className="text-[10px] capitalize">{item.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {item.scheduled_at ? <><Clock className="h-3 w-3" /> {new Date(item.scheduled_at).toLocaleDateString()}</> : <span>Not scheduled</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader><SheetTitle>{editId ? "Edit Notification" : "New Notification"}</SheetTitle></SheetHeader>
                <div className="grid gap-4 mt-6">
                  <div className="space-y-1"><Label>Internal Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Body</Label><Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
                  <div className="space-y-1"><Label>Action URL</Label><Input value={form.action_url} onChange={(e) => setForm({ ...form, action_url: e.target.value })} placeholder="/page" /></div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Schedule</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                  <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.title} className="mt-2">Save</Button>
                </div>
              </SheetContent>
            </Sheet>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
