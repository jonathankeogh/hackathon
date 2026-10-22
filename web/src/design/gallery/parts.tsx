import type { ReactNode } from "react";
import { Divider } from "../Divider";
import { Heading } from "../Heading";
import { Label } from "../Label";
import { Stack } from "../Stack";

/** One titled block of the gallery. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={24} as="section">
      <Divider />
      <Heading level={2}>
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

/** A labelled specimen: the caption above, the live thing below. */
export function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <Stack gap={12} style={{ minWidth: 0 }}>
      <Label>{name}</Label>
      {children}
    </Stack>
  );
}

/** Responsive grid: as many columns of at least `min` px as fit. */
export function Grid({ min = 240, children }: { min?: number; children: ReactNode }) {
  return <div style={{ display: "grid", gap: 24, gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}>{children}</div>;
}
