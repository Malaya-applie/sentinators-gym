import PDFDocument from "pdfkit";

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
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function money(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
      .text("FITNESS MEMBERSHIP CONTRACT", 0, 16, {
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
      .text("MEMBERSHIP AGREEMENT", 0, 30, {
        align: "center",
        width: PAGE_W,
        lineBreak: false,
      })
      .restore();

    // Right: contract info
    const rightX = PAGE_W - MARGIN - 140;
    const contractLines = [
      { label: "Contract No.:", value: data.contractNumber },
      { label: "Customer No.:", value: data.customerNumber },
      { label: "Date:", value: data.submittedAt },
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
    let s1BodyY = sectionBox(COL1_X, curY, COL_W, "1. Member Details");
    const s1Fields: [string, string][] = [
      ["First Name / Surname", data.memberName || "-"],
      ["Date of Birth", data.dateOfBirth ? formatDate(data.dateOfBirth) : "-"],
      ["Address", data.address || "-"],
      ["Telephone", data.phone || "-"],
      ["E-Mail", data.email || "-"],
      ["Emergency Contact", data.emergencyContact || "-"],
    ];
    let s1Y = s1BodyY;
    s1Fields.forEach(([lbl, val]) => {
      s1Y = fieldRow(COL1_X, s1Y, COL_W, lbl, val);
    });
    const s1Height = s1Y - curY;

    // --- Section 2: Subscription Selection ---
    let s2BodyY = sectionBox(COL2_X, curY, COL_W, "2. Subscription Selection");
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

    s2Y = fieldRow(COL2_X, s2Y, COL_W, "Duration", data.planDuration || "-");
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Start Date",
      data.startDate ? formatDate(data.startDate) : "-",
    );
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Valid Until",
      data.endDate ? formatDate(data.endDate) : "-",
    );
    s2Y = fieldRow(
      COL2_X,
      s2Y,
      COL_W,
      "Payment Freq.",
      data.paymentFrequency === "UPFRONT"
        ? "Yearly (Upfront)"
        : data.paymentFrequency.charAt(0) +
            data.paymentFrequency.slice(1).toLowerCase(),
    );

    // Additional plans
    if (data.additionalPlans.length > 0) {
      doc
        .save()
        .fillColor(C_ROW_LABEL)
        .fontSize(7)
        .font("Helvetica")
        .text("Add-on Plans:", COL2_X + 6, s2Y + 2, { lineBreak: false })
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
    let s3BodyY = sectionBox(COL1_X, curY, COL_W, "3. Price Overview");
    let s3Y = s3BodyY;

    s3Y = fieldRow(
      COL1_X,
      s3Y,
      COL_W,
      data.planName || "Plan",
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
      "Registration Fee (one-time)",
      money(data.currency, data.registrationFee),
      120,
    );

    if (data.discountAmount > 0) {
      s3Y = fieldRow(
        COL1_X,
        s3Y,
        COL_W,
        data.discountLabel || "Discount",
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
          ? "month"
          : data.paymentFrequency === "QUARTERLY"
            ? "quarter"
            : "year";
      s3Y = fieldRow(
        COL1_X,
        s3Y,
        COL_W,
        `Due per ${freqWord}`,
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
      .text("Total", COL1_X + 6, s3Y + 2, { width: 120, lineBreak: false })
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
      .text("Payment Method:", COL1_X + 6, s3Y, { lineBreak: false })
      .restore();
    s3Y += 10;

    const freqOptions = [
      { key: "UPFRONT", label: "Yearly (Upfront)" },
      { key: "MONTHLY", label: "Monthly" },
      { key: "QUARTERLY", label: "Quarterly" },
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
    let s4BodyY = sectionBox(COL2_X, curY, COL_W, "4. Membership Category");
    let s4Y = s4BodyY + 4;

    // Show plan category (derived from planDuration if not provided directly)
    const categoryLabel = data.planDuration?.toLowerCase().includes("month")
      ? "Flexible Monthly Membership"
      : data.planDuration?.toLowerCase().includes("year")
        ? "Annual Membership"
        : data.planName || "Standard Membership";

    // Simple display: show the main plan category
    const catOptions = [
      { label: "Standard Membership", match: "standard" },
      { label: "Flexible Monthly Membership", match: "month" },
      { label: "Annual Membership", match: "year" },
      { label: "Student Membership", match: "student" },
      { label: "Senior Membership", match: "senior" },
    ];
    catOptions.forEach(({ label, match }) => {
      const checked =
        data.planDuration?.toLowerCase().includes(match) ||
        data.planName?.toLowerCase().includes(match);
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
        .text("* Minor — Guardian signature required", COL2_X + 6, s4Y, {
          width: COL_W - 12,
          lineBreak: false,
        })
        .restore();
      s4Y += 10;
    }

    const s4Height = s4Y - curY;
    const row2Height = Math.max(s3Height, s4Height) + 4;

    strokeRect(COL1_X, curY, COL_W, row2Height, C_BORDER, 0.5);
    strokeRect(COL2_X, curY, COL_W, row2Height, C_BORDER, 0.5);

    // ── SECTION 5: Contract Conditions (full width) ──────────
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
      "5. Contract Conditions",
    );
    let condY = condBodyY + 2;

    const conditions = [
      {
        title: "Term",
        text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
      },
      {
        title: "Notice Period",
        text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
      },
      {
        title: "Payment Obligation",
        text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
      },
      {
        title: "House Rules",
        text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
      },
      {
        title: "Liability",
        text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
      },
      {
        title: "Data Protection",
        text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
      },
      {
        title: "Health Responsibility",
        text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
      },
    ];

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
          "5. Contract Conditions (continued)",
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

    // ── SECTION 6: Signatures (full width) ───────────────────
    if (curY > PAGE_H - 140) {
      doc.addPage();
      curY = MARGIN;
    }

    const sigBodyY = sectionBox(MARGIN, curY, CONTENT_W, "6. Signatures");
    let sigY = sigBodyY + 8;

    // Three equal columns: Place/Date | Member Sig | Gym Sig
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
      .text("PLACE / DATE", sigCol1 + 4, labelY, {
        width: SIG_COL_W,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("MEMBER SIGNATURE", sigCol2 + 4, labelY, {
        width: SIG_COL_W,
        lineBreak: false,
      })
      .restore();
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .text("GYM SIGNATURE", sigCol3 + 4, labelY, {
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
      .text(data.submittedAt, sigCol1 + 6, sigY + 10, {
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
      .text("Date of signing", sigCol1 + 6, sigY + SIG_H - 9, {
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
          .text("[Signed electronically]", sigCol2 + 6, sigY + SIG_H / 2 - 5, {
            width: SIG_COL_W - 12,
            align: "center",
            lineBreak: false,
          })
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
      .text(data.memberName + " — Member", sigCol2 + 6, sigY + SIG_H - 9, {
        width: SIG_COL_W - 12,
        lineBreak: false,
      })
      .restore();

    // Col 3: gym stamp placeholder
    doc
      .save()
      .fillColor(C_GRAY)
      .fontSize(7)
      .font("Helvetica")
      .text("To be signed by gym staff", sigCol3 + 6, sigY + SIG_H / 2 - 5, {
        width: SIG_COL_W - 12,
        align: "center",
      })
      .restore();

    sigY += SIG_H + 6;

    // Guardian signature (for minors)
    if (data.isMinor && data.guardianSignatureDataUrl) {
      sigY += 4;
      doc
        .save()
        .fillColor(C_GRAY)
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text("GUARDIAN / PARENT SIGNATURE", MARGIN + 4, sigY, {
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
            "[Guardian signed electronically]",
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
        .text("Guardian / Parent Signature", MARGIN + 6, sigY + SIG_H - 9, {
          lineBreak: false,
        })
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
        "This document is generated electronically and constitutes a binding membership agreement. Please retain this copy for your records.",
        MARGIN,
        curY,
        { align: "center", width: CONTENT_W },
      )
      .restore();

    doc.end();
  });
}
