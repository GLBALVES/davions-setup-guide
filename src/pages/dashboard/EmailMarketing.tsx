import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Mail, Plus, Trash2, Pencil, Send, Clock,
  Zap, CalendarClock, MailOpen,
} from "lucide-react";
import {
  fetchCampaigns, deleteCampaign,
  fetchAutomatedEmails, deleteAutomatedEmail, upsertAutomatedEmail,
  fetchOneoffEmails, deleteOneoffEmail,
} from "@/lib/email-api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "default",
  active: "default",
};

export default function EmailMarketing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const em = t.emailMarketing;
  const photographerId = user?.id || "";

  const { data: campaigns = [], isLoading: loadingC } = useQuery({
    queryKey: ["mkt-campaigns", photographerId],
    queryFn: () => fetchCampaigns(photographerId),
    enabled: !!photographerId,
  });
  const { data: automated = [], isLoading: loadingA } = useQuery({
    queryKey: ["mkt-automated", photographerId],
    queryFn: () => fetchAutomatedEmails(photographerId),
    enabled: !!photographerId,
  });
  const { data: oneoffs = [], isLoading: loadingO } = useQuery({
    queryKey: ["mkt-oneoffs", photographerId],
    queryFn: () => fetchOneoffEmails(photographerId),
    enabled: !!photographerId,
  });

  const delCampaign = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); toast.success("Campaign deleted"); },
  });
  const delAutomated = useMutation({
    mutationFn: deleteAutomatedEmail,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-automated"] }); toast.success("Automated email deleted"); },
  });
  const toggleAutomated = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => upsertAutomatedEmail({ id, enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mkt-automated"] }),
  });
  const delOneoff = useMutation({
    mutationFn: deleteOneoffEmail,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-oneoffs"] }); toast.success("One-off email deleted"); },
  });

  const DeleteBtn = ({ onConfirm }: { onConfirm: () => void }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Email Marketing</h1>
                <p className="text-sm text-muted-foreground">Campaigns, automated emails, and one-off sends</p>
              </div>
            </div>

            <Tabs defaultValue="campaigns">
              <TabsList>
                <TabsTrigger value="campaigns" className="gap-1"><Send className="h-4 w-4" /> Campaigns</TabsTrigger>
                <TabsTrigger value="automated" className="gap-1"><Zap className="h-4 w-4" /> Automated</TabsTrigger>
                <TabsTrigger value="oneoff" className="gap-1"><CalendarClock className="h-4 w-4" /> One-off</TabsTrigger>
              </TabsList>

              {/* CAMPAIGNS */}
              <TabsContent value="campaigns" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => navigate("/dashboard/emails/campaign/new")} className="gap-1">
                    <Plus className="h-4 w-4" /> New Campaign
                  </Button>
                </div>
                {loadingC ? <p className="text-sm text-muted-foreground">Loading…</p> : campaigns.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">No campaigns created yet.</CardContent></Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((c: any) => (
                      <Card key={c.id} className="hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{c.name}</CardTitle>
                            <Badge variant={(statusColor[c.status] as any) || "secondary"} className="text-[10px] capitalize">{c.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.subject}</p>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MailOpen className="h-3 w-3" />
                            {(c.stats as any)?.sent || 0} sent
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/emails/campaign/${c.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteBtn onConfirm={() => delCampaign.mutate(c.id)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* AUTOMATED */}
              <TabsContent value="automated" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => navigate("/dashboard/emails/automated/new")} className="gap-1">
                    <Plus className="h-4 w-4" /> New Automated
                  </Button>
                </div>
                {loadingA ? <p className="text-sm text-muted-foreground">Loading…</p> : automated.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">No automated emails created yet.</CardContent></Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {automated.map((g: any) => (
                      <Card key={g.id} className="hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{g.name}</CardTitle>
                            <Switch
                              checked={g.enabled}
                              onCheckedChange={(v) => toggleAutomated.mutate({ id: g.id, enabled: v })}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Trigger: {g.trigger_type}</p>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate max-w-[60%]">{g.subject}</p>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/emails/automated/${g.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteBtn onConfirm={() => delAutomated.mutate(g.id)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ONE-OFF */}
              <TabsContent value="oneoff" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => navigate("/dashboard/emails/oneoff/new")} className="gap-1">
                    <Plus className="h-4 w-4" /> New One-off
                  </Button>
                </div>
                {loadingO ? <p className="text-sm text-muted-foreground">Loading…</p> : oneoffs.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">No one-off emails created yet.</CardContent></Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {oneoffs.map((p: any) => (
                      <Card key={p.id} className="hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{p.name}</CardTitle>
                            <Badge variant={(statusColor[p.status] as any) || "secondary"} className="text-[10px] capitalize">{p.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.subject}</p>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {p.scheduled_at ? <><Clock className="h-3 w-3" /> {new Date(p.scheduled_at).toLocaleDateString()}</> : <span>Not scheduled</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/emails/oneoff/${p.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteBtn onConfirm={() => delOneoff.mutate(p.id)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
