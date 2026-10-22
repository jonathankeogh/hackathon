import { useEffect, useState, type ReactNode } from "react";
import { CANVAS_H, CANVAS_W, fitScale } from "./fitScale";

function currentScale(): number {
  return fitScale(window.innerWidth, window.innerHeight);
}

/** Fixed 1920x1080 design canvas, scaled to fit any viewport and centred. */
export function StageCanvas({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(currentScale);

  useEffect(() => {
    const onResize = () => setScale(currentScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="stage-root" style={{ position: "fixed", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
