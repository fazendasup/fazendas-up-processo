import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type SearchSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Busca server-side: repassa texto digitado ao pai */
  onSearchChange?: (query: string) => void;
  /** Valor controlado da busca (server-side) */
  searchValue?: string;
  allowClear?: boolean;
  clearLabel?: string;
};

export function SearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  disabled,
  className,
  onSearchChange,
  searchValue,
  allowClear = true,
  clearLabel = "Limpar seleção",
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internalSearch, setInternalSearch] = React.useState("");
  const search = searchValue ?? internalSearch;

  const handleSearch = (next: string) => {
    if (onSearchChange) onSearchChange(next);
    else setInternalSearch(next);
  };

  const selected = options.find(o => o.value === value);
  const filtered = onSearchChange
    ? options
    : options.filter(o => {
        const q = search.trim().toLocaleLowerCase("pt-BR");
        if (!q) return true;
        const hay = `${o.label} ${o.description ?? ""}`.toLocaleLowerCase(
          "pt-BR"
        );
        return hay.includes(q);
      });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && value ? (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange("");
                    handleSearch("");
                    setOpen(false);
                  }}
                >
                  {clearLabel}
                </CommandItem>
              ) : null}
              {filtered.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{option.label}</p>
                    {option.description ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type SearchMultiSelectProps = {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  clearLabel?: string;
};

/** Seleção múltipla com busca (não fecha ao marcar). */
export function SearchMultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  disabled,
  className,
  clearLabel = "Limpar seleção",
}: SearchMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selectedSet = React.useMemo(() => new Set(values), [values]);

  const filtered = options.filter(o => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (!q) return true;
    const hay = `${o.label} ${o.description ?? ""}`.toLocaleLowerCase("pt-BR");
    return hay.includes(q);
  });

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find(o => o.value === values[0])?.label ?? "1 cliente")
        : `${values.length} clientes selecionados`;

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onValuesChange(values.filter(v => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            values.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {values.length > 0 ? (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValuesChange([]);
                    setSearch("");
                  }}
                >
                  {clearLabel}
                </CommandItem>
              ) : null}
              {filtered.map(option => {
                const checked = selectedSet.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        checked ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{option.label}</p>
                      {option.description ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
