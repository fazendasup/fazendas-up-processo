import { Input } from "@/components/ui/input";
import {
  mascaraHoraDigitada,
  normalizarHora24h,
} from "@shared/terceirosPagamento";

/** Hora digitada em 24h (HH:mm), sem o relógio nativo nem AM/PM. */
export function InputHora24h({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      placeholder="07:00"
      maxLength={5}
      value={value}
      onChange={e => onChange(mascaraHoraDigitada(e.target.value))}
      onBlur={e => {
        const normalizada = normalizarHora24h(e.currentTarget.value);
        if (normalizada) onChange(normalizada);
      }}
    />
  );
}
