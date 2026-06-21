import { useCallback, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Check, ChevronDown } from "lucide-react";

export type ColumnFilterState = {
  selected?: string[];
};

export type ColumnOption = {
  label: string;
  value: string;
};

export type ColumnFilterDef<T> = {
  key: string;
  label: string;
  value: (row: T) => unknown;
  /** Rótulo exibido no filtro; se omitido, usa `value` convertido em texto. */
  optionLabel?: (row: T) => string;
};

type SortState = {
  tableId: string;
  columnKey: string;
  direction: "asc" | "desc";
} | null;

function rowToSearchText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(rowToSearchText).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(rowToSearchText)
      .join(" ");
  }
  return String(value);
}

export function columnValueLabel(value: unknown): string {
  const text = rowToSearchText(value).trim();
  return text || "—";
}

export function compareColumnValues(a: unknown, b: unknown): number {
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    return an - bn;
  }
  return columnValueLabel(a).localeCompare(columnValueLabel(b), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

export function uniqueColumnOptions<T>(
  rows: T[],
  column?: ColumnFilterDef<T>,
): ColumnOption[] {
  if (!column) return [];
  const values = new Map<string, string>();
  for (const row of rows) {
    const filterValue = columnValueLabel(column.value(row));
    const label = column.optionLabel ? column.optionLabel(row) : filterValue;
    values.set(filterValue, label);
  }
  return Array.from(values.entries())
    .sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR", { numeric: true, sensitivity: "base" }),
    )
    .map(([value, label]) => ({ label, value }));
}

export function ColumnHeaderFilter({
  label,
  options,
  selected,
  sortDirection,
  isOpen,
  onOpenChange,
  onSort,
  onToggleValue,
  onSelectAll,
  onClearAll,
  align = "left",
}: {
  label: string;
  options: ColumnOption[];
  selected?: string[];
  sortDirection?: "asc" | "desc";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSort: (direction: "asc" | "desc") => void;
  onToggleValue: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  align?: "left" | "right" | "center";
}) {
  const [search, setSearch] = useState("");
  const selectedSet = new Set(selected ?? []);
  const hasSelection = selected != null;
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div
      className={[
        "relative min-w-28",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
        className={[
          "inline-flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs font-bold transition",
          hasSelection || sortDirection
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-transparent text-foreground hover:bg-muted",
        ].join(" ")}
      >
        <span>{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {isOpen ? (
        <div
          className={[
            "absolute top-full z-50 mt-1 w-72 rounded-xl border bg-popover p-3 text-left shadow-xl",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSort("asc")}
              className={[
                "inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold",
                sortDirection === "asc"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-border text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <ArrowDownAZ className="h-3.5 w-3.5" />
              A-Z / menor
            </button>
            <button
              type="button"
              onClick={() => onSort("desc")}
              className={[
                "inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold",
                sortDirection === "desc"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-border text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <ArrowUpAZ className="h-3.5 w-3.5" />
              Z-A / maior
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}`}
            className="mb-2 w-full rounded-lg border bg-background px-2 py-1.5 text-xs font-normal text-foreground outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
          />
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAll();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                }}
                className="text-xs font-bold text-red-700 hover:underline dark:text-red-300"
              >
                Limpar todos
              </button>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {hasSelection
                ? selectedSet.size === 0
                  ? "Nenhum selecionado"
                  : `${selectedSet.size}/${options.length}`
                : `Todos (${options.length})`}
            </span>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const checked = !hasSelection || selectedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggleValue(option.value)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-background",
                      ].join(" ")}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg bg-muted px-2 py-2 text-xs text-muted-foreground">
                Nenhum valor encontrado.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useColumnTableFilters(tableId: string) {
  const [columnFilters, setColumnFilters] = useState<
    Record<string, Record<string, ColumnFilterState>>
  >({});
  const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(null);

  const currentFilters = columnFilters[tableId] ?? {};

  const hasColumnFilters = useMemo(
    () => Object.values(currentFilters).some((f) => f.selected != null),
    [currentFilters],
  );

  const clearColumnFilters = useCallback(() => {
    setColumnFilters((current) => ({ ...current, [tableId]: {} }));
    setSortState((current) => (current?.tableId === tableId ? null : current));
  }, [tableId]);

  const toggleColumnValue = useCallback(
    (key: string, value: string, allValues: string[]) => {
      setColumnFilters((current) => {
        const table = current[tableId] ?? {};
        const currentFilter = table[key] ?? {};
        const selected = new Set(currentFilter.selected ?? allValues);
        if (selected.has(value)) selected.delete(value);
        else selected.add(value);
        return {
          ...current,
          [tableId]: {
            ...table,
            [key]: { selected: Array.from(selected) },
          },
        };
      });
    },
    [tableId],
  );

  const selectAllColumnValues = useCallback(
    (key: string, options: ColumnOption[]) => {
      setColumnFilters((current) => ({
        ...current,
        [tableId]: {
          ...(current[tableId] ?? {}),
          [key]: { selected: options.map((o) => o.value) },
        },
      }));
    },
    [tableId],
  );

  const clearAllColumnValues = useCallback(
    (key: string) => {
      setColumnFilters((current) => ({
        ...current,
        [tableId]: {
          ...(current[tableId] ?? {}),
          [key]: { selected: [] },
        },
      }));
    },
    [tableId],
  );

  const setColumnSort = useCallback(
    (key: string, direction: "asc" | "desc") => {
      setSortState((current) =>
        current?.tableId === tableId &&
        current.columnKey === key &&
        current.direction === direction
          ? null
          : { tableId, columnKey: key, direction },
      );
    },
    [tableId],
  );

  const filterAndSortRows = useCallback(
    <T,>(rows: T[], columns: ColumnFilterDef<T>[]): T[] => {
      const activeColumns = columns
        .map((column) => ({
          ...column,
          selected: currentFilters[column.key]?.selected,
        }))
        .filter((column) => column.selected != null);

      let out = rows;
      if (activeColumns.length > 0) {
        out = rows.filter((row) =>
          activeColumns.every((column) =>
            column.selected!.includes(columnValueLabel(column.value(row))),
          ),
        );
      }

      if (!sortState || sortState.tableId !== tableId) return out;
      const column = columns.find((c) => c.key === sortState.columnKey);
      if (!column) return out;

      return [...out].sort((a, b) => {
        const result = compareColumnValues(column.value(a), column.value(b));
        return sortState.direction === "asc" ? result : -result;
      });
    },
    [currentFilters, sortState, tableId],
  );

  const renderColumnHeader = useCallback(
    <T,>(
      key: string,
      label: string,
      rows: T[],
      columns: ColumnFilterDef<T>[],
      align: "left" | "right" | "center" = "left",
    ) => {
      const column = columns.find((c) => c.key === key);
      const options = uniqueColumnOptions(rows, column);
      return (
        <ColumnHeaderFilter
          label={label}
          align={align}
          options={options}
          selected={currentFilters[key]?.selected}
          sortDirection={
            sortState?.tableId === tableId && sortState.columnKey === key
              ? sortState.direction
              : undefined
          }
          isOpen={openColumnFilter === `${tableId}:${key}`}
          onOpenChange={(open) => setOpenColumnFilter(open ? `${tableId}:${key}` : null)}
          onSort={(direction) => setColumnSort(key, direction)}
          onToggleValue={(value) =>
            toggleColumnValue(
              key,
              value,
              options.map((o) => o.value),
            )
          }
          onSelectAll={() => selectAllColumnValues(key, options)}
          onClearAll={() => clearAllColumnValues(key)}
        />
      );
    },
    [
      clearAllColumnValues,
      currentFilters,
      openColumnFilter,
      selectAllColumnValues,
      setColumnSort,
      sortState,
      tableId,
      toggleColumnValue,
    ],
  );

  return {
    hasColumnFilters,
    clearColumnFilters,
    filterAndSortRows,
    renderColumnHeader,
  };
}
