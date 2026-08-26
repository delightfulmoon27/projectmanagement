import { WEEK_WIDTH } from '@/lib/constants';
import { diffDays, parseDate } from '@/lib/dates';
import { isOverdue } from '@/lib/scoring';
import type { Task } from '@/lib/types';

const DAY_WIDTH = WEEK_WIDTH / 7;

export default function GanttBar({
  task,
  projectColor,
  timelineStart,
}: {
  task: Task;
  projectColor: string;
  timelineStart: Date;
}) {
  const start = parseDate(task.start_date);
  const end = parseDate(task.end_date);

  const left = diffDays(timelineStart, start) * DAY_WIDTH;
  const spanDays = Math.max(1, diffDays(start, end) + 1);
  const totalWidth = Math.max(spanDays * DAY_WIDTH, 6);

  const overdue = isOverdue(task);
  const completedWidth = (totalWidth * task.progress) / 100;
  const remainingWidth = totalWidth - completedWidth;

  const remainingColor = overdue ? 'rgba(226, 75, 74, 0.4)' : hexToRgba(projectColor, 0.5);

  return (
    <div
      className="absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-sm shadow-sm"
      style={{ left, width: totalWidth }}
      title={`${task.title} (${task.progress}%)`}
    >
      <div className="flex h-full w-full">
        {completedWidth > 0 && (
          <div style={{ width: completedWidth, backgroundColor: '#584738' }} />
        )}
        {remainingWidth > 0 && (
          <div style={{ width: remainingWidth, backgroundColor: remainingColor }} />
        )}
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
