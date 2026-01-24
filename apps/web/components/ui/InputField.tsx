import { InputHTMLAttributes } from "react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function InputField({
  label,
  className = "",
  ...props
}: InputFieldProps) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className={`input-field ${className}`} {...props} />
    </div>
  );
}
