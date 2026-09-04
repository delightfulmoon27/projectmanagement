'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { COL_PROJECT, COL_SCORE, COL_STATUS, COL_TASK, STICKY_WIDTH, WEEKS_AFTER, WEEKS_BEFORE, WEEK_WIDTH } from '@/lib/constants';
import {
  generateWeekColumns,
  getTimelineFilterRange,
  groupWeeksByMonth,
  taskOverlapsRange,
  type TimelineRangeFilter as RangeOption,
} from '@/lib/dates';
import { getTaskStatus, sortTasks } from '@/lib/scoring';
import type { Project, Task, TaskDependency } from '@/lib/types';
import GanttRow from './GanttRow';
import ProjectFilter from './ProjectFilter';
import TimelineRangeFilter from './TimelineRangeFilter';
import NewProjectModal from './NewProjectModal';
import NewTaskModal from './NewTaskModal';
import ManageProjectsModal from './ManageProjectsModal';
import TaskDetailPanel from './TaskDetailPanel';

const FILTER_STORAGE_KEY = 'pm-timeline-filters-v1';

export default function Timeline({
  userId,
  userEmail,
  initialProjects,
  initialTasks,
  initialDependencies,
}: {
  userId: string;
  userEmail: string;
  initialProjects: Project[];
  initialTasks: Task[];
  initialDependencies: TaskDependency[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dependencies, setDependencies] = useState<TaskDependency[]>(initialDependencies);
  const [refreshing, setRefreshing] = useState(false);

  // Project visibility is tracked as a set of HIDDEN ids (rather than visible ids) so
  // that a newly created project is visible by default without extra merge logic.
  const [showArchived, setShowArchived] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set());
  const [timelineRangeFilter, setTimelineRangeFilter] = useState<RangeOption>('full');

  // Restore the user's last filter selections after mount (skipped during SSR since
  // localStorage isn't available there, and reading it before mount would cause a
  // hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.hiddenProjectIds)) setHiddenProjectIds(new Set(saved.hiddenProjectIds));
      if (typeof saved.showArchived === 'boolean') setShowArchived(saved.showArchived);
      if (typeof saved.showCompleted === 'boolean') setShowCompleted(saved.showCompleted);
      if (saved.timelineRangeFilter === 'full' || saved.timelineRangeFilter === 'week' || saved.timelineRangeFilter === 'upcoming') {
        setTimelineRangeFilter(saved.timelineRangeFilter);
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  // Persist filter selections whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          hiddenProjectIds: [...hiddenProjectIds],
          showArchived,
          showCompleted,
          timelineRangeFilter,
        })
      );
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, [hiddenProjectIds, showArchived, showCompleted, timelineRangeFilter]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTaskModal, setNewTaskModal] = useState<{ open: boolean; projectId?: string }>({
    open: false,
  });
  const [manageProjectsOpen, setManageProjectsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const refetchAll = useCallback(async () => {
    setRefreshing(true);
    const [{ data: p }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: true }),
      supabase.from('task_dependencies').select('*'),
    ]);
    if (p) setProjects(p);
    if (t) setTasks(t);
    if (d) setDependencies(d);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as Task;
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            }
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Task;
              return prev.map((t) => (t.id === updated.id ? updated : t));
            }
            if (payload.eventType === 'DELETE') {
              const oldTask = payload.old as Task;
              return prev.filter((t) => t.id !== oldTask.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const weeks = useMemo(() => generateWeekColumns(WEEKS_BEFORE, WEEKS_AFTER), []);
  const monthGroups = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const timelineStart = weeks[0].start;

  const visibleProjects = useMemo(() => {
    return projects
      .filter((p) => (p.archived ? showArchived : true))
      .filter((p) => !hiddenProjectIds.has(p.id));
  }, [projects, showArchived, hiddenProjectIds]);

  const projectFilterVisibleIds = useMemo(
    () => new Set(projects.filter((p) => !hiddenProjectIds.has(p.id)).map((p) => p.id)),
    [projects, hiddenProjectIds]
  );

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Flat, score-ordered list — no grouping by project. Project identity is already
  // carried by the color dot + Project column on each row.
  const visibleTasks = useMemo(() => {
    const visibleIds = new Set(visibleProjects.map((p) => p.id));
    const range = getTimelineFilterRange(timelineRangeFilter);
    return sortTasks(
      tasks.filter(
        (t) =>
          visibleIds.has(t.project_id) &&
          (!range || taskOverlapsRange(t.start_date, t.end_date, range)) &&
          (showCompleted || getTaskStatus(t) !== 'done')
      )
    );
  }, [tasks, visibleProjects, timelineRangeFilter, showCompleted]);

  const rowsWithDividers = useMemo(() => {
    const groups = visibleTasks.map((task) => {
      const status = getTaskStatus(task);
      return status === 'done' ? 'done' : status === 'dropped' ? 'dropped' : 'active';
    });
    return visibleTasks.map((task, i) => ({
      task,
      group: groups[i],
      showDivider: groups[i] !== 'active' && groups[i] !== groups[i - 1],
    }));
  }, [visibleTasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedProject = selectedTask ? projectById.get(selectedTask.project_id) : null;

  function toggleProjectVisible(id: string) {
    setHiddenProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const nonArchivedProjects = projects.filter((p) => !p.archived);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 overflow-auto">
      <header className="sticky left-0 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#584738] px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
          <h1 className="text-lg font-semibold text-white">Project manager</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85 select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 accent-white"
            />
            Show archived
          </label>
          <label className="mr-1 flex cursor-pointer items-center gap-2 text-sm text-white/85 select-none">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-3.5 w-3.5 accent-white"
            />
            Show completed
          </label>
          <button
            onClick={() => setManageProjectsOpen(true)}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          >
            Manage projects
          </button>
          <button
            onClick={() => setNewProjectOpen(true)}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          >
            New project
          </button>
          <button
            onClick={() => setNewTaskModal({ open: true })}
            disabled={nonArchivedProjects.length === 0}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#584738] hover:opacity-90 disabled:opacity-40"
          >
            New task
          </button>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white hover:bg-white/25"
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-black/10 bg-white py-1 text-black shadow-lg">
                <div className="truncate border-b border-black/5 px-3 py-2 text-xs text-black/50">
                  {userEmail}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-black hover:bg-black/5"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProjectFilter projects={projects} visibleIds={projectFilterVisibleIds} onToggle={toggleProjectVisible} />
      <TimelineRangeFilter value={timelineRangeFilter} onChange={setTimelineRangeFilter} />

      <div style={{ width: STICKY_WIDTH + weeks.length * WEEK_WIDTH, minWidth: '100%' }}>
          {/* Month header */}
          <div className="sticky top-0 z-30 flex border-b border-black/10 bg-[#584738]">
            <div className="sticky left-0 z-30 shrink-0 bg-[#584738]" style={{ width: STICKY_WIDTH }} />
            {monthGroups.map((g, i) => (
              <div
                key={i}
                className="shrink-0 border-r border-white/10 py-1.5 text-center text-xs font-medium text-white/80"
                style={{ width: g.weekCount * WEEK_WIDTH }}
              >
                {g.label}
              </div>
            ))}
          </div>
          {/* Week number header */}
          <div className="sticky z-30 flex border-b border-white/10 bg-[#584738]" style={{ top: 33 }}>
            <div
              className="sticky left-0 z-30 flex shrink-0 items-center bg-[#584738] text-xs font-medium text-white/80"
              style={{ width: STICKY_WIDTH }}
            >
              <span style={{ width: COL_TASK }} className="px-2">Task</span>
              <span style={{ width: COL_SCORE }} className="px-2">Score</span>
              <span style={{ width: COL_STATUS }} className="px-2">Status</span>
              <span style={{ width: COL_PROJECT }} className="px-2">Project</span>
            </div>
            {weeks.map((w) => (
              <div
                key={w.start.toISOString()}
                className="shrink-0 border-r border-white/10 py-1.5 text-center text-[10px] text-white/70"
                style={{
                  width: WEEK_WIDTH,
                  backgroundColor: w.isCurrent ? 'rgba(255, 255, 255, 0.18)' : undefined,
                }}
              >
                W{String(w.weekNumber).padStart(2, '0')}
              </div>
            ))}
          </div>

          {refreshing && <div className="skeleton h-0.5 w-full bg-[#B59E7D]" />}

          {visibleProjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-black/40">
              No projects to show. Create a project to get started.
            </div>
          ) : (
            <div
              className="sticky left-0 z-10 bg-white"
              style={{ width: STICKY_WIDTH + weeks.length * WEEK_WIDTH }}
            >
              <button
                onClick={() => setNewTaskModal({ open: true })}
                className="flex items-center gap-1 border-b border-black/5 px-3 py-1.5 text-xs font-medium text-[#584738] hover:bg-black/[0.02]"
              >
                + Add task
              </button>
            </div>
          )}

          {visibleTasks.length === 0 && visibleProjects.length > 0 && (
            <div className="px-6 py-16 text-center text-sm text-black/40">
              No tasks to show yet.
            </div>
          )}

          {rowsWithDividers.map(({ task, group, showDivider }) => {
            const project = projectById.get(task.project_id);
            if (!project) return null;

            return (
              <div key={task.id}>
                {showDivider && (
                  <div
                    className="sticky left-0 z-10 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-black/30"
                    style={{ width: STICKY_WIDTH + weeks.length * WEEK_WIDTH }}
                  >
                    {group === 'done' ? 'Completed' : 'Dropped'}
                  </div>
                )}
                <GanttRow
                  task={task}
                  project={project}
                  weeks={weeks}
                  timelineStart={timelineStart}
                  dimmed={project.archived}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {newProjectOpen && (
        <NewProjectModal
          userId={userId}
          onClose={() => setNewProjectOpen(false)}
          onCreated={() => {
            setNewProjectOpen(false);
            refetchAll();
          }}
        />
      )}

      {newTaskModal.open && (
        <NewTaskModal
          userId={userId}
          projects={nonArchivedProjects}
          tasks={tasks}
          preselectedProjectId={newTaskModal.projectId}
          onClose={() => setNewTaskModal({ open: false })}
          onCreated={() => {
            setNewTaskModal({ open: false });
            refetchAll();
          }}
        />
      )}

      {manageProjectsOpen && (
        <ManageProjectsModal
          projects={projects}
          onClose={() => setManageProjectsOpen(false)}
          onChanged={refetchAll}
        />
      )}

      {selectedTask && selectedProject && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          project={selectedProject}
          allTasks={tasks}
          dependencies={dependencies}
          userId={userId}
          onClose={() => setSelectedTaskId(null)}
          onChanged={refetchAll}
        />
      )}
    </div>
  );
}
