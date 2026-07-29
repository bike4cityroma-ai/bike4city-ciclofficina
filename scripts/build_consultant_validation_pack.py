from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "22-fascicolo-validazione-consulente.docx"

BLUE = RGBColor(46, 116, 181)
DARK_BLUE = RGBColor(31, 77, 120)
MUTED = RGBColor(89, 89, 89)
LIGHT = "F2F4F7"
INK = RGBColor(25, 25, 25)


def set_font(run, size=11, bold=False, color=INK, italic=False):
    run.font.name = "Calibri"
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Calibri")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def configure_styles(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    normal.font.size = Pt(11)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.10

    for style_name, size, color, before, after in [
        ("Heading 1", 16, BLUE, 16, 8),
        ("Heading 2", 13, BLUE, 12, 6),
        ("Heading 3", 12, DARK_BLUE, 8, 4),
    ]:
        style = doc.styles[style_name]
        style.font.name = "Calibri"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = color
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_geometry(table, widths_dxa):
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(sum(widths_dxa)))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), "120")
    tbl_ind.set(qn("w:type"), "dxa")

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(widths_dxa[index]))
            tc_w.set(qn("w:type"), "dxa")
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Pagina ")
    set_font(run, 9, color=MUTED)
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)


def configure_section(section):
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)
    header_p = section.header.paragraphs[0]
    header_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = header_p.add_run("APS Bike4City ETS  |  Fascicolo di validazione")
    set_font(run, 9, bold=True, color=MUTED)
    add_page_number(section.footer.paragraphs[0])


def add_title_block(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("FASCICOLO DI VALIDAZIONE")
    set_font(run, 23, bold=True, color=INK)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(14)
    run = p.add_run("LEG-001 · TAX-001 · PRI-001 · DOC-001")
    set_font(run, 14, bold=True, color=BLUE)

    metadata = doc.add_table(rows=4, cols=2)
    metadata.style = "Table Grid"
    set_table_geometry(metadata, [2700, 6660])
    rows = [
        ("Associazione", "APS Bike4City ETS"),
        ("Progetto", "Bike4City Ciclofficina – InControPedale"),
        ("Data", "30 luglio 2026"),
        ("Scopo", "Conferma professionale delle decisioni operative già approvate"),
    ]
    for row, (label, value) in zip(metadata.rows, rows):
        set_cell_shading(row.cells[0], LIGHT)
        row.cells[0].text = ""
        row.cells[1].text = ""
        set_font(row.cells[0].paragraphs[0].add_run(label), 10.5, bold=True)
        set_font(row.cells[1].paragraphs[0].add_run(value), 10.5)

    doc.add_heading("Istruzioni per il consulente", level=1)
    add_bullet(doc, "Esaminare una scheda alla volta e selezionare un solo esito.")
    add_bullet(doc, "Indicare correzioni soltanto dove necessarie, evitando di riscrivere le parti confermate.")
    add_bullet(doc, "Le approvazioni associative descrivono la prassi: non sostituiscono il parere professionale.")
    add_bullet(doc, "Le ricevute definitive e l’uso di dati reali restano bloccati fino alle conferme pertinenti.")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(8)
    set_font(p.add_run("Esito complessivo:  "), 11, bold=True)
    set_font(p.add_run("[ ] Approvato   [ ] Approvato con correzioni   [ ] Da riesaminare"), 11)
    add_signature_block(doc, "Consulente / professionista incaricato")


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.25)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.10
    set_font(p.add_run(text), 11)


def add_signature_block(doc, label):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(3)
    set_font(p.add_run(f"{label}: ______________________________________________"), 10.5)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    set_font(p.add_run("Data: ____________________    Firma / riferimento: __________________________"), 10.5)


def add_validation_page(doc, code, title, approved_text, confirmed_items, professional_items):
    doc.add_page_break()
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(3)
    set_font(p.add_run(code), 11, bold=True, color=BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    set_font(p.add_run(title), 22, bold=True)

    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    set_table_geometry(table, [9360])
    set_cell_shading(table.cell(0, 0), LIGHT)
    p = table.cell(0, 0).paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    set_font(p.add_run("Decisione associativa già approvata\n"), 10, bold=True, color=DARK_BLUE)
    set_font(p.add_run(approved_text), 11, italic=True)

    doc.add_heading("Elementi operativi confermati", level=2)
    for item in confirmed_items:
        add_bullet(doc, item)

    doc.add_heading("Conferme richieste al professionista", level=2)
    for item in professional_items:
        add_bullet(doc, item)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(7)
    set_font(p.add_run("Esito:  "), 11, bold=True)
    set_font(p.add_run("[ ] Approvato   [ ] Approvato con correzioni   [ ] Da riesaminare"), 11)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    set_font(p.add_run("Correzioni / prescrizioni:"), 10.5, bold=True)
    for _ in range(3):
        p = doc.add_paragraph("________________________________________________________________________________")
        p.paragraph_format.space_after = Pt(2)
        set_font(p.runs[0], 10, color=MUTED)
    add_signature_block(doc, "Professionista incaricato")


def build():
    doc = Document()
    configure_styles(doc)
    configure_section(doc.sections[0])
    add_title_block(doc)

    add_validation_page(
        doc,
        "LEG-001",
        "Classificazione delle attività",
        "Prassi operativa approvata dall’associazione; classificazione professionale da confermare.",
        [
            "Attività: riparazioni, biciclette recuperate, erogazioni liberali e quote associative.",
            "Destinatari delle riparazioni e delle biciclette recuperate: soci e non soci.",
            "Ricambi utilizzati come componenti tecnici, senza vendita separata.",
            "Classificazioni configurabili, versionate e non applicate retroattivamente in automatico.",
        ],
        [
            "Qualificazione giuridica delle quattro attività.",
            "Ammissibilità delle attività verso soci e non soci.",
            "Riferimenti normativi e documento organizzativo di supporto.",
            "Eventuali limiti o condizioni da inserire nel software.",
        ],
    )

    add_validation_page(
        doc,
        "TAX-001",
        "Ricevute e trattamento fiscale",
        "Prassi amministrativa e modello operativo approvati dall’associazione; trattamento fiscale e diciture normative da confermare dal consulente.",
        [
            "Unica serie annuale REC-AAAA-NNNN, senza riutilizzo dei progressivi annullati.",
            "Emissione al pagamento/consegna; pagamenti in contanti o PayPal.",
            "Stesso modello con descrizione specifica per ogni classificazione.",
            "Annullamento senza cancellazione, riservato all’amministratore.",
            "Codice fiscale facoltativo; quota associativa annuale fissata a 10 euro.",
        ],
        [
            "Trattamento IVA o altra qualificazione per ciascuna classificazione.",
            "Applicabilità e decorrenza del regime richiamato dall’associazione.",
            "Diciture obbligatorie, bollo, soglie e contenuti della ricevuta.",
            "Conservazione fiscale e validità temporale della configurazione.",
        ],
    )

    add_validation_page(
        doc,
        "PRI-001",
        "Privacy e conservazione dei dati",
        "Misure operative di minimizzazione, separazione, accesso e conservazione approvate dall’associazione; basi giuridiche, tempi definitivi e procedure privacy da confermare dal consulente.",
        [
            "Minimizzazione e separazione tra dati personali e record tecnici.",
            "Accessi per ruolo, audit e archiviazione logica.",
            "Fotografie, firme e PDF in Storage privato senza URL pubblici.",
            "Evidenze delle autorizzazioni: 24 mesi e successiva revisione manuale.",
            "Nessuna cancellazione automatica finché la procedura non è approvata.",
        ],
        [
            "Basi giuridiche, informative e gestione dei consensi.",
            "Tempi definitivi per anagrafiche, pratiche, fotografie, audit e backup.",
            "Procedure per accesso, rettifica, cancellazione, limitazione e portabilità.",
            "Ruoli privacy dei fornitori, trasferimenti, incidenti e responsabilità interne.",
        ],
    )

    add_validation_page(
        doc,
        "DOC-001",
        "Documenti e firme operative",
        "Modelli documentali, processo di firma operativa, versionamento e conservazione tecnica approvati dall’associazione; testi definitivi e valore giuridico da confermare dal consulente.",
        [
            "Scheda di accettazione, autorizzazione lavori, collaudo e verbale di consegna.",
            "PDF A4 versionati, immutabili, privati e corredati da checksum.",
            "Modulo firmato acquisito oppure firma grafica sul dispositivo, senza dati biometrici.",
            "Correzioni tramite nuova versione; copie e ristampe tracciate.",
            "Consegna della copia su carta o download sul dispositivo in sede.",
        ],
        [
            "Testi definitivi e documenti per i quali la firma è necessaria.",
            "Valore della firma su carta acquisita e della firma grafica.",
            "Valore probatorio del PDF e gestione degli originali.",
            "Eventuali formule, dichiarazioni o allegati obbligatori.",
        ],
    )

    for section in doc.sections:
        configure_section(section)
    doc.core_properties.title = "Fascicolo di validazione LEG-001 TAX-001 PRI-001 DOC-001"
    doc.core_properties.subject = "Validazione professionale del gestionale Bike4City Ciclofficina"
    doc.core_properties.author = "APS Bike4City ETS"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
