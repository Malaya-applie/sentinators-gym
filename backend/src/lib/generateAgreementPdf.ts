import PDFDocument from "pdfkit";

export interface AgreementSection {
  title: string;
  content: string;
}

export interface AgreementPdfData {
  contractNumber: string;
  customerNumber: string;
  memberName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  planName: string;
  planDuration: string;
  planPrice: number;
  currency: string;
  additionalPlans: { name: string; duration: string; price: number }[];
  registrationFee: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  periodicAmount?: number | null;
  signatureDataUrl: string; // base64 data URL
  guardianSignatureDataUrl?: string;
  isMinor: boolean;
  submittedAt: string;
  membershipTermsSections?: AgreementSection[];
  gymRulesSections?: AgreementSection[];
  gymSignatureImagePath?: string;
  gymStampImagePath?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function money(currency: string, amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return `${currency} ${rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateAgreementPdf(data: AgreementPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width; // 595.28
    const PAGE_H = doc.page.height; // 841.89
    const MARGIN = 28;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // Colors matching the web contract
    const C_HEADER_BG = "#100a0a"; // dark header
    const C_SECTION_BG = "#1a0a0a"; // section title bars
    const C_RED = "#ef4444"; // red-500
    const C_WHITE = "#ffffff";
    const C_DARK = "#111827";
    const C_GRAY = "#6b7280";
    const C_LIGHT_GRAY = "#d1d5db";
    const C_BORDER = "#d1d5db";
    const C_ROW_LABEL = "#4b5563";

    // ── Helpers ──────────────────────────────────────────────

    /** Draw a filled rectangle with a hex color string */
    function fillRect(
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) {
      doc.save().rect(x, y, w, h).fill(color).restore();
    }

    /** Draw a stroked rectangle (border) */
    function strokeRect(
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
      lw = 0.5,
    ) {
      doc
        .save()
        .rect(x, y, w, h)
        .lineWidth(lw)
        .strokeColor(color)
        .stroke()
        .restore();
    }

    /**
     * Draw a section box:
     *  - dark header bar with white label
     *  - white body
     *  - outer border
     * Returns the Y position just inside the body (after the header).
     */
    function sectionBox(
      x: number,
      y: number,
      w: number,
      title: string,
      headerH = 18,
    ): number {
      // Header bar
      fillRect(x, y, w, headerH, C_SECTION_BG);
      doc
        .save()
        .fillColor(C_WHITE)
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text(title.toUpperCase(), x + 6, y + (headerH - 7.5) / 2 + 1, {
          width: w - 12,
          lineBreak: false,
        })
        .restore();
      return y + headerH; // body starts here
    }

    /** Draw a label:value row inside a box */
    function fieldRow(
      x: number,
      y: number,
      w: number,
      label: string,
      value: string,
      labelW = 110,
    ): number {
      const rowH = 14;
      doc
        .save()
        .fillColor(C_ROW_LABEL)
        .fontSize(7)
        .font("Helvetica")
        .text(label + ":", x + 6, y + 3, { width: labelW, lineBreak: false })
        .restore();
      doc
        .save()
        .fillColor(C_DARK)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text(value || "-", x + labelW + 6, y + 3, {
          width: w - labelW - 14,
          lineBreak: false,
        })
        .restore();
      // subtle separator
      doc
        .save()
        .moveTo(x + 4, y + rowH - 1)
        .lineTo(x + w - 4, y + rowH - 1)
        .lineWidth(0.3)
        .strokeColor("#e5e7eb")
        .stroke()
        .restore();
      return y + rowH;
    }

    // ── PAGE 1 ───────────────────────────────────────────────

    // ── HEADER BAR ───────────────────────────────────────────
    const HEADER_H = 54;
    fillRect(0, 0, PAGE_W, HEADER_H, C_HEADER_BG);

    // Left: gym name + tagline
    doc
      .save()
      .fillColor(C_RED)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("SENTINATORS", MARGIN, 13, { lineBreak: false })
      .restore();
    doc
      .save()
      .fillColor("#ffffff80")
      .fontSize(7.5)
      .font("Helvetica")
      .text("Keep Pumping Gym", MARGIN, 30, { lineBreak: false })
      .restore();

    // Center: contract title
    doc
      .save()
      .fillColor(C_WHITE)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("FITNESS-MITGLIEDSVERTRAG", 0, 16, {
        align: "center",
        width: PAGE_W,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .fillColor("#ffffff60")
      .fontSize(6.5)
      .font("Helvetica")
      .text("MITGLIEDERVEREINBARUNG", 0, 30, {
        align: "center",
        width: PAGE_W,
        lineBreak: false,
      })
      .restore();

    // Right: contract info
    const rightX = PAGE_W - MARGIN - 140;
    const contractLines = [
      { label: "Vertrags-Nr.:", value: data.contractNumber },
      { label: "Kunden-Nr.:", value: data.customerNumber },
      { label: "Datum:", value: formatDate(data.submittedAt) },
    ];
    contractLines.forEach((line, i) => {
      const ly = 10 + i * 14;
      doc
        .save()
        .fillColor("#ffffff80")
        .fontSize(6.5)
        .font("Helvetica")
        .text(line.label, rightX, ly, { width: 60, lineBreak: false })
        .restore();
      doc
        .save()
        .fillColor(C_WHITE)
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text(line.value, rightX + 62, ly, { width: 78, lineBreak: false })
        .restore();
    });

    // ── TWO-COLUMN SECTION ROW 1: Member Details  |  Subscription ──
    let curY = HEADER_H + 10;
    const COL_GAP = 6;
    const COL_W = (CONTENT_W - COL_GAP) / 2;
    const COL1_X = MARGIN;
    const COL2_X = MARGIN + COL_W + COL_GAP;

    // --- Section 1: Member Details ---
    let s1BodyY = sectionBox(COL1_X, curY, COL_W, "1. Mitgliedsdaten");
    const s1Fields: [string, string][] = [
      ["Name", data.memberName || "-"],
      ["Geburtsdatum", data.dateOfBirth ? formatDate(data.dateOfBirth) : "-"],
      ["Adresse", data.address || "-"],
      ["Telefon", data.phone || "-"],
      ["E-Mail", data.email || "-"],
      ["Notfallkontakt", data.emergencyContact || "-"],
    ];
    let s1Y = s1BodyY;
    s1Fields.forEach(([lbl, val]) => {
      s1Y = fieldRow(COL1_X, s1Y, COL_W, lbl, val);
    });
    const s1Height = s1Y - curY;

    // --- Section 2: Subscription Selection ---
    let s2BodyY = sectionBox(COL2_X, curY, COL_W, "2. Auswahl Mitgliedschaft");
    let s2Y = s2BodyY + 4;

    // Plan name
    doc
      .save()
      .fillColor(C_ROW_LABEL)
      .fontSize(7)
      .font("Helvetica")
      .text("Plan:", COL2_X + 6, s2Y, { width: 60, lineBreak: false })
      .restore();
    doc
      .save()
      .fillColor(C_DARK)
      .fontSize(7)
      .font("Helvetica-Bold")
      .text(data.planName || "-", COL2_X + 68, s2Y, {
        width: COL_W - 76,
        lineBreak: false,
      })
      .restore();
    s2Y += 13;

    doc
      .save()
      .moveTo(COL2_X + 4, s2Y - 1)
      .lineTo(COL2_X + COL_W - 4, s2Y - 1)
      .lineWidth(0.3)
      .strokeColor("#e5e7eb")
      .stroke()
      .restore();

    s2Y = fieldRow(COL2_X, s2Y, COL_W, "Dauer", data.planDuration || "-");
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Startdatum",
      data.startDate ? formatDate(data.startDate) : "-",
    );
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Gueltig bis",
      data.endDate ? formatDate(data.endDate) : "-",
    );
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Zahlweise",
      data.paymentFrequency === "UPFRONT"
        ? "Jaehrlich (Vorauszahlung)"
        : data.paymentFrequency === "MONTHLY"
          ? "Monatlich"
          : data.paymentFrequency === "QUARTERLY"
            ? "Vierteljaehrlich"
            : data.paymentFrequency,
    );

    // Additional plans
    if (data.additionalPlans.length > 0) {
      doc
        .save()
        .fillColor(C_ROW_LABEL)
        .fontSize(7)
        .font("Helvetica")
        .text("Zusatzplaene:", COL2_X + 6, s2Y + 2, { lineBreak: false })
        .restore();
      s2Y += 12;
      data.additionalPlans.forEach((ap) => {
        doc
          .save()
          .fillColor(C_DARK)
          .fontSize(7)
          .font("Helvetica")
          .text(
            `• ${ap.name || ap.duration} — ${money(data.currency, ap.price)}`,
            COL2_X + 10,
            s2Y + 2,
            { width: COL_W - 20, lineBreak: false },
          )
          .restore();
        s2Y += 11;
      });
    }

    const s2Height = s2Y - curY;
    const row1Height = Math.max(s1Height, s2Height);

    // Draw borders for row 1 boxes
    strokeRect(COL1_X, curY, COL_W, row1Height, C_BORDER, 0.5);
    strokeRect(COL2_X, curY, COL_W, row1Height, C_BORDER, 0.5);

    // ── TWO-COLUMN SECTION ROW 2: Price Overview  |  Membership Category ──
    curY += row1Height + 8;

    // --- Section 3: Price Overview ---
    let s3BodyY = sectionBox(COL1_X, curY, COL_W, "3. Preisuebersicht");
    let s3Y = s3BodyY;

    s3Y = fieldRow(
      COL1_X,
      s3Y,
      COL_W,
      data.planName || "Tarif",
      money(data.currency, data.planPrice),
      120,
    );

    data.additionalPlans.forEach((ap) => {
      s3Y = fieldRow(
        COL1_X,
        s3Y,
        COL_W,
        `+ ${ap.name || ap.duration}`,
        money(data.currency, ap.price),
        120,
      );
    });

    s3Y = fieldRow(
      COL1_X,
      s3Y,
      COL_W,
      "Anmeldegebuehr (einmalig)",
      money(data.currency, data.registrationFee),
      120,
    );

    if (data.discountAmount > 0) {
      s3Y = fieldRow(
        COL1_X,
        s3Y,
        COL_W,
        data.discountLabel || "Rabatt",
        `- ${money(data.currency, data.discountAmount)}`,
        120,
      );
    }

    if (
      data.periodicAmount != null &&
      data.periodicAmount > 0 &&
      data.paymentFrequency !== "UPFRONT"
    ) {
      const freqWord =
        data.paymentFrequency === "MONTHLY"
          ? "Monat"
          : data.paymentFrequency === "QUARTERLY"
            ? "Quartal"
            : "Jahr";
      s3Y = fieldRow(
        COL1_X,
        s3Y,
        COL_W,
        `Faellig pro ${freqWord}`,
        money(data.currency, data.periodicAmount),
        120,
      );
    }

    // Total row — bold, red amount
    s3Y += 2;
    doc
      .save()
      .moveTo(COL1_X + 4, s3Y)
      .lineTo(COL1_X + COL_W - 4, s3Y)
      .lineWidth(0.8)
      .strokeColor(C_LIGHT_GRAY)
      .stroke()
      .restore();
    s3Y += 4;
    doc
      .save()
      .fillColor(C_DARK)
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text("Gesamt", COL1_X + 6, s3Y + 2, { width: 120, lineBreak: false })
      .restore();
    doc
      .save()
      .fillColor(C_RED)
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text(money(data.currency, data.total), COL1_X + 126, s3Y + 2, {
        width: COL_W - 134,
        lineBreak: false,
      })
      .restore();
    s3Y += 16;

    // Payment frequency checkboxes
    doc
      .save()
      .fillColor(C_ROW_LABEL)
      .fontSize(6.5)
      .font("Helvetica")
      .text("Zahlungsmethode:", COL1_X + 6, s3Y, { lineBreak: false })
      .restore();
    s3Y += 10;

    const freqOptions = [
      { key: "UPFRONT", label: "Jaehrlich (Vollstaendig)" },
      { key: "MONTHLY", label: "Monatlich" },
      { key: "QUARTERLY", label: "Vierteljaehrlich" },
    ];
    let freqX = COL1_X + 6;
    freqOptions.forEach(({ key, label }) => {
      const checked = data.paymentFrequency === key;
      // checkbox square
      doc
        .save()
        .rect(freqX, s3Y, 7, 7)
        .lineWidth(0.8)
        .strokeColor(checked ? C_RED : C_LIGHT_GRAY)
        .stroke()
        .restore();
      if (checked) {
        // filled inner square
        doc
          .save()
          .rect(freqX + 1.5, s3Y + 1.5, 4, 4)
          .fill(C_RED)
          .restore();
      }
      doc
        .save()
        .fillColor(C_DARK)
        .fontSize(6.5)
        .font("Helvetica")
        .text(label, freqX + 9, s3Y + 0.5, { lineBreak: false })
        .restore();
      freqX += 58;
    });
    s3Y += 12;

    const s3Height = s3Y - curY;

    // --- Section 4: Membership Category ---
    let s4BodyY = sectionBox(
      COL2_X,
      curY,
      COL_W,
      "4. Mitgliedschaftskategorie",
    );
    let s4Y = s4BodyY + 4;

    // Show plan category (derived from planDuration if not provided directly)
    const categoryLabel = data.planDuration?.toLowerCase().includes("month")
      ? "Flexible Monatsmitgliedschaft"
      : data.planDuration?.toLowerCase().includes("year")
        ? "Jahresmitgliedschaft"
        : data.planName || "Standardmitgliedschaft";

    // Simple display: show the main plan category
    const catOptions = [
      { label: "Standardmitgliedschaft", match: "standard" },
      { label: "Flexible Monatsmitgliedschaft", match: "month|monat" },
      { label: "Jahresmitgliedschaft", match: "year|jahr" },
      { label: "Studentenmitgliedschaft", match: "student" },
      { label: "Seniorenmitgliedschaft", match: "senior" },
    ];
    catOptions.forEach(({ label, match }) => {
      const checked =
        new RegExp(match, "i").test(data.planDuration || "") ||
        new RegExp(match, "i").test(data.planName || "");
      doc
        .save()
        .rect(COL2_X + 6, s4Y, 7, 7)
        .lineWidth(0.8)
        .strokeColor(checked ? C_RED : C_LIGHT_GRAY)
        .stroke()
        .restore();
      if (checked) {
        doc
          .save()
          .rect(COL2_X + 7.5, s4Y + 1.5, 4, 4)
          .fill(C_RED)
          .restore();
      }
      doc
        .save()
        .fillColor(C_DARK)
        .fontSize(7)
        .font("Helvetica")
        .text(label, COL2_X + 15, s4Y + 0.5, {
          width: COL_W - 22,
          lineBreak: false,
        })
        .restore();
      s4Y += 13;
    });

    // minor note
    if (data.isMinor) {
      doc
        .save()
        .fillColor(C_RED)
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text(
          "* Minderjaehrig - Unterschrift des Erziehungsberechtigten erforderlich",
          COL2_X + 6,
          s4Y,
          {
            width: COL_W - 12,
            lineBreak: false,
          },
        )
        .restore();
      s4Y += 10;
    }

    const s4Height = s4Y - curY;
    const row2Height = Math.max(s3Height, s4Height) + 4;

    strokeRect(COL1_X, curY, COL_W, row2Height, C_BORDER, 0.5);
    strokeRect(COL2_X, curY, COL_W, row2Height, C_BORDER, 0.5);

    // ── SECTION 5: Mitgliedschaftsbedingungen (full width) ───
    curY += row2Height + 8;

    // If not enough space, add new page
    if (curY > PAGE_H - 120) {
      doc.addPage();
      curY = MARGIN;
    }

    const condBodyY = sectionBox(
      MARGIN,
      curY,
      CONTENT_W,
      "5. Vertragsbedingungen Mitgliedschaft",
    );
    let condY = condBodyY + 2;

    const fallbackConditions = [
      {
        title: "Laufzeit",
        text: "Die ausgewaehlte Mitgliedschaft beginnt am Startdatum und gilt fuer die vereinbarte Laufzeit. Eine automatische Verlaengerung erfolgt nur bei fehlender fristgerechter Kuendigung.",
      },
      {
        title: "Kuendigungsfrist",
        text: "Eine Kuendigung muss schriftlich erfolgen und spaetestens 4 Wochen vor Ablauf der jeweiligen Laufzeit beim Studio eingehen.",
      },
      {
        title: "Zahlungsverpflichtung",
        text: "Der Mitgliedsbeitrag ist gemaess der gewaehlten Zahlungsweise im Voraus faellig. Bei Zahlungsverzug behalten wir uns Mahngebuehren und eine Sperrung der Mitgliedschaft vor.",
      },
      {
        title: "Hausordnung",
        text: "Die Mitgliedschaft unterliegt der Hausordnung des Studios. Diese haengt im Studio aus und ist auf der Website einsehbar. Mit Ihrer Unterschrift erkennen Sie diese an.",
      },
      {
        title: "Haftung",
        text: "Das Studio haftet nicht fuer eingebrachte Gegenstaende. Die Nutzung der Geraete erfolgt auf eigene Gefahr. Fuer Minderjaehrige haften die Erziehungsberechtigten.",
      },
      {
        title: "Datenschutz",
        text: "Ihre Daten werden ausschliesslich zur Vertragsabwicklung und Mitgliederbetreuung verwendet. Weitere Informationen finden Sie in unserer Datenschutzerklaerung.",
      },
      {
        title: "Gesundheitsverantwortung",
        text: "Mit Ihrer Unterschrift bestaetigen Sie, dass Sie gesundheitlich in der Lage sind zu trainieren. Bei Unsicherheiten empfehlen wir eine aerztliche Abklaerung.",
      },
    ];

    const conditions =
      data.membershipTermsSections && data.membershipTermsSections.length > 0
        ? data.membershipTermsSections.map((s) => ({
            title: s.title,
            text: s.content,
          }))
        : fallbackConditions;

    conditions.forEach(({ title, text }, idx) => {
      // Check if there's space; if not, start a new page and draw a continuation header
      if (condY > PAGE_H - 60) {
        // Close current box first
        strokeRect(MARGIN, curY, CONTENT_W, condY - curY, C_BORDER, 0.5);
        doc.addPage();
        curY = MARGIN;
        const newBodyY = sectionBox(
          MARGIN,
          curY,
          CONTENT_W,
          "5. Vertragsbedingungen Mitgliedschaft (Fortsetzung)",
        );
        condY = newBodyY + 2;
      }

      doc
        .save()
        .fillColor(C_DARK)
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text(title, MARGIN + 6, condY + 2, {
          width: CONTENT_W - 12,
          lineBreak: false,
        })
        .restore();
      condY += 12;

      // Measure text height
      const textH = doc.heightOfString(text, { width: CONTENT_W - 20 });
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(7)
        .font("Helvetica")
        .text(text, MARGIN + 10, condY, { width: CONTENT_W - 20 })
        .restore();
      condY += textH + 6;

      // Separator between conditions (not after last)
      if (idx < conditions.length - 1) {
        doc
          .save()
          .moveTo(MARGIN + 4, condY)
          .lineTo(MARGIN + CONTENT_W - 4, condY)
          .lineWidth(0.3)
          .strokeColor("#e5e7eb")
          .stroke()
          .restore();
        condY += 3;
      }
    });

    condY += 4;
    strokeRect(MARGIN, curY, CONTENT_W, condY - curY, C_BORDER, 0.5);
    curY = condY + 8;

    // ── SECTION 6: Studioordnung & Gesundheitsverantwortung ──
    if (curY > PAGE_H - 120) {
      doc.addPage();
      curY = MARGIN;
    }

    const rulesBodyY = sectionBox(
      MARGIN,
      curY,
      CONTENT_W,
      "6. Hausordnung & Eigenverantwortung im Gym",
    );
    let rulesY = rulesBodyY + 2;

    const fallbackRules = [
      {
        title: "Allgemeines Verhalten",
        text: "Alle Mitglieder behandeln Mitarbeitende, andere Mitglieder und Geraete jederzeit respektvoll.",
      },
      {
        title: "Gesundheitsverantwortung",
        text: "Mitglieder sind waehrend der Nutzung des Studios selbst fuer Gesundheit und Sicherheit verantwortlich.",
      },
      {
        title: "Haftungsausschluss",
        text: "Das Studio und seine Mitarbeitenden haften nicht fuer Verletzungen, Erkrankungen, Unfaelle oder den Verlust persoenlicher Gegenstaende.",
      },
    ];

    const rules =
      data.gymRulesSections && data.gymRulesSections.length > 0
        ? data.gymRulesSections.map((s) => ({
            title: s.title,
            text: s.content,
          }))
        : fallbackRules;

    rules.forEach(({ title, text }, idx) => {
      if (rulesY > PAGE_H - 60) {
        strokeRect(MARGIN, curY, CONTENT_W, rulesY - curY, C_BORDER, 0.5);
        doc.addPage();
        curY = MARGIN;
        const newBodyY = sectionBox(
          MARGIN,
          curY,
          CONTENT_W,
          "6. Hausordnung & Eigenverantwortung im Gym (Fortsetzung)",
        );
        rulesY = newBodyY + 2;
      }

      doc
        .save()
        .fillColor(C_DARK)
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text(title, MARGIN + 6, rulesY + 2, {
          width: CONTENT_W - 12,
          lineBreak: false,
        })
        .restore();
      rulesY += 12;

      const textH = doc.heightOfString(text, { width: CONTENT_W - 20 });
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(7)
        .font("Helvetica")
        .text(text, MARGIN + 10, rulesY, { width: CONTENT_W - 20 })
        .restore();
      rulesY += textH + 6;

      if (idx < rules.length - 1) {
        doc
          .save()
          .moveTo(MARGIN + 4, rulesY)
          .lineTo(MARGIN + CONTENT_W - 4, rulesY)
          .lineWidth(0.3)
          .strokeColor("#e5e7eb")
          .stroke()
          .restore();
        rulesY += 3;
      }
    });

    rulesY += 4;
    strokeRect(MARGIN, curY, CONTENT_W, rulesY - curY, C_BORDER, 0.5);
    curY = rulesY + 8;

    // ── SECTION 7: Unterschriften (full width) ───────────────
    if (curY > PAGE_H - 140) {
      doc.addPage();
      curY = MARGIN;
    }

    const sigBodyY = sectionBox(MARGIN, curY, CONTENT_W, "7. Unterschriften");
    let sigY = sigBodyY + 8;

    // Three equal columns: Ort/Datum | Mitglied | Studio
    const SIG_COL_W = (CONTENT_W - COL_GAP * 2) / 3;
    const SIG_H = 70;

    // Column positions
    const sigCol1 = MARGIN;
    const sigCol2 = MARGIN + SIG_COL_W + COL_GAP;
    const sigCol3 = MARGIN + (SIG_COL_W + COL_GAP) * 2;

    // Labels row
    const labelY = sigY;
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("ORT / DATUM", sigCol1 + 4, labelY, {
        width: SIG_COL_W,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("UNTERSCHRIFT MITGLIED", sigCol2 + 4, labelY, {
        width: SIG_COL_W,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("UNTERSCHRIFT FITNESSSTUDIO", sigCol3 + 4, labelY, {
        width: SIG_COL_W,
        lineBreak: false,
      })
      .restore();
    sigY += 10;

    // Signature boxes
    strokeRect(sigCol1, sigY, SIG_COL_W, SIG_H, C_BORDER, 0.5);
    strokeRect(sigCol2, sigY, SIG_COL_W, SIG_H, C_BORDER, 0.5);
    strokeRect(sigCol3, sigY, SIG_COL_W, SIG_H, C_BORDER, 0.5);

    // Col 1: date
    doc
      .save()
      .fillColor(C_DARK)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(formatDate(data.submittedAt), sigCol1 + 6, sigY + 10, {
        width: SIG_COL_W - 12,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .moveTo(sigCol1 + 6, sigY + SIG_H - 12)
      .lineTo(sigCol1 + SIG_COL_W - 6, sigY + SIG_H - 12)
      .lineWidth(0.5)
      .strokeColor(C_LIGHT_GRAY)
      .stroke()
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6)
      .font("Helvetica")
      .text("Unterschriftsdatum", sigCol1 + 6, sigY + SIG_H - 9, {
        width: SIG_COL_W - 12,
        lineBreak: false,
      })
      .restore();

    // Col 2: member signature image
    if (
      data.signatureDataUrl &&
      data.signatureDataUrl.startsWith("data:image/")
    ) {
      try {
        const base64Data = data.signatureDataUrl.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.image(imgBuffer, sigCol2 + 6, sigY + 6, {
          width: SIG_COL_W - 12,
          height: SIG_H - 20,
        });
      } catch {
        doc
          .save()
          .fillColor(C_GRAY)
          .fontSize(6.5)
          .font("Helvetica")
          .text(
            "[Elektronisch unterschrieben]",
            sigCol2 + 6,
            sigY + SIG_H / 2 - 5,
            {
              width: SIG_COL_W - 12,
              align: "center",
              lineBreak: false,
            },
          )
          .restore();
      }
    }
    doc
      .save()
      .moveTo(sigCol2 + 6, sigY + SIG_H - 12)
      .lineTo(sigCol2 + SIG_COL_W - 6, sigY + SIG_H - 12)
      .lineWidth(0.5)
      .strokeColor(C_LIGHT_GRAY)
      .stroke()
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6)
      .font("Helvetica")
      .text(data.memberName + " - Mitglied", sigCol2 + 6, sigY + SIG_H - 9, {
        width: SIG_COL_W - 12,
        lineBreak: false,
      })
      .restore();

    // Col 3: gym signature image or placeholder
    if (data.gymSignatureImagePath) {
      try {
        doc.image(data.gymSignatureImagePath, sigCol3 + 6, sigY + 6, {
          width: SIG_COL_W - 12,
          height: SIG_H - 20,
        });
      } catch {
        doc
          .save()
          .fillColor(C_GRAY)
          .fontSize(7)
          .font("Helvetica")
          .text(
            "Wird vom Fitnessstudio unterschrieben",
            sigCol3 + 6,
            sigY + SIG_H / 2 - 5,
            {
              width: SIG_COL_W - 12,
              align: "center",
            },
          )
          .restore();
      }
    } else {
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(7)
        .font("Helvetica")
        .text(
          "Wird vom Fitnessstudio unterschrieben",
          sigCol3 + 6,
          sigY + SIG_H / 2 - 5,
          {
            width: SIG_COL_W - 12,
            align: "center",
          },
        )
        .restore();
    }

    sigY += SIG_H + 6;

    // Gym stamp row
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("STEMPEL FITNESSSTUDIO", MARGIN + 4, sigY, {
        width: CONTENT_W,
        lineBreak: false,
      })
      .restore();
    sigY += 10;

    const stampW = Math.min(180, CONTENT_W);
    const stampH = 70;
    strokeRect(MARGIN, sigY, stampW, stampH, C_BORDER, 0.5);
    if (data.gymStampImagePath) {
      try {
        doc.image(data.gymStampImagePath, MARGIN + 6, sigY + 6, {
          width: stampW - 12,
          height: stampH - 12,
        });
      } catch {
        doc
          .save()
          .fillColor(C_GRAY)
          .fontSize(6.5)
          .font("Helvetica")
          .text(
            "Offizieller Fitnessstudio-Stempel",
            MARGIN + 6,
            sigY + stampH / 2 - 4,
            {
              width: stampW - 12,
              align: "center",
              lineBreak: false,
            },
          )
          .restore();
      }
    }
    sigY += stampH + 6;

    // Guardian signature (for minors)
    if (data.isMinor && data.guardianSignatureDataUrl) {
      sigY += 4;
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text("UNTERSCHRIFT ERZIEHUNGSBERECHTIGTE", MARGIN + 4, sigY, {
          lineBreak: false,
        })
        .restore();
      sigY += 10;

      strokeRect(MARGIN, sigY, SIG_COL_W, SIG_H, C_BORDER, 0.5);

      try {
        const base64Data = data.guardianSignatureDataUrl.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.image(imgBuffer, MARGIN + 6, sigY + 6, {
          width: SIG_COL_W - 12,
          height: SIG_H - 20,
        });
      } catch {
        doc
          .save()
          .fillColor(C_GRAY)
          .fontSize(6.5)
          .font("Helvetica")
          .text(
            "[Elektronisch von Erziehungsberechtigten unterschrieben]",
            MARGIN + 6,
            sigY + SIG_H / 2 - 5,
            {
              width: SIG_COL_W - 12,
              align: "center",
              lineBreak: false,
            },
          )
          .restore();
      }

      doc
        .save()
        .moveTo(MARGIN + 6, sigY + SIG_H - 12)
        .lineTo(MARGIN + SIG_COL_W - 6, sigY + SIG_H - 12)
        .lineWidth(0.5)
        .strokeColor(C_LIGHT_GRAY)
        .stroke()
        .restore();
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(6)
        .font("Helvetica")
        .text(
          "Unterschrift Erziehungsberechtigte",
          MARGIN + 6,
          sigY + SIG_H - 9,
          {
            lineBreak: false,
          },
        )
        .restore();

      sigY += SIG_H + 6;
    }

    const sigBoxH = sigY - sigBodyY + 4;
    strokeRect(MARGIN, sigBodyY - 18, CONTENT_W, sigBoxH + 18, C_BORDER, 0.5);
    curY = sigY + 10;

    // ── FOOTER ───────────────────────────────────────────────
    if (curY > PAGE_H - 30) {
      doc.addPage();
      curY = PAGE_H - 28;
    }
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica")
      .text(
        "Dieses Dokument wurde elektronisch erstellt und stellt eine verbindliche Mitgliedsvereinbarung dar. Bitte bewahren Sie diese Kopie fuer Ihre Unterlagen auf.",
        MARGIN,
        curY,
        { align: "center", width: CONTENT_W },
      )
      .restore();

    doc.end();
  });
}
