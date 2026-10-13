/** Thin gradient progress bar from the original course design. */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded bg-border"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-linear-to-r from-primary to-brand transition-[width] duration-400"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
