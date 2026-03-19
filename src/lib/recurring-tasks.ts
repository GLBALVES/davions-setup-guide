import { supabase } from "@/integrations/supabase/client";

export type RecurringTask = {
  id: string;
  created_at: string;
  photographer_id: string;
  title: string;
  department: string | null;
  owner_name: string | null;
  notes: string | null;
  start_date: string;
  state: "draft" | "active" | "paused";
  started_at: string | null;
  estimated_minutes: number | null;
  schedule_freq: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannual" | "yearly";
  schedule_interval: number;
  schedule_days_of_week: number[];
  schedule_day_of_month: number | null;
  avoid_weekends: boolean;
  enabled: boolean;
  weekend_policy: "next_business_day" | "previous_business_day" | "skip";
  user_id: string;
  repeat_count: number | null;
  display_order: number;
};

export type TaskOccurrence = {
  id: string;
  created_at: string;
  recurring_task_id: string;
  due_date: string;
  status: "pending" | "overdue" | "completed_on_time" | "completed_late";
  completed_at: string | null;
  actual_minutes: number | null;
  completion_notes: string | null;
  late_by_days: number;
  recurring_task?: RecurringTask;
};

// ---- CRUD ----

export async function fetchRecurringTasks(photographerId: string) {
  const { data, error } = await supabase
    .from("recurring_tasks" as any)
    .select("*")
    .eq("photographer_id", photographerId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RecurringTask[];
}

export async function createRecurringTask(task: Partial<RecurringTask> & { title: string; start_date: string; user_id: string; photographer_id: string }) {
  const { data, error } = await supabase.from("recurring_tasks" as any).insert(task as any).select().single();
  if (error) throw error;
  return data as unknown as RecurringTask;
}

export async function updateRecurringTask(id: string, updates: Partial<RecurringTask>) {
  const { error } = await supabase.from("recurring_tasks" as any).update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringTask(id: string) {
  const { error } = await supabase.from("recurring_tasks" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateRecurringTask(task: RecurringTask, userId: string) {
  const { id, created_at, started_at, state, ...rest } = task;
  return createRecurringTask({ ...rest, state: "draft", started_at: null, user_id: userId });
}

// ---- Occurrences ----

export async function fetchOccurrences(filters?: { recurringTaskId?: string; status?: string; from?: string; to?: string; department?: string; ownerName?: string }) {
  let q = supabase.from("task_occurrences" as any).select("*, recurring_tasks(*)").order("due_date", { ascending: true });
  if (filters?.recurringTaskId) q = q.eq("recurring_task_id", filters.recurringTaskId);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.from) q = q.gte("due_date", filters.from);
  if (filters?.to) q = q.lte("due_date", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  let results = ((data ?? []) as any[]).map((d: any) => ({ ...d, recurring_task: d.recurring_tasks }));
  if (filters?.department) results = results.filter((r: any) => r.recurring_task?.department === filters.department);
  if (filters?.ownerName) results = results.filter((r: any) => r.recurring_task?.owner_name === filters.ownerName);
  return results as TaskOccurrence[];
}

export async function completeOccurrence(id: string, actualMinutes: number, completionNotes: string, dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate + "T23:59:59");
  const onTime = now <= due;
  const lateDays = onTime ? 0 : Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const status = onTime ? "completed_on_time" : "completed_late";
  const { error } = await supabase.from("task_occurrences" as any).update({
    status,
    completed_at: now.toISOString(),
    actual_minutes: actualMinutes,
    completion_notes: completionNotes,
    late_by_days: lateDays,
  } as any).eq("id", id);
  if (error) throw error;
}

export async function markOverdue() {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("task_occurrences" as any)
    .update({ status: "overdue" } as any)
    .eq("status", "pending")
    .lt("due_date", today);
  if (error) throw error;
}

// ---- Start / Pause ----

export async function startTask(task: RecurringTask) {
  await updateRecurringTask(task.id, { state: "active", started_at: new Date().toISOString() } as any);
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("task_occurrences" as any)
    .select("id")
    .eq("recurring_task_id", task.id)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabase.from("task_occurrences" as any).insert({
      recurring_task_id: task.id,
      due_date: task.start_date <= today ? task.start_date : task.start_date,
      status: "pending",
    } as any);
  }
}

export async function pauseTask(taskId: string) {
  await updateRecurringTask(taskId, { state: "paused" } as any);
}

// ---- Metrics ----
export function computeMetrics(occurrences: TaskOccurrence[]) {
  const completed = occurrences.filter(o => o.status === "completed_on_time" || o.status === "completed_late");
  const onTime = occurrences.filter(o => o.status === "completed_on_time").length;
  const late = occurrences.filter(o => o.status === "completed_late").length;
  const today = new Date().toISOString().split("T")[0];
  const overdueOpen = occurrences.filter(o => o.status === "overdue" || (o.status === "pending" && o.due_date < today)).length;
  const totalExecuted = completed.length;
  const onTimeRate = totalExecuted > 0 ? Math.round((onTime / totalExecuted) * 100) : 0;
  const lateRate = totalExecuted > 0 ? Math.round((late / totalExecuted) * 100) : 0;
  const avgMinutes = completed.length > 0
    ? Math.round(completed.reduce((s, o) => s + (o.actual_minutes ?? 0), 0) / completed.length)
    : 0;

  return { totalExecuted, onTime, late, overdueOpen, onTimeRate, lateRate, avgMinutes };
}
