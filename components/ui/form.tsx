interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function InputField({
  label,
  id,
  type = "text",
  placeholder,
  hint,
  value,
  onChange,
  className = "",
}: InputFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3.5 border border-border-strong rounded-[var(--radius-sm)] bg-card text-ink text-sm font-medium outline-none transition-colors focus:border-ink"
      />
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  id: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

export function SelectField({
  label,
  id,
  options,
  placeholder,
  value,
  onChange,
  className = "",
}: SelectFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3.5 border border-border-strong rounded-[var(--radius-sm)] bg-card text-ink text-sm font-medium outline-none transition-colors focus:border-ink appearance-none cursor-pointer"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FormGridProps {
  children: React.ReactNode;
  cols?: 2 | 3;
  className?: string;
}

export function FormGrid({ children, cols = 2, className = "" }: FormGridProps) {
  const gridCols = cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";
  return <div className={`grid ${gridCols} gap-4 ${className}`}>{children}</div>;
}
