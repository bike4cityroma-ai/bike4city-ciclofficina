import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function openSection(name: string) {
  fireEvent.click(await screen.findByRole("button", { name }));
  await screen.findByRole("heading", { name }, { timeout: 5_000 });
}

describe("App", () => {
  it("mostra il login dimostrativo all'avvio", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Gestionale ciclofficina" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ambiente demo")).toBeInTheDocument();
  });

  it("distingue lo staging dagli emulatori e non precompila credenziali", () => {
    vi.stubEnv("VITE_USE_FIREBASE_EMULATORS", "false");

    render(<App />);

    expect(screen.getByText("Ambiente staging")).toBeInTheDocument();
    expect(screen.getByLabelText("Email account fittizio")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Accedi allo staging" }),
    ).toBeInTheDocument();
  });

  it("apre la dashboard e consente di uscire", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Buon lavoro, Giulia" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", {
      name: "Salta al contenuto principale",
    })).toHaveAttribute("href", "#main-content");
    expect(document.querySelector("main")).toHaveAttribute(
      "id",
      "main-content",
    );
    fireEvent.click(screen.getByRole("link", {
      name: "Salta al contenuto principale",
    }));
    expect(document.querySelector("main")).toHaveFocus();
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
    await openSection("Biciclette");

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
    await openSection("Biciclette");
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

  it("gestisce il focus all'apertura e alla chiusura dei dialoghi", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Biciclette");
    const openButton = screen.getByRole("button", {
      name: "Registra bicicletta",
    });
    openButton.focus();
    fireEvent.click(openButton);

    const closeButton = screen.getByRole("button", {
      name: "Chiudi registrazione",
    });
    await waitFor(() => expect(closeButton).toHaveFocus());
    fireEvent.click(closeButton);
    await waitFor(() => expect(openButton).toHaveFocus());
  });

  it("mostra soltanto gli avanzamenti consentiti nella scheda bici", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Biciclette");
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
    await openSection("Riparazioni");

    expect(
      screen.getByRole("heading", { name: "Riparazioni" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "6 interventi trovati" }),
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

  it("apre la gestione del mancato ritiro per una riparazione collaudata",
    async () => {
      render(<App />);
      fireEvent.click(
        screen.getByRole("button", { name: "Entra nel prototipo" }),
      );
      await openSection("Riparazioni");
      fireEvent.click(
        screen.getByRole("button", { name: "Apri intervento RIP-2026-0005" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Gestisci mancato ritiro" }),
      );
      expect(screen.getByRole("dialog", {
        name: "Gestisci mancato ritiro",
      })).toBeInTheDocument();
      expect(screen.getByLabelText("Evento")).toHaveValue("ready_notice");
      expect(screen.getByText(/sequenza 15\/30\/45 giorni/i))
        .toBeInTheDocument();
    });

  it("apre la segnalazione di sicurezza dalla scheda riparazione", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0008" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Segnala rischio sicurezza" }),
    );
    expect(screen.getByRole("dialog", {
      name: "Segnala rischio sicurezza",
    })).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo di rischio"))
      .toHaveValue("damaged_battery");
    expect(screen.getByText(/nessuno smaltimento automatico/i))
      .toBeInTheDocument();
  });

  it("apre la nuova accettazione riparazione", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
    fireEvent.click(
      screen.getByRole("button", { name: "Nuova riparazione" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Registra riparazione" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nominativi e riferimenti fittizi/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Condizioni visibili all’accettazione"),
    ).toBeRequired();
    expect(screen.getByText(/Nessun intervento ulteriore/))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipologia utente"), {
      target: { value: "Organizzazione" },
    });
    expect(
      screen.getByLabelText("Referente dell’organizzazione fittizio"),
    ).toBeRequired();
    expect(screen.getByLabelText("Nome organizzazione fittizia"))
      .toBeRequired();
  });

  it("mostra la diagnosi per una riparazione accettata", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0009" }),
    );
    expect(screen.getByLabelText("Diagnosi tecnica")).toBeInTheDocument();
    expect(screen.getByLabelText("Nuovo stato")).toHaveValue(
      "In attesa autorizzazione",
    );
    expect(
      screen.getByRole("button", { name: "Registra diagnosi" }),
    ).toBeInTheDocument();
  });

  it("richiede i dati di completamento prima dello stato Pronta", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
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

  it("richiede un'autorizzazione tracciata dopo la diagnosi", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Apri intervento RIP-2026-0010",
      }),
    );
    expect(screen.getByText(/Policy approvata ACC-003/)).toBeInTheDocument();
    expect(screen.getByLabelText("Modalità dell’autorizzazione"))
      .toHaveValue("Modulo firmato");
    expect(
      screen.queryByRole("option", { name: "Telefono" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Email esplicita" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("File firmato")).toBeRequired();
    expect(screen.getByLabelText("Importo comunicato dopo la diagnosi"))
      .toBeRequired();
    expect(screen.getByRole("checkbox", {
      name: /conferma esplicitamente l’importo comunicato/i,
    })).toBeRequired();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Originale cartaceo conservato" }),
    );
    expect(screen.getByLabelText("Codice ubicazione dell’originale"))
      .toBeRequired();
    expect(screen.getByLabelText("Responsabile della custodia fittizio"))
      .toBeRequired();
    expect(
      screen.getByRole("button", { name: "Registra autorizzazione" }),
    ).toBeDisabled();
  });

  it("mostra l'inserimento ricambi durante la lavorazione", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
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

  it("spiega come riprendere una lavorazione in attesa ricambi", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Riparazioni");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri intervento RIP-2026-0007" }),
    );
    expect(screen.getByText(
      /Quando il componente è disponibile, riportala in “In lavorazione”/,
    )).toBeInTheDocument();
    expect(screen.getByLabelText("Nuovo stato")).toHaveValue("In lavorazione");
    expect(
      screen.getByRole("button", { name: "Aggiorna stato" }),
    ).toBeDisabled();
  });

  it("filtra i ricambi disponibili e mostra i movimenti", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Ricambi");

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
    expect(screen.getByTestId("part-detail")).toHaveTextContent("6,50 €");
  });

  it("apre la registrazione con carico iniziale del ricambio", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Ricambi");
    fireEvent.click(
      screen.getByRole("button", { name: "Registra ricambio" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Registra ricambio" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantità iniziale")).toHaveValue(1);
    expect(screen.getByLabelText("Prezzo consigliato (€)")).toHaveValue(null);
    expect(
      screen.getByRole("button", { name: "Registra e carica" }),
    ).toBeInTheDocument();
  });

  it("mostra i movimenti successivi nella scheda ricambio", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Ricambi");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri ricambio RIC-2026-0042" }),
    );
    expect(screen.getByLabelText("Operazione")).toHaveValue("in");
    expect(
      screen.getByRole("option", { name: "Rettifica inventariale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Registra movimento" }),
    ).toBeDisabled();
  });

  it("filtra i collaudi negativi e mostra la checklist", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Collaudi");

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

  it("apre la checklist di un nuovo collaudo", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Collaudi");
    fireEvent.click(
      screen.getByRole("button", { name: "Nuovo collaudo" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Nuovo collaudo" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Esito Freni")).toHaveValue("Conforme");
    expect(screen.getByRole("checkbox", {
      name: "Prova necessaria ed eseguita in area controllata",
    })).not.toBeChecked();
    expect(screen.getByLabelText("Motivo della mancata prova")).toBeRequired();
    expect(screen.getByText(
      /strada pubblica e la geolocalizzazione sono bloccate/i,
    )).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Consolida collaudo" }),
    ).toBeInTheDocument();
  });

  it("filtra le consegne senza contributo e apre il verbale", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Consegne");

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

  it("apre la registrazione di una nuova consegna", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Consegne");
    fireEvent.click(
      screen.getByRole("button", { name: "Nuova consegna" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Nuova consegna" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Confermo condizioni, accessori e dichiarazioni di consegna",
      ),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Registra consegna" }),
    ).toBeDisabled();
  });

  it("filtra i soci e apre la registrazione minimizzata", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Soci");
    expect(screen.getByRole("heading", { name: "Soci" })).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "2 soci trovati" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Stato"), {
      target: { value: "Scaduto" },
    });
    expect(
      screen.getByRole("status", { name: "1 soci trovati" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registra socio" }));
    expect(
      screen.getByRole("dialog", { name: "Registra socio" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Motivazione")).toBeRequired();
  });

  it("apre i documenti e distingue le bozze non approvate", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Documenti");
    expect(screen.getByText("Bozza non approvata")).toBeInTheDocument();
    expect(screen.getByText(/non costituiscono documenti consolidati/i))
      .toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Genera bozza PDF" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Genera bozza PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo documento")).toHaveValue("acceptance");
    expect(
      screen.getByRole("button", { name: "Genera e archivia" }),
    ).toBeInTheDocument();
  });

  it("apre il registro e la bozza dimostrativa delle ricevute", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Entra nel prototipo" }),
    );
    await openSection("Ricevute");
    expect(screen.getByRole("heading", { name: "Ricevute" }))
      .toBeInTheDocument();
    expect(screen.getByText(/IVA\/articolo 86 e bollo sono da confermare/i))
      .toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Nuova bozza ricevuta" }),
    );
    expect(screen.getByRole("dialog", { name: "Nuova bozza ricevuta" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Classificazione"))
      .toHaveValue("RIPARAZIONE");
    expect(screen.getByLabelText("Codice fiscale facoltativo"))
      .toBeInTheDocument();
    expect(screen.getByText(/TAX-001 incompleta — non emettibile/i))
      .toBeInTheDocument();
  });
});
