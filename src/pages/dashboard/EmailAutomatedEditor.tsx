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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { upsertAutomatedEmail } from "@/lib/email-api";
import { supabase } from "@/integrations/supabase/client";

const triggerTypes = [
  { value: "new_booking", label: "New Booking" },
  { value: "booking_confirmed", label: "Booking Confirmed" },
  { value: "booking_cancelled", label: "Booking Cancelled" },
  { value: "gallery_published", label: "Gallery Published" },
  { value: "payment_received", label: "Payment Received" },
  { value: "inactivity_7d", label: "7-Day Inactivity" },
  { value: "inactivity_30d", label: "30-Day Inactivity" },
  { value: "custom", label: "Custom" },
];

export default function EmailAutomatedEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const em = t.emailMarketing;

  const [form, setForm] = useState({
    name: "", trigger_type: "new_booking", trigger_config: {} as Record<string, unknown>,
    subject: "", html_content: "", sender_name: "", sender_email: "", enabled: true,
  });

  const { data: automated } = useQuery({
    queryKey: ["mkt-automated-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mkt_email_automated").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (automated) {
      setForm({
        name: automated.name, trigger_type: automated.trigger_type,
        trigger_config: (automated.trigger_config as any) || {},
        subject: automated.subject, html_content: automated.html_content || "",
        sender_name: automated.sender_name, sender_email: automated.sender_email,
        enabled: automated.enabled,
      });
    }
  }, [automated]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, photographer_id: user?.id };
      if (!isNew) payload.id = id;
      return upsertAutomatedEmail(payload);
    },
    onSuccess: (saved: any) => {
      toast.success("Automated email saved");
      qc.invalidateQueries({ queryKey: ["mkt-automated"] });
      if (isNew) navigate(`/dashboard/emails/automated/${saved.id}`, { replace: true });
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
              <h1 className="text-2xl font-bold">{isNew ? em.newAutomated : em.edit}</h1>
            </div>

            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Trigger</Label>
                  <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                  <Label>{form.enabled ? "Active" : "Inactive"}</Label>
                </div>
                <div className="space-y-1"><Label>Sender Name</Label><Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sender Email</Label><Input value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} /></div>
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
