import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("apre la dashboard e consente di uscire", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Buon lavoro, Giulia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("BICI-2026-0014")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(
      screen.getByRole("heading", { name: "Gestionale ciclofficina" }),
    ).toBeInTheDocument();
  });

  it("filtra il registro biciclette e apre una scheda", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Biciclette" }),
    );

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

  it("apre la nuova registrazione bicicletta", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Biciclette" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Registra bicicletta" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Registra bicicletta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Il codice viene assegnato automaticamente\./),
    ).toBeInTheDocument();
  });

  it("mostra soltanto gli avanzamenti consentiti nella scheda bici", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Biciclette" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Apri scheda BICI-2026-0014",
      }),
    );

    const statusSelect = screen.getByLabelText("Nuovo stato");
    const statusOptions = within(statusSelect);
    expect(statusSelect).toHaveValue("Da riparare");
    expect(
      statusOptions.getByRole("option", { name: "Da riparare" }),
    ).toBeInTheDocument();
    expect(
      statusOptions.getByRole("option", { name: "Pronta" }),
    ).toBeInTheDocument();
    expect(
      statusOptions.queryByRole("option", { name: "Consegnata" }),
    ).not.toBeInTheDocument();
  });

  it("filtra le riparazioni e apre il dettaglio tecnico", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Riparazioni" }),
    );

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

  it("apre la nuova accettazione riparazione", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Riparazioni" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Nuova riparazione" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Registra riparazione" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nominativi e riferimenti fittizi/i),
    ).toBeInTheDocument();
  });

  it("mostra la diagnosi per una riparazione accettata", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Riparazioni" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0009" }),
    );
    expect(screen.getByLabelText("Diagnosi tecnica")).toBeInTheDocument();
    expect(screen.getByLabelText("Nuovo stato")).toHaveValue("Diagnosticata");
    expect(
      screen.getByRole("button", { name: "Registra diagnosi" }),
    ).toBeInTheDocument();
  });

  it("richiede i dati di completamento prima dello stato Pronta", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Riparazioni" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0008" }),
    );
    fireEvent.change(screen.getByLabelText("Nuovo stato"), {
      target: { value: "Pronta" },
    });
    expect(
      screen.getByLabelText("Interventi eseguiti, separati da virgola"),
    ).toBeRequired();
    expect(
      screen.getByLabelText("Tempo totale impiegato, in minuti"),
    ).toBeRequired();
    expect(
      screen.queryByLabelText(
        "Confermo che non sono stati utilizzati ricambi",
      ),
    ).not.toBeInTheDocument();
  });

  it("mostra l'inserimento ricambi durante la lavorazione", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Riparazioni" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0008" }),
    );
    expect(
      screen.getByRole("heading", { name: "Inserisci ricambio usato" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ricambio disponibile")).toHaveValue(
      "part-demo-test",
    );
    expect(
      screen.getByRole("button", { name: "Usa ricambio" }),
    ).toBeInTheDocument();
  });

  it("filtra i ricambi disponibili e mostra i movimenti", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Ricambi" }));

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

  it("filtra i collaudi negativi e mostra la checklist", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Collaudi" }));

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

  it("filtra le consegne senza contributo e apre il verbale", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Consegne" }));

    expect(
      screen.getByRole("heading", { name: "Consegne" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Contributo"), {
      target: { value: "Senza contributo" },
    });

    expect(
      screen.getByRole("status", { name: "2 consegne trovate" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri consegna CON-2026-0004" }),
    );

    expect(screen.getByTestId("delivery-detail")).toHaveTextContent(
      "Ente Sociale Demo",
    );
    expect(screen.getByTestId("delivery-detail")).toHaveTextContent(
      "Cessione gratuita da validare",
    );
    expect(screen.getByTestId("delivery-detail")).toHaveTextContent(
      "VER-2026-0004",
    );
  });
});
