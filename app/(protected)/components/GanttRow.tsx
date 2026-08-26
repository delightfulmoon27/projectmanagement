import { COL_PROJECT, COL_SCORE, COL_STATUS, COL_TASK, WEEK_WIDTH } from '@/lib/constants';
import type { WeekColumn } from '@/lib/dates';
import { calculateScore, getTaskStatus, isOverdue } from '@/lib/scoring';
import type { Project, Task } from '@/lib/types';
import GanttBar from './GanttBar';
import PriorityScore from './PriorityScore';
import StatusBadge from './StatusBadge';

export default function GanttRow({
  task,
  project,
  weeks,
  timelineStart,
  dimmed,
  onClick,
}: {
  task: Task;
  project: Project;
  weeks: WeekColumn[];
  timelineStart: Date;
  dimmed?: boolean;
  onClick: () => void;
}) {
  const status = getTaskStatus(task);
  const score = calculateScore(task.end_date, task.impact);
  const overdue = isOverdue(task);

  const rowOpacity = status === 'done' ? 'opacity-50' : status === 'dropped' ? 'opacity-35' : dimmed ? 'opacity-60' : '';
  const titleStrike = status === 'dropped' ? 'line-through' : '';

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group flex cursor-pointer border-b border-black/5 hover:bg-black/[0.02] focus:outline-none focus-visible:bg-black/[0.03] ${rowOpacity} ${
        overdue ? 'border-l-2 border-l-[#E24B4A]' : 'border-l-2 border-l-transparent'
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center overflow-hidden bg-white px-2 py-2 group-hover:bg-[#fafaf9]"
        style={{ width: COL_TASK }}
      >
        <span className={`truncate text-sm text-black ${titleStrike}`}>{task.title}</span>
      </div>
      <div
        className="sticky z-20 flex shrink-0 items-center overflow-hidden bg-white px-2 py-2 group-hover:bg-[#fafaf9]"
        style={{ width: COL_SCORE, left: COL_TASK }}
      >
        <PriorityScore score={score} />
      </div>
      <div
        className="sticky z-20 flex shrink-0 items-center overflow-hidden bg-white px-2 py-2 group-hover:bg-[#fafaf9]"
        style={{ width: COL_STATUS, left: COL_TASK + COL_SCORE }}
      >
        <StatusBadge status={status} />
      </div>
      <div
        className="sticky z-20 flex shrink-0 items-center gap-1.5 overflow-hidden bg-white px-2 py-2 group-hover:bg-[#fafaf9]"
        style={{ width: COL_PROJECT, left: COL_TASK + COL_SCORE + COL_STATUS }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate text-xs text-black/70">{project.name}</span>
      </div>

      <div className="relative flex shrink-0" style={{ width: weeks.length * WEEK_WIDTH }}>
        {weeks.map((w) => (
          <div
            key={w.start.toISOString()}
            className="shrink-0 border-r border-black/5"
            style={{
              width: WEEK_WIDTH,
              backgroundColor: w.isCurrent ? 'rgba(181, 158, 125, 0.15)' : undefined,
            }}
          />
        ))}
        <GanttBar task={task} projectColor={project.color} timelineStart={timelineStart} />
      </div>
    </div>
  );
}
