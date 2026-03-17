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
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { upsertOneoffEmail } from "@/lib/email-api";
import { supabase } from "@/integrations/supabase/client";

export default function EmailOneoffEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const em = t.emailMarketing;

  const [form, setForm] = useState({
    name: "", subject: "", html_content: "",
    sender_name: "", sender_email: "",
    status: "draft", scheduled_at: "",
    audience: { type: "all" } as Record<string, unknown>,
  });

  const { data: oneoff } = useQuery({
    queryKey: ["mkt-oneoff-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mkt_email_oneoff").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (oneoff) {
      setForm({
        name: oneoff.name, subject: oneoff.subject,
        html_content: oneoff.html_content || "",
        sender_name: oneoff.sender_name, sender_email: oneoff.sender_email,
        status: oneoff.status,
        scheduled_at: oneoff.scheduled_at ? new Date(oneoff.scheduled_at).toISOString().slice(0, 16) : "",
        audience: (oneoff.audience as any) || { type: "all" },
      });
    }
  }, [oneoff]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form, photographer_id: user?.id,
        scheduled_at: form.scheduled_at || null,
      };
      if (!isNew) payload.id = id;
      return upsertOneoffEmail(payload);
    },
    onSuccess: (saved: any) => {
      toast.success("One-off email saved");
      qc.invalidateQueries({ queryKey: ["mkt-oneoffs"] });
      if (isNew) navigate(`/dashboard/emails/oneoff/${saved.id}`, { replace: true });
    },
    onError: () => toast.error("Failed to save"),
  });

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/emails")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{isNew ? em.newOneoff : em.edit}</h1>
            </div>

            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sender Name</Label><Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sender Email</Label><Input value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} /></div>
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
                <div className="sm:col-span-2 space-y-1">
                  <Label>HTML Content</Label>
                  <Textarea rows={8} value={form.html_content} onChange={(e) => setForm({ ...form, html_content: e.target.value })} placeholder="<html>..." />
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name} className="gap-1">
              <Save className="h-4 w-4" /> Save
            </Button>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
