import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import {
  fetchCampaign, upsertCampaign,
  fetchCampaignEmails, upsertCampaignEmail, deleteCampaignEmail,
} from "@/lib/email-api";

export default function EmailCampaignEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();

  const [form, setForm] = useState({
    name: "", subject: "", sender_name: "", sender_email: "",
    html_content: "", status: "draft", audience: { type: "all" },
  });

  const { data: campaign } = useQuery({
    queryKey: ["mkt-campaign", id],
    queryFn: () => fetchCampaign(id!),
    enabled: !isNew && !!id,
  });

  const { data: emails = [], refetch: refetchEmails } = useQuery({
    queryKey: ["mkt-campaign-emails", id],
    queryFn: () => fetchCampaignEmails(id!),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name, subject: campaign.subject,
        sender_name: campaign.sender_name, sender_email: campaign.sender_email,
        html_content: campaign.html_content || "",
        status: campaign.status,
        audience: (campaign.audience as any) || { type: "all" },
      });
    }
  }, [campaign]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, photographer_id: user?.id };
      if (!isNew) payload.id = id;
      return upsertCampaign(payload);
    },
    onSuccess: (saved: any) => {
      toast.success("Campaign saved");
      qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
      if (isNew) navigate(`/dashboard/emails/campaign/${saved.id}`, { replace: true });
    },
    onError: () => toast.error("Failed to save"),
  });

  const addEmail = useMutation({
    mutationFn: () => upsertCampaignEmail({
      campaign_id: id, email_order: emails.length + 1,
      subject: `Email ${emails.length + 1}`, delay_days: emails.length * 2,
    }),
    onSuccess: () => refetchEmails(),
  });

  const delEmail = useMutation({ mutationFn: deleteCampaignEmail, onSuccess: () => refetchEmails() });
  const updateEmail = useMutation({ mutationFn: (e: any) => upsertCampaignEmail(e), onSuccess: () => refetchEmails() });

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/emails")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{isNew ? "New Campaign" : "Edit Campaign"}</h1>
            </div>

            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sender Name</Label><Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sender Email</Label><Input value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} /></div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>HTML Content</Label>
                  <Textarea rows={6} value={form.html_content} onChange={(e) => setForm({ ...form, html_content: e.target.value })} placeholder="<html>..." />
                </div>
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
              </CardContent>
            </Card>

            <div className="flex gap-2 mb-6">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} className="gap-1">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>

            {!isNew && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Sequence Emails</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => addEmail.mutate()} className="gap-1">
                    <Plus className="h-4 w-4" /> Add Email
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emails.length === 0 && <p className="text-sm text-muted-foreground">No emails in the sequence.</p>}
                  {emails.map((em: any) => (
                    <Card key={em.id} className="border-dashed">
                      <CardContent className="pt-4 grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Subject</Label>
                          <Input defaultValue={em.subject} onBlur={(e) => updateEmail.mutate({ ...em, subject: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Delay (days)</Label>
                          <Input type="number" defaultValue={em.delay_days} onBlur={(e) => updateEmail.mutate({ ...em, delay_days: Number(e.target.value) })} />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Send Time</Label>
                            <Input type="time" defaultValue={em.send_time} onBlur={(e) => updateEmail.mutate({ ...em, send_time: e.target.value })} />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => delEmail.mutate(em.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-xs">HTML Content</Label>
                          <Textarea rows={3} defaultValue={em.html_content || ""} onBlur={(e) => updateEmail.mutate({ ...em, html_content: e.target.value })} placeholder="<html>..." />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
