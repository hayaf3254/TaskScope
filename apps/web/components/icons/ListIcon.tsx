type IconProps = {
  size?: number;
  className?: string;
};

export function ListIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8.16667 1.5H25.5M8.16667 9.5H25.5M8.16667 17.5H25.5M1.5 1.5H1.51333M1.5 9.5H1.51333M1.5 17.5H1.51333"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
