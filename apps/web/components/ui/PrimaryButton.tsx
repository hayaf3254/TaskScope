import { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({
  children,
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button className={`btn-primary ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
