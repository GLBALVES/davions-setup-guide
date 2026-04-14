import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Download, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Lead = { id: string; name: string; email: string; phone: string; country: string; created_at: string };

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleExport = () => {
    const csv = [
      "Name,Email,Phone,Country,Date",
      ...leads.map((l) => `"${l.name}","${l.email}","${l.phone}","${l.country}","${l.created_at}"`),
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
                <TableHead className="text-xs w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                    No leads yet
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm font-light">{lead.name}</TableCell>
                    <TableCell className="text-sm font-light">{lead.email}</TableCell>
                    <TableCell className="text-sm font-light">{lead.phone}</TableCell>
                    <TableCell className="text-sm font-light">{lead.country}</TableCell>
                    <TableCell className="text-sm font-light text-muted-foreground">
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
