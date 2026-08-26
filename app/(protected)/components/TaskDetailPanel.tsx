'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateScore, daysRemaining, getTaskStatus } from '@/lib/scoring';
import type { Project, Task, TaskDependency } from '@/lib/types';
import PriorityScore from './PriorityScore';
import StatusBadge from './StatusBadge';
import { useToast } from './Toast';

export default function TaskDetailPanel({
  task,
  project,
  allTasks,
  dependencies,
  userId,
  onClose,
  onChanged,
}: {
  task: Task;
  project: Project;
  allTasks: Task[];
  dependencies: TaskDependency[];
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.start_date);
  const [endDate, setEndDate] = useState(task.end_date);
  const [impact, setImpact] = useState(task.impact);
  const [progress, setProgress] = useState(task.progress);
  const [dependsOn, setDependsOn] = useState<string[]>(
    dependencies.filter((d) => d.task_id === task.id).map((d) => d.depends_on_id)
  );
  const [isDropped, setIsDropped] = useState(task.is_dropped);
  const [note, setNote] = useState(task.note ?? '');
  const [dependsOpen, setDependsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The panel is remounted (via `key={task.id}` in Timeline) whenever a different
  // task is selected, so this only resyncs local drafts when the *same* task's data
  // changes underneath us (e.g. a realtime update from another device).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTitle(task.title);
    setStartDate(task.start_date);
    setEndDate(task.end_date);
    setImpact(task.impact);
    setProgress(task.progress);
    setDependsOn(dependencies.filter((d) => d.task_id === task.id).map((d) => d.depends_on_id));
    setIsDropped(task.is_dropped);
    setNote(task.note ?? '');
    setConfirmingDelete(false);
    setDateError(null);
  }, [task, dependencies]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const projectTasks = allTasks.filter((t) => t.project_id === task.project_id && t.id !== task.id);
  const status = getTaskStatus({ ...task, progress, is_dropped: isDropped });
  const score = calculateScore(endDate, impact);
  const remaining = daysRemaining(endDate);

  const dependencyWarning = dependencies
    .filter((d) => d.task_id === task.id)
    .map((d) => allTasks.find((t) => t.id === d.depends_on_id))
    .filter((t): t is Task => !!t && t.end_date > startDate);

  const incompleteDependencies = dependsOn
    .map((id) => allTasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t && getTaskStatus(t) !== 'done');
  const progressLocked = incompleteDependencies.length > 0;

  async function saveTask(patch: Partial<Task>) {
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id);
    if (error) {
      showToast(error.message, 'error');
      return false;
    }
    onChanged();
    return true;
  }

  async function handleTitleBlur() {
    if (title.trim() && title !== task.title) {
      await saveTask({ title: title.trim() });
    } else {
      setTitle(task.title);
    }
  }

  async function handleDatesBlur(newStart: string, newEnd: string) {
    if (!newStart || !newEnd) return;
    if (newEnd < newStart) {
      setDateError('End date must be on or after the start date.');
      return;
    }
    setDateError(null);
    if (newStart !== task.start_date || newEnd !== task.end_date) {
      await saveTask({ start_date: newStart, end_date: newEnd });
    }
  }

  async function handleImpactChange(value: number) {
    setImpact(value);
    await saveTask({ impact: value });
  }

  async function commitProgress(value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped > task.progress && progressLocked) {
      setProgress(task.progress);
      showToast(
        `Complete "${incompleteDependencies[0].title}" before increasing progress`,
        'error'
      );
      return;
    }
    setProgress(clamped);
    await saveTask({ progress: clamped });
  }

  async function toggleDepends(id: string) {
    const isCurrentlyDep = dependsOn.includes(id);
    if (isCurrentlyDep) {
      setDependsOn((prev) => prev.filter((x) => x !== id));
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', task.id)
        .eq('depends_on_id', id);
      if (error) showToast(error.message, 'error');
      else onChanged();
    } else {
      setDependsOn((prev) => [...prev, id]);
      const { error } = await supabase
        .from('task_dependencies')
        .insert({ task_id: task.id, depends_on_id: id, user_id: userId });
      if (error) showToast(error.message, 'error');
      else onChanged();
    }
  }

  async function handleDropToggle(value: boolean) {
    setIsDropped(value);
    await saveTask({ is_dropped: value });
  }

  async function handleNoteBlur() {
    if (note !== (task.note ?? '')) {
      await saveTask({ note: note.trim() || null });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    setDeleting(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Task deleted');
    onChanged();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[340px] flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="flex items-start justify-between border-b border-black/5 px-4 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="flex-1 rounded-md border border-transparent px-1 py-0.5 text-base font-semibold text-black outline-none hover:border-black/10 focus:border-[#584738]"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
            <span className="text-sm text-black/70">{project.name}</span>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-black/10 px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-black/40">Score</div>
              <div className="mt-1">
                <PriorityScore score={score} />
              </div>
            </div>
            <div className="rounded-lg border border-black/10 px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-black/40">Status</div>
              <div className="mt-1 flex justify-center">
                <StatusBadge status={status} />
              </div>
            </div>
            <div className="rounded-lg border border-black/10 px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-black/40">Days left</div>
              <div className={`mt-1 text-xs font-semibold ${remaining < 0 ? 'text-[#E24B4A]' : 'text-black'}`}>
                {remaining < 0 ? `${Math.abs(remaining)} overdue` : remaining}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-black">Progress</label>
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onBlur={(e) => commitProgress(Number(e.target.value))}
                className="w-16 rounded-md border border-black/15 px-2 py-1 text-right text-xs outline-none focus:border-[#584738]"
              />
            </div>
            <input
              type="range"
              min={0}
              max={progressLocked ? task.progress : 100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
              className="progress-slider w-full"
              style={{
                background: `linear-gradient(to right, #584738 ${progress}%, #e5e5e5 ${progress}%)`,
              }}
            />
            {progressLocked && (
              <div className="mt-1.5 text-xs text-[#E24B4A]">
                🔒 Locked until dependency is done: {incompleteDependencies.map((t) => t.title).join(', ')}
              </div>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={() => handleDatesBlur(startDate, endDate)}
                className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={() => handleDatesBlur(startDate, endDate)}
                className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
              />
            </div>
          </div>
          {dateError && <div className="mb-4 text-xs text-[#E24B4A]">{dateError}</div>}
          {dependencyWarning.length > 0 && (
            <div className="mb-4 rounded-lg bg-[#FBE09C]/30 px-3 py-2 text-xs text-black/70">
              Starts before dependency ends: {dependencyWarning.map((t) => t.title).join(', ')}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-black">Impact</label>
            <select
              value={impact}
              onChange={(e) => handleImpactChange(Number(e.target.value))}
              className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-black">Depends on</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDependsOpen((o) => !o)}
                className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-left text-sm text-black/60 outline-none focus:border-[#584738]"
              >
                {dependsOn.length > 0 ? `${dependsOn.length} selected` : 'Select tasks…'}
              </button>
              {dependsOpen && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
                  {projectTasks.length === 0 && (
                    <div className="px-3 py-2 text-xs text-black/40">No other tasks in this project</div>
                  )}
                  {projectTasks.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-black/5"
                    >
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(t.id)}
                        onChange={() => toggleDepends(t.id)}
                        className="accent-[#584738]"
                      />
                      {t.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {dependsOn.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dependsOn.map((id) => {
                  const t = allTasks.find((pt) => pt.id === id);
                  if (!t) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-[#584738]/10 px-2.5 py-1 text-xs text-[#584738]"
                    >
                      {t.title}
                      <button onClick={() => toggleDepends(id)} className="text-[#584738]/60 hover:text-[#584738]">
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-[#E24B4A]">
              <input
                type="checkbox"
                checked={isDropped}
                onChange={(e) => handleDropToggle(e.target.checked)}
                className="h-4 w-4 accent-[#E24B4A]"
              />
              Drop task
            </label>
          </div>

          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium text-black">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              rows={4}
              className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
            />
          </div>
        </div>

        <div className="border-t border-black/5 px-4 py-3">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-[#E24B4A] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-lg border border-black/15 py-2 text-sm font-medium text-black hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/15 py-2 text-sm font-medium text-black/70 hover:border-[#E24B4A] hover:bg-[#E24B4A]/5 hover:text-[#E24B4A]"
            >
              🗑 Delete task
            </button>
          )}
        </div>
      </div>
    </>
  );
}
