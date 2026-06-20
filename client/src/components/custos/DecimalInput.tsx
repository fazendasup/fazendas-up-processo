import { Input } from "@/components/ui/input";
import {
  endsWithDecimalSeparator,
  formatDecimalForInput,
  isPartialDecimalInput,
  parseOptDecimal,
} from "@/lib/decimalInput";
import * as React from "react";

type DecimalInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (value: number) => void;
  fallback?: number;
  integersOnly?: boolean;
  fractionDigits?: number;
};

export function DecimalInput({
  value,
  onChange,
  fallback = 0,
  integersOnly = false,
  fractionDigits = 6,
  inputMode = "decimal",
  onFocus,
  onBlur,
  ...props
}: DecimalInputProps) {
  const [text, setText] = React.useState(() => formatDecimalForInput(value, fractionDigits));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      setText(formatDecimalForInput(value, fractionDigits));
    }
  }, [value, focused, fractionDigits]);

  const commit = React.useCallback(
    (raw: string) => {
      const parsed = parseOptDecimal(raw);
      const next = integersOnly
        ? Math.max(0, Math.round(parsed ?? fallback))
        : (parsed ?? fallback);
      onChange(next);
      setText(formatDecimalForInput(next, fractionDigits));
    },
    [fallback, fractionDigits, integersOnly, onChange],
  );

  return (
    <Input
      {...props}
      inputMode={integersOnly ? "numeric" : inputMode}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        commit(text);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!isPartialDecimalInput(raw, integersOnly)) return;
        setText(raw);
        if (endsWithDecimalSeparator(raw)) return;
        const parsed = parseOptDecimal(raw);
        if (parsed != null) onChange(integersOnly ? Math.max(0, Math.round(parsed)) : parsed);
      }}
    />
  );
}
