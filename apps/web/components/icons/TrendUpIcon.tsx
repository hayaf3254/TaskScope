type IconProps = {
  size?: number;
  className?: string;
};

export function TrendUpIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M30.6667 2L18 14.6667L11.3333 8L1.33334 18M30.6667 2H22.6667M30.6667 2V10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
