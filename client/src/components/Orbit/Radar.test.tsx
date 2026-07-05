import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Radar from "./Radar";

describe("Radar", () => {
  it("renders three rings, the sweep, and the center content", () => {
    const { container } = render(<Radar size={120}>ME</Radar>);
    expect(container.querySelectorAll(".orbitRadar__ring")).toHaveLength(3);
    expect(container.querySelector(".orbitRadar__sweep")).not.toBeNull();
    expect(screen.getByText("ME")).toBeTruthy();
  });

  it("omits the sweep when sweep is false", () => {
    const { container } = render(<Radar size={80} sweep={false} />);
    expect(container.querySelector(".orbitRadar__sweep")).toBeNull();
    expect(container.querySelector(".orbitRadar__center")).toBeNull();
  });
});
