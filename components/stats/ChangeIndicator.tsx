import { calculateChange } from '@/lib/utils/date-range';

type Props = {
  current: number;
  previous: number;
  higherIsBetter?: boolean;
  label?: string;
};

export default function ChangeIndicator({
  current,
  previous,
  higherIsBetter = true,
  label,
}: Props) {
  const change = calculateChange(current, previous);

  let color: string;
  if (change.direction === 'same') {
    color = 'text-neutral-500';
  } else if (change.direction === 'up') {
    color = higherIsBetter ? 'text-green-600' : 'text-red-600';
  } else {
    color = higherIsBetter ? 'text-red-600' : 'text-green-600';
  }

  const arrow = change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→';

  return (
    <div className={`text-xs font-medium ${color}`}>
      <span>
        {arrow} {change.display}
      </span>
      {label && <span className="ml-1 text-neutral-500">{label}</span>}
    </div>
  );
}
