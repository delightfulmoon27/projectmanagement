export default function PriorityScore({ score }: { score: number }) {
  const colorClass = score >= 4 ? 'text-[#E24B4A]' : score >= 3 ? 'text-[#B59E7D]' : 'text-black/40';

  return <span className={`text-xs font-semibold tabular-nums ${colorClass}`}>{score.toFixed(1)}</span>;
}
