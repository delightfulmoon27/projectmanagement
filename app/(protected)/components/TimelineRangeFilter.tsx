import type { TimelineRangeFilter as RangeOption } from '@/lib/dates';

const OPTIONS: { value: RangeOption; label: string }[] = [
  { value: 'full', label: 'Full Timeline' },
  { value: 'week', label: 'This Week' },
  { value: 'upcoming', label: 'Upcoming (4 weeks)' },
];

export default function TimelineRangeFilter({
  value,
  onChange,
}: {
  value: RangeOption;
  onChange: (value: RangeOption) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-black/5 px-4 py-2.5 sm:px-6">
      <span className="text-xs font-medium uppercase tracking-wide text-black/40">Timeline</span>
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-black/70 select-none"
        >
          <input
            type="checkbox"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-[#584738]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
