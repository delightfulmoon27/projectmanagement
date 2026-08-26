'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_COLORS, type NewProjectTaskInput } from '@/lib/types';
import Modal from './Modal';
import { useToast } from './Toast';

let rowId = 0;

interface DraftTask extends NewProjectTaskInput {
  key: number;
}

export default function NewProjectModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTaskRow() {
    setTasks((prev) => [
      ...prev,
      {
        key: rowId++,
        title: '',
        start_date: '',
        end_date: '',
        impact: 3,
        note: '',
      },
    ]);
  }

  function updateTask(key: number, patch: Partial<DraftTask>) {
    setTasks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function removeTask(key: number) {
    setTasks((prev) => prev.filter((t) => t.key !== key));
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    for (const t of tasks) {
      if (!t.title.trim() || !t.start_date || !t.end_date) {
        setError('Each task needs a title, start date, and end date.');
        return;
      }
      if (t.end_date < t.start_date) {
        setError(`Task "${t.title}" has an end date before its start date.`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ user_id: userId, name: name.trim(), color })
      .select()
      .single();

    if (projectError || !project) {
      setError(projectError?.message ?? 'Failed to create project.');
      setSaving(false);
      return;
    }

    if (tasks.length > 0) {
      const rows = tasks.map((t) => ({
        user_id: userId,
        project_id: project.id,
        title: t.title.trim(),
        start_date: t.start_date,
        end_date: t.end_date,
        impact: t.impact,
        note: t.note?.trim() || null,
      }));
      const { error: tasksError } = await supabase.from('tasks').insert(rows);
      if (tasksError) {
        setError(tasksError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast('Project created');
    onCreated();
  }

  return (
    <Modal
      title="New project"
      onClose={onClose}
      wide
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
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-[#E24B4A]/10 px-3 py-2 text-sm text-[#E24B4A]">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-black">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#584738]"
          placeholder="e.g. Website redesign"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-black">Color</label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? '0 0 0 2px white, 0 0 0 4px #584738' : undefined,
              }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-black">Initial tasks</label>
        </div>

        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <div key={t.key} className="rounded-lg border border-black/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  value={t.title}
                  onChange={(e) => updateTask(t.key, { title: e.target.value })}
                  placeholder="Task title"
                  className="flex-1 rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
                />
                <button
                  onClick={() => removeTask(t.key)}
                  className="ml-2 text-xs text-black/40 hover:text-[#E24B4A]"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-black/50">Start</label>
                  <input
                    type="date"
                    value={t.start_date}
                    onChange={(e) => updateTask(t.key, { start_date: e.target.value })}
                    className="w-full rounded-md border border-black/15 px-2 py-1.5 text-xs outline-none focus:border-[#584738]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-black/50">End</label>
                  <input
                    type="date"
                    value={t.end_date}
                    onChange={(e) => updateTask(t.key, { end_date: e.target.value })}
                    className="w-full rounded-md border border-black/15 px-2 py-1.5 text-xs outline-none focus:border-[#584738]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-black/50">Impact</label>
                  <select
                    value={t.impact}
                    onChange={(e) => updateTask(t.key, { impact: Number(e.target.value) })}
                    className="w-full rounded-md border border-black/15 px-2 py-1.5 text-xs outline-none focus:border-[#584738]"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <textarea
                  value={t.note ?? ''}
                  onChange={(e) => updateTask(t.key, { note: e.target.value })}
                  placeholder="Note (optional)"
                  rows={2}
                  className="w-full rounded-md border border-black/15 px-2.5 py-1.5 text-xs outline-none focus:border-[#584738]"
                />
              </div>
            </div>
          ))}

          <button
            onClick={addTaskRow}
            className="rounded-lg border border-dashed border-black/20 py-2 text-sm text-black/50 hover:border-[#584738] hover:text-[#584738]"
          >
            + Add another task
          </button>
        </div>
      </div>
    </Modal>
  );
}
