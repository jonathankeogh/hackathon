import { createContext, useContext, type ReactNode } from "react";
import { phoneSize, type } from "../tokens";

/** Font sizes the shared stage components use. A number is px on the 1920 canvas; a string is a CSS clamp(). */
export interface StageScale {
  phone: boolean;
  title: number | string;
  body: number | string;
  label: number | string;
  small: number | string;
}

const PROJECTOR: StageScale = { phone: false, title: type.title, body: type.body, label: type.label, small: type.small };
const PHONE: StageScale = { phone: true, ...phoneSize };

const StageScaleContext = createContext<StageScale>(PROJECTOR);

/** The sizes for the layout this component sits in: the projector canvas unless wrapped in PhoneScale. */
export function useStageScale(): StageScale {
  return useContext(StageScaleContext);
}

/** Switches every shared component below it to the design system's responsive phone scale. */
export function PhoneScale({ children }: { children: ReactNode }) {
  return <StageScaleContext.Provider value={PHONE}>{children}</StageScaleContext.Provider>;
}
