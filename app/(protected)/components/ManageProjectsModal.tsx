'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_COLORS, type Project } from '@/lib/types';
import Modal from './Modal';
import { useToast } from './Toast';

export default function ManageProjectsModal({
  projects,
  onClose,
  onChanged,
}: {
  projects: Project[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const supabase = createClient();

  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(projects.map((p) => [p.id, p.name]))
  );
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const ordered = [...projects].sort((a, b) => Number(a.archived) - Number(b.archived));

  async function saveName(project: Project) {
    const value = (names[project.id] ?? '').trim();
    if (!value || value === project.name) {
      setNames((prev) => ({ ...prev, [project.id]: project.name }));
      return;
    }
    const { error } = await supabase.from('projects').update({ name: value }).eq('id', project.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Project renamed');
    onChanged();
  }

  async function changeColor(project: Project, color: string) {
    setColorPickerFor(null);
    if (color === project.color) return;
    const { error } = await supabase.from('projects').update({ color }).eq('id', project.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    onChanged();
  }

  async function toggleArchive(project: Project) {
    const { error } = await supabase
      .from('projects')
      .update({ archived: !project.archived })
      .eq('id', project.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(project.archived ? 'Project unarchived' : 'Project archived');
    onChanged();
  }

  async function deleteProject(project: Project) {
    const { error } = await supabase.from('projects').delete().eq('id', project.id);
    setConfirmingDeleteId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Project deleted');
    onChanged();
  }

  return (
    <Modal
      title="Manage projects"
      onClose={onClose}
      wide
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-[#584738] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Done
        </button>
      }
    >
      {ordered.length === 0 && (
        <div className="py-8 text-center text-sm text-black/40">No projects yet.</div>
      )}

      <div className="flex flex-col gap-2">
        {ordered.map((project) => (
          <div
            key={project.id}
            className={`flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 ${
              project.archived ? 'opacity-60' : ''
            }`}
          >
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setColorPickerFor((id) => (id === project.id ? null : project.id))}
                className="h-6 w-6 rounded-full ring-2 ring-white"
                style={{ backgroundColor: project.color }}
                aria-label="Change color"
              />
              {colorPickerFor === project.id && (
                <div className="absolute left-0 z-10 mt-1 flex w-48 flex-wrap gap-1.5 rounded-lg border border-black/10 bg-white p-2 shadow-lg">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => changeColor(project, c)}
                      className="h-6 w-6 rounded-full"
                      style={{
                        backgroundColor: c,
                        boxShadow: project.color === c ? '0 0 0 2px white, 0 0 0 4px #584738' : undefined,
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}
            </div>

            <input
              value={names[project.id] ?? project.name}
              onChange={(e) => setNames((prev) => ({ ...prev, [project.id]: e.target.value }))}
              onBlur={() => saveName(project)}
              className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-sm text-black outline-none hover:border-black/10 focus:border-[#584738]"
            />

            {project.archived && (
              <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[10px] text-black/50">
                Archived
              </span>
            )}

            <button
              onClick={() => toggleArchive(project)}
              className="shrink-0 rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-black hover:bg-black/5"
            >
              {project.archived ? 'Unarchive' : 'Archive'}
            </button>

            {confirmingDeleteId === project.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => deleteProject(project)}
                  className="rounded-md bg-[#E24B4A] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmingDeleteId(null)}
                  className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-black hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDeleteId(project.id)}
                className="shrink-0 rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-black/60 hover:border-[#E24B4A] hover:text-[#E24B4A]"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
