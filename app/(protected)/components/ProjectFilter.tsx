import type { Project } from '@/lib/types';

export default function ProjectFilter({
  projects,
  visibleIds,
  onToggle,
}: {
  projects: Project[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <div className="sticky left-0 flex flex-wrap items-center gap-3 border-b border-black/5 bg-white px-4 py-2.5 sm:px-6">
      <span className="text-xs font-medium uppercase tracking-wide text-black/40">Projects</span>
      {projects.map((p) => (
        <label
          key={p.id}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-black/70 select-none"
        >
          <input
            type="checkbox"
            checked={visibleIds.has(p.id)}
            onChange={() => onToggle(p.id)}
            className="h-3.5 w-3.5 accent-[#584738]"
          />
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className={p.archived ? 'italic text-black/40' : ''}>{p.name}</span>
        </label>
      ))}
    </div>
  );
}
