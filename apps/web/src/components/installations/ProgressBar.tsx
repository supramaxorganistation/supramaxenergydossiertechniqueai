/** Horizontal progress bar (0-100). Color follows the value by default. */
export default function ProgressBar({
  value,
  color,
  showLabel = true,
  height = 8,
}: {
  value: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const fill = color || (v >= 100 ? 'var(--success)' : 'var(--primary)');
  return (
    <div className="inst-progress">
      <div className="inst-progress-track" style={{ height }}>
        <div className="inst-progress-fill" style={{ width: `${v}%`, background: fill }} />
      </div>
      {showLabel && <span className="inst-progress-label">{v}%</span>}
    </div>
  );
}
