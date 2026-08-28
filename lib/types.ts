export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress: number;
  impact: number;
  is_dropped: boolean;
  note: string | null;
  created_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  user_id: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  done: boolean;
  position: number;
  created_at: string;
}

export type TaskStatus = 'dropped' | 'done' | 'in_progress' | 'not_started';

export const PROJECT_COLORS = [
  '#DF978A', // coral/salmon
  '#5190A2', // teal
  '#C9CADE', // lavender
  '#8AAB93', // sage green
  '#FBE09C', // soft yellow
  '#D09E8B', // terracotta
  '#E399AD', // rose pink
  '#CBAF79', // gold/olive
  '#A1C2CB', // dusty blue
  '#D6BDC1', // mauve
] as const;

export interface NewProjectTaskInput {
  title: string;
  start_date: string;
  end_date: string;
  impact: number;
  note: string | null;
}
