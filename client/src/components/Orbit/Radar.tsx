import type { ReactNode } from "react";
import "./Radar.scss";

interface RadarProps {
  size: number;
  sweep?: boolean;
  children?: ReactNode;
}

/**
 * The Orbit signature: three concentric rings with an optional rotating
 * sweep and a centered slot. Floating dots are positioned by the consuming
 * page with the .orbit-dot utility; this component stays dumb.
 */
export default function Radar({ size, sweep = true, children }: RadarProps) {
  return (
    <div className="orbitRadar" style={{ width: size, height: size }}>
      <span className="orbitRadar__ring orbitRadar__ring--outer" aria-hidden="true" />
      <span className="orbitRadar__ring orbitRadar__ring--mid" aria-hidden="true" />
      <span className="orbitRadar__ring orbitRadar__ring--inner" aria-hidden="true" />
      {sweep && <span className="orbitRadar__sweep" aria-hidden="true" />}
      {children !== undefined && children !== null && <span className="orbitRadar__center">{children}</span>}
    </div>
  );
}
