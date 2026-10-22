import type { Phase, WaStatus } from "./flow";

export interface DevMock {
  phase: Phase;
  wa: WaStatus | null;
}

const FAKE_QR =
  "2@Zk3v9QhXw1mPq8nB0cRt5uYdLaE7sJ4fGoI6xKyVjNb2Mz1WlHdCrTeUqS8AaOgPi3FvXn9Yk0Ll7Bm5RwQ4tZs,8dN3pXv1KcJq0yUe6HbTa2LoRfW9mGi5SzD7nEk4VxYh1Cq3PuBt8Aj0Mg6Oi2Lw9Fr5Ks7Zn4Hd1Tv3Xe0Qy8Ub6Rj2Nc9Pa5Gm7Ol4Sk1Wd3Vi,Hp0Zx8Fq2Jt6Ye4Nb9Mu1Ra5Cw3Lo7Si0Kg8Dv2Xn6Hk4Ty1Pj9Qe5Ub3Zl7Fs0Om8Ai2Wc6Rh4Nd1Gq9Vp5Ex3Jy7Tt0Ku";

/**
 * Dev-only preview of screens that need the WhatsApp bridge: `?mock=signup|connecting|qr|live|active`.
 * Returns null in production builds and for any other query, so the real socket drives the page.
 */
export function readDevMock(search: string, dev: boolean = import.meta.env.DEV): DevMock | null {
  if (!dev) return null;
  switch (new URLSearchParams(search).get("mock")) {
    case "signup":
      return { phase: "signup", wa: { status: "offline" } };
    case "connecting":
      return { phase: "started", wa: { status: "connecting" } };
    case "qr":
      return { phase: "started", wa: { status: "qr", qr: FAKE_QR } };
    case "live":
      return { phase: "started", wa: { status: "connected" } };
    case "active":
      return { phase: "idle", wa: { status: "connected", active: { jid: "x@g.us", name: "Flat 4" } } };
    default:
      return null;
  }
}
