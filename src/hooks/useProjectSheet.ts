import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProjectSheetData } from "@/components/dashboard/ProjectDetailSheet";
import type { SessionType } from "@/components/dashboard/SessionTypeManager";

export function useProjectSheet(photographerId: string | undefined) {
  const [sheetProject, setSheetProject] = useState<ProjectSheetData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);

  const fetchSessionTypes = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", photographerId)
      .order("name");
    if (data) setSessionTypes(data as SessionType[]);
  }, [photographerId]);

  const openByBookingId = useCallback(async (bookingId: string) => {
    const { data } = await supabase
      .from("client_projects" as any)
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!data) {
      toast.error("No project found for this booking");
      return;
    }

    await fetchSessionTypes();
    setSheetProject(data as unknown as ProjectSheetData);
    setSheetOpen(true);
  }, [fetchSessionTypes]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<ProjectSheetData>) => {
    const { error } = await supabase
      .from("client_projects" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update project");
      return;
    }
    setSheetProject((prev) => prev ? { ...prev, ...updates } : prev);
    toast.success("Project updated");
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from("client_projects" as any).delete().eq("id", id);
    setSheetOpen(false);
    toast.success("Project removed");
  }, []);

  const handleArchive = useCallback(async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "archived" } as any).eq("id", id);
    setSheetProject((prev) => prev?.id === id ? { ...prev, stage: "archived" as any } : prev);
    toast.success("Project archived");
  }, []);

  const handleUnarchive = useCallback(async (id: string) => {
    await supabase.from("client_projects" as any).update({ stage: "upcoming" } as any).eq("id", id);
    setSheetProject((prev) => prev?.id === id ? { ...prev, stage: "upcoming" as any } : prev);
    toast.success("Project restored");
  }, []);

  return {
    sheetProject,
    sheetOpen,
    setSheetOpen,
    sessionTypes,
    fetchSessionTypes,
    openByBookingId,
    handleUpdate,
    handleDelete,
    handleArchive,
    handleUnarchive,
    setSheetProject,
  };
}
