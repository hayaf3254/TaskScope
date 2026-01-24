type IconProps = {
  size?: number;
  className?: string;
};

export function HomeIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M9.5 28.1667V14.8333H17.5V28.1667M1.5 10.8333L13.5 1.5L25.5 10.8333V25.5C25.5 26.2072 25.219 26.8855 24.719 27.3856C24.2189 27.8857 23.5406 28.1667 22.8333 28.1667H4.16667C3.45942 28.1667 2.78115 27.8857 2.28105 27.3856C1.78095 26.8855 1.5 26.2072 1.5 25.5V10.8333Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
