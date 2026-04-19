import { calculateChange } from '@/lib/utils/date-range';

type Props = {
  current: number;
  previous: number;
  // Если true — падение это плохо. Если false — наоборот (например для "без счёта")
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

  // Определяем цвет
  let color: string;
  if (change.direction === 'same') {
    color = 'text-neutral-500';
  } else if (change.direction === 'up') {
    color = higherIsBetter ? 'text-green-600' : 'text-red-600';
  } else {
    color = higherIsBetter ? 'text-red-600' : 'text-green-600';
  }

  const arrow =
    change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→';

  return (
    <div className={`text-xs font-medium ${color}`}>
      <span>{arrow} {change.display}</span>
      {label && <span className="text-neutral-500 ml-1">{label}</span>}
    </div>
  );
}