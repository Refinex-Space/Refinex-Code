import { render, screen } from "@testing-library/react";
import { App } from "@renderer/app";

describe("desktop shell", () => {
  it("renders the shell frame and bootstrap content", async () => {
    render(<App />);

    expect(await screen.findByText("RWork shell is up")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open project" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Shipped in this slice")).toBeInTheDocument();
  });
});
