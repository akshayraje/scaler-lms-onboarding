// Shared hero art from the original login screen and welcome module.
const FIGURES: [number, number, string][] = [
  [240, 92, "#4C86FF"],
  [346, 136, "#A9C0E8"],
  [390, 240, "#0043C9"],
  [346, 344, "#345FA8"],
  [240, 388, "#061B4D"],
  [134, 344, "#8FA8D8"],
  [90, 240, "#0043C9"],
  [134, 136, "#4C6FB0"],
];

export function ColleaguesIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 480"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a circle of colleagues, representing an inclusive workplace"
    >
      <circle cx="240" cy="240" r="150" fill="none" stroke="#D7E1F5" strokeWidth="1.5" strokeDasharray="3 7" />
      {FIGURES.map(([x, y, fill], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle cy="-24" r="14" fill={fill} stroke="#0B1A3D" strokeOpacity="0.14" strokeWidth="1.5" />
          <path
            d="M-25,32 C-25,10 -14,0 0,0 C14,0 25,10 25,32 Z"
            fill={fill}
            stroke="#0B1A3D"
            strokeOpacity="0.14"
            strokeWidth="1.5"
          />
        </g>
      ))}
    </svg>
  );
}
