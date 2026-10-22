import type { StateV2 } from "../stage/data/v2types";
import { baseState } from "./base";

/** Chat only: nobody has asked Grok to look yet, so there is no plan. */
export const noPlan: StateV2 = { ...baseState };
