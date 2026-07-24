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

  it("filtra il registro biciclette e apre una scheda", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Biciclette" }));

    expect(
      screen.getByRole("heading", { name: "Biciclette" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "6 biciclette trovate" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cerca nel registro"), {
      target: { value: "BICI-2026-0011" },
    });

    expect(
      screen.getByRole("status", { name: "1 bicicletta trovata" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri scheda BICI-2026-0011" }),
    );

    expect(screen.getByTestId("bike-detail")).toHaveTextContent(
      "Olmo Passeggio",
    );
    expect(screen.getByTestId("bike-detail")).toHaveTextContent(
      "Area biciclette pronte",
    );
  });

  it("filtra le riparazioni e apre il dettaglio tecnico", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Riparazioni" }));

    expect(
      screen.getByRole("heading", { name: "Riparazioni" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "5 interventi trovati" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Utente"), {
      target: { value: "Non socio" },
    });

    expect(
      screen.getByRole("status", { name: "2 interventi trovati" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0008" }),
    );

    expect(screen.getByTestId("repair-detail")).toHaveTextContent(
      "Freno posteriore poco efficace",
    );
    expect(screen.getByTestId("repair-detail")).toHaveTextContent(
      "Da classificare",
    );
  });

  it("filtra i ricambi disponibili e mostra i movimenti", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ricambi" }));

    expect(
      screen.getByRole("heading", { name: "Ricambi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "6 ricambi trovati" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Solo disponibili" }));

    expect(
      screen.getByRole("status", { name: "5 ricambi trovati" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Camera d'aria 26 × 1.75")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Apri ricambio RIC-2026-0042" }),
    );

    expect(screen.getByTestId("part-detail")).toHaveTextContent(
      "Coppia pattini freno V-brake",
    );
    expect(screen.getByTestId("part-detail")).toHaveTextContent(
      "RIP-2026-0008",
    );
  });

  it("filtra i collaudi negativi e mostra la checklist", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Collaudi" }));

    expect(
      screen.getByRole("heading", { name: "Collaudi" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Esito"), {
      target: { value: "Negativo" },
    });

    expect(
      screen.getByRole("status", { name: "1 collaudo trovato" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri collaudo COL-2026-0009" }),
    );

    expect(screen.getByTestId("test-detail")).toHaveTextContent(
      "Il freno anteriore non mantiene la regolazione",
    );
    expect(screen.getByTestId("test-detail")).toHaveTextContent(
      "Prova non eseguita",
    );
  });
});
