import type { Task, TaskStatus } from './types';

export function calculateScore(endDate: string, impact: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const daysRemaining = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let urgency: number;
  if (daysRemaining < 0) urgency = 5;
  else if (daysRemaining <= 7) urgency = 4;
  else if (daysRemaining <= 14) urgency = 3;
  else if (daysRemaining <= 30) urgency = 2;
  else urgency = 1;

  return Math.round((urgency * 0.6 + impact * 0.4) * 10) / 10;
}

export function daysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTaskStatus(task: Task): TaskStatus {
  if (task.is_dropped) return 'dropped';
  if (task.progress === 100) return 'done';
  if (task.progress > 0) return 'in_progress';
  return 'not_started';
}

export function isOverdue(task: Task): boolean {
  return !task.is_dropped && task.progress < 100 && daysRemaining(task.end_date) < 0;
}

/**
 * Sort order: active tasks (not done/dropped) by score desc,
 * then done by end_date desc, then dropped by end_date desc.
 */
export function sortTasks(tasks: Task[]): Task[] {
  const active: Task[] = [];
  const done: Task[] = [];
  const dropped: Task[] = [];

  for (const t of tasks) {
    const status = getTaskStatus(t);
    if (status === 'dropped') dropped.push(t);
    else if (status === 'done') done.push(t);
    else active.push(t);
  }

  active.sort((a, b) => calculateScore(b.end_date, b.impact) - calculateScore(a.end_date, a.impact));
  done.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  dropped.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  return [...active, ...done, ...dropped];
}
