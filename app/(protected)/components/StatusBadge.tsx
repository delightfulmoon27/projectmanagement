import type { TaskStatus } from '@/lib/types';

const STYLES: Record<TaskStatus, string> = {
  not_started: 'border border-black/25 text-black/60 bg-transparent',
  in_progress: 'bg-[#5190A2]/15 text-[#2f6472] border border-transparent',
  done: 'bg-[#8AAB93]/20 text-[#4c6b53] border border-transparent',
  dropped: 'bg-black/10 text-black/50 border border-transparent',
};

const LABELS: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  dropped: 'Dropped',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
