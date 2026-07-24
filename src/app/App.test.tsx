import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("mostra il login dimostrativo all'avvio", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Gestionale ciclofficina" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ambiente demo")).toBeInTheDocument();
  });

  it("apre la dashboard e consente di uscire", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    expect(
      screen.getByRole("heading", { name: "Buon lavoro, Giulia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("BICI-2026-0014")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(
      screen.getByRole("heading", { name: "Gestionale ciclofficina" }),
    ).toBeInTheDocument();
  });
});
