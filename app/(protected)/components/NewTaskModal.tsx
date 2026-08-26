'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Project, Task } from '@/lib/types';
import Modal from './Modal';
import { useToast } from './Toast';

export default function NewTaskModal({
  userId,
  projects,
  tasks,
  preselectedProjectId,
  onClose,
  onCreated,
}: {
  userId: string;
  projects: Project[];
  tasks: Task[];
  preselectedProjectId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [projectId, setProjectId] = useState(preselectedProjectId ?? projects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [impact, setImpact] = useState(3);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [dependsOpen, setDependsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId]
  );

  function toggleDepends(id: string) {
    setDependsOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    setError(null);
    if (!projectId) {
      setError('Select a project.');
      return;
    }
    if (!title.trim() || !startDate || !endDate) {
      setError('Title, start date, and end date are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        impact,
        note: note.trim() || null,
      })
      .select()
      .single();

    if (taskError || !task) {
      setError(taskError?.message ?? 'Failed to create task.');
      setSaving(false);
      return;
    }

    if (dependsOn.length > 0) {
      const rows = dependsOn.map((depId) => ({
        task_id: task.id,
        depends_on_id: depId,
        user_id: userId,
      }));
      const { error: depError } = await supabase.from('task_dependencies').insert(rows);
      if (depError) {
        setError(depError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast('Task added');
    onCreated();
  }

  return (
    <Modal
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-lg bg-[#584738] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-[#E24B4A]/10 px-3 py-2 text-sm text-[#E24B4A]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setDependsOn([]);
            }}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">Impact</label>
          <select
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value))}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">Depends on</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDependsOpen((o) => !o)}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-left text-sm text-black/60 outline-none focus:border-[#584738]"
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
                const t = projectTasks.find((pt) => pt.id === id);
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
          />
        </div>
      </div>
    </Modal>
  );
}
