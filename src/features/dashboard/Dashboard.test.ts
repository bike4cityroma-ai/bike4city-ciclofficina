import { describe, expect, it } from "vitest";
import { navigationItemsForRoles } from "./Dashboard";

function labelsFor(role: string) {
  return navigationItemsForRoles([role]).map((item) => item.label);
}

describe("navigazione per ruolo", () => {
  it("riserva soci e utenti all'amministratore", () => {
    const labels = labelsFor("admin");
    expect(labels).toContain("Soci");
    expect(labels).toContain("Utenti e ruoli");
  });

  it("mostra al volontario soltanto i moduli tecnici leggibili", () => {
    expect(labelsFor("volunteer")).toEqual([
      "Dashboard",
      "Biciclette",
      "Ricambi",
      "Collaudi",
    ]);
  });

  it("nasconde al sola lettura soci, documenti e utenti", () => {
    const labels = labelsFor("read_only");
    expect(labels).not.toContain("Soci");
    expect(labels).not.toContain("Documenti");
    expect(labels).not.toContain("Utenti e ruoli");
    expect(labels).toContain("Ricevute");
  });

  it("mantiene al tesoriere le aree contabili autorizzate", () => {
    const labels = labelsFor("treasurer");
    expect(labels).toContain("Soci");
    expect(labels).toContain("Ricevute");
    expect(labels).toContain("Documenti");
    expect(labels).not.toContain("Utenti e ruoli");
  });
});
