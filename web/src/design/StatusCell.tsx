import "./design.css";

export type CellStatus = "blocked" | "waiting" | "booked";

export interface StatusCellProps {
  status: CellStatus;
  /** Override the default word (BLOCKED, WAITING, BOOKED). */
  label?: string;
  className?: string;
}

const WORD: Record<CellStatus, string> = { blocked: "BLOCKED", waiting: "WAITING", booked: "BOOKED" };

/**
 * A departures-board status cell: a flat square block filled with the signal colour (red,
 * amber, green) and the word in the background colour. The colour is a fill, never text.
 */
export function StatusCell({ status, label, className }: StatusCellProps) {
  return (
    <span className={["ds-cell", className ?? ""].filter(Boolean).join(" ")} data-status={status}>
      {label ?? WORD[status]}
    </span>
  );
}
