import { supabase } from "@/integrations/supabase/client";

export interface WorkflowProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  owner_id: string;
  photographer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSection {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
}

export interface WorkflowTask {
  id: string;
  project_id: string;
  section_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  department: string | null;
  position: number;
  attachments: any;
  created_by: string;
  photographer_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface WorkflowActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface WorkflowMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// Projects
export async function fetchProjects(photographerId: string) {
  const { data, error } = await supabase
    .from("workflow_projects" as any)
    .select("*")
    .eq("photographer_id", photographerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as WorkflowProject[];
}

export async function createProject(name: string, description: string, color: string, userId: string, photographerId: string) {
  const { data, error } = await supabase
    .from("workflow_projects" as any)
    .insert({ name, description, color, owner_id: userId, photographer_id: photographerId } as any)
    .select()
    .single();
  if (error) throw error;
  const project = data as unknown as WorkflowProject;

  await supabase.from("workflow_members" as any).insert({
    project_id: project.id, user_id: userId, role: "owner",
  } as any);

  const defaults = ["To Do", "In Progress", "In Review", "Done"];
  for (let i = 0; i < defaults.length; i++) {
    await supabase.from("workflow_sections" as any).insert({
      project_id: project.id, name: defaults[i], position: i,
    } as any);
  }

  return project;
}

export async function updateProject(projectId: string, updates: Partial<WorkflowProject>) {
  const { data, error } = await supabase
    .from("workflow_projects" as any)
    .update(updates as any)
    .eq("id", projectId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkflowProject;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from("workflow_projects" as any).delete().eq("id", projectId);
  if (error) throw error;
}

export async function fetchTaskCountsByProject(projectIds: string[]) {
  if (projectIds.length === 0) return {};
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .select("project_id, id")
    .in("project_id", projectIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((t: any) => {
    counts[t.project_id] = (counts[t.project_id] || 0) + 1;
  });
  return counts;
}

export async function fetchAssignedProjects(userId: string) {
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .select("project_id")
    .eq("assignee_id", userId);
  if (error) throw error;
  return [...new Set((data || []).map((t: any) => t.project_id))] as string[];
}

// Sections
export async function fetchSections(projectId: string) {
  const { data, error } = await supabase
    .from("workflow_sections" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("position");
  if (error) throw error;
  return (data || []) as unknown as WorkflowSection[];
}

export async function createSection(projectId: string, name: string, position: number) {
  const { data, error } = await supabase
    .from("workflow_sections" as any)
    .insert({ project_id: projectId, name, position } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkflowSection;
}

// Tasks
export async function fetchTasks(projectId: string) {
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("position");
  if (error) throw error;
  return (data || []) as unknown as WorkflowTask[];
}

export async function createTask(params: {
  project_id: string; section_id: string; title: string; created_by: string; photographer_id: string;
  description?: string; assignee_id?: string; priority?: string; due_date?: string; position?: number;
}) {
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .insert(params as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkflowTask;
}

export async function updateTask(taskId: string, updates: Partial<WorkflowTask>) {
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .update(updates as any)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkflowTask;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("workflow_tasks" as any).delete().eq("id", taskId);
  if (error) throw error;
}

// Comments
export async function fetchComments(taskId: string) {
  const { data, error } = await supabase
    .from("workflow_comments" as any)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as WorkflowComment[];
}

export async function addComment(taskId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from("workflow_comments" as any)
    .insert({ task_id: taskId, user_id: userId, content } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkflowComment;
}

// Activity
export async function fetchActivity(taskId: string) {
  const { data, error } = await supabase
    .from("workflow_activity" as any)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as WorkflowActivity[];
}

export async function logActivity(taskId: string, userId: string, action: string, details?: Record<string, any>) {
  await supabase.from("workflow_activity" as any).insert({
    task_id: taskId, user_id: userId, action, details: details || null,
  } as any);
}

// Members
export async function fetchMembers(projectId: string) {
  const { data, error } = await supabase
    .from("workflow_members" as any)
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  return (data || []) as unknown as WorkflowMember[];
}

// Fetch all tasks assigned to or created by user
export async function fetchUserTasks(userId: string) {
  const { data, error } = await supabase
    .from("workflow_tasks" as any)
    .select("*")
    .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as WorkflowTask[];
}
