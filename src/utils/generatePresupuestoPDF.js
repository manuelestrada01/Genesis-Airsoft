import { jsPDF } from "jspdf";

// Colors matching presupuesto template (dark header + green accents)
const DARK    = [15,  15,  15];   // near-black header bg
const GREEN   = [34, 139, 34];    // mid-green (table headers, section bars)
const GREEN_LIGHT = [144, 238, 144]; // light green for alternating rows
const WHITE   = [255, 255, 255];
const GREY    = [240, 240, 240];
const MID     = [100, 100, 100];
const DARK_TXT = [30, 30, 30];

const SERVICE_CONDITIONS = [
  "1. El diagnóstico tiene un costo fijo aunque el cliente decida no continuar con la reparación.",
  "2. Los repuestos quedan a cargo del cliente en caso de cancelación del servicio una vez aprobado.",
  "3. Genesis Airsoft no se hace responsable por daños preexistentes no declarados al ingreso de la réplica.",
  "4. El tiempo estimado de entrega es de 5 a 10 días hábiles según disponibilidad de repuestos.",
  "5. Este presupuesto tiene validez de 15 días corridos desde su fecha de emisión.",
  "6. Una vez aprobado el presupuesto, se solicitará un adelanto del 50% como seña.",
];

/**
 * Genera y descarga el presupuesto/planilla de servicio como PDF.
 * @param {object} turno - servicioTurnos document with planilla sub-object
 */
export function generatePresupuestoPDF(turno) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;   // margin

  const setColor = (rgb) => doc.setTextColor(...rgb);
  const setFill  = (rgb) => doc.setFillColor(...rgb);
  const setDraw  = (rgb) => doc.setDrawColor(...rgb);

  const planilla = turno.planilla || {};
  const user = turno.user || {};
  const replica = turno.replica || {};
  const pricing = turno.pricing || {};

  const presupuestoNumber = planilla.presupuestoNumber || "BORRADOR";
  const fechaDoc = new Date().toLocaleDateString("es-AR");
  const validezDias = "15 días";
  const tecnico = planilla.tecnico || "Manuel Estrada";
  const estado = planilla.estado || turno.status || "Pendiente";

  const serviceLabel = turno.serviceType === "tecnico"
    ? "SERVICIO TÉCNICO"
    : `SERVICE DE MANTENIMIENTO`;

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  // Dark header background
  setFill(DARK);
  doc.rect(0, 0, pageW, 36, "F");

  // Green accent line
  setFill(GREEN);
  doc.rect(0, 36, pageW, 2, "F");

  // "GENESIS" + "AIRSOFT" (large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor(WHITE);
  doc.text("GENESIS", M, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor([200, 244, 0]);
  doc.text("AIRSOFT", M, 26);

  // Right side: PRESUPUESTO title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(WHITE);
  doc.text("PRESUPUESTO", pageW - M, 13, { align: "right" });

  // Subtitle
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  setColor([200, 244, 0]);
  doc.text(serviceLabel, pageW - M, 21, { align: "right" });

  // Website
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor([180, 180, 180]);
  doc.text("genesisairsoft.com.ar", pageW - M, 28, { align: "right" });

  y = 46;

  // ── TWO-COLUMN INFO SECTION ───────────────────────────────────────────────
  const colW = (pageW - M * 2 - 8) / 2;
  const rx = M + colW + 8;

  // Left box: DATOS DEL PRESUPUESTO
  drawSectionHeader(doc, "DATOS DEL PRESUPUESTO", M, y, colW, GREEN, WHITE);
  y += 8;

  const leftRows = [
    ["N° Presupuesto", presupuestoNumber],
    ["Fecha", fechaDoc],
    ["Válido (días)", validezDias],
    ["Técnico", tecnico],
    ["Estado", estado],
  ];

  let leftY = y;
  leftRows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? [245, 245, 245] : WHITE;
    setFill(bg);
    doc.rect(M, leftY - 4, colW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MID);
    doc.text(label, M + 2, leftY);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    doc.text(value || "—", M + colW * 0.45, leftY);
    leftY += 6;
  });

  // Right box: DATOS DEL CLIENTE
  drawSectionHeader(doc, "DATOS DEL CLIENTE", rx, y - 8, colW, GREEN, WHITE);

  const clientRows = [
    ["Cliente", user.name || "—"],
    ["Teléfono", user.phone || "—"],
    ["Email", user.email || "—"],
    ["Instagram / Alias", user.instagram || "—"],
    ["Forma de pago", planilla.formaDePago || "—"],
  ];

  let rightY = y;
  clientRows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? [245, 245, 245] : WHITE;
    setFill(bg);
    doc.rect(rx, rightY - 4, colW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MID);
    doc.text(label, rx + 2, rightY);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    const maxW = colW * 0.55 - 2;
    const truncVal = doc.splitTextToSize(value || "—", maxW)[0];
    doc.text(truncVal, rx + colW * 0.44, rightY);
    rightY += 6;
  });

  y = Math.max(leftY, rightY) + 6;

  // ── DATOS DE LA RÉPLICA ──────────────────────────────────────────────────
  drawSectionHeader(doc, "DATOS DE LA RÉPLICA", M, y, pageW - M * 2, GREEN, WHITE);
  y += 8;

  const replicaCols = [
    ["Marca", replica.marca || "—", "Tipo", replica.tipo || "—"],
    ["Modelo", replica.modelo || "—", "Gearbox", replica.gearbox || "—"],
    ["N° Serie / ID", replica.serie || "—", "FPS estimado", replica.fpsEstimado || "—"],
  ];

  replicaCols.forEach(([l1, v1, l2, v2], i) => {
    const bg = i % 2 === 0 ? [245, 245, 245] : WHITE;
    setFill(bg);
    doc.rect(M, y - 4, pageW - M * 2, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MID);
    doc.text(l1, M + 2, y);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    doc.text(v1, M + 35, y);

    doc.setFont("helvetica", "bold");
    setColor(MID);
    doc.text(l2, pageW / 2 + 2, y);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    doc.text(v2, pageW / 2 + 28, y);

    y += 6;
  });

  y += 2;

  // ── FALLA REPORTADA ──────────────────────────────────────────────────────
  const fallaText = turno.fallaReportada || (turno.serviceType === "mantenimiento" ? `Service de Mantenimiento — ${turno.maintenanceSubtype || ""} ${turno.maintenanceVariant || ""}` : "—");
  const obsText = planilla.observaciones || "—";

  const fallaLines = doc.splitTextToSize(fallaText, pageW - M * 2 - 6);
  const fallaH = Math.max(10, fallaLines.length * 5 + 6);

  drawSectionHeader(doc, "FALLA REPORTADA", M, y, pageW - M * 2, GREEN, WHITE);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(DARK_TXT);
  setFill([250, 250, 250]);
  doc.rect(M, y - 3, pageW - M * 2, fallaH, "F");
  setDraw([220, 220, 220]);
  doc.setLineWidth(0.2);
  doc.rect(M, y - 3, pageW - M * 2, fallaH, "S");
  doc.text(fallaLines, M + 3, y + 2);
  y += fallaH + 4;

  const obsLines = doc.splitTextToSize(obsText, pageW - M * 2 - 6);
  const obsH = Math.max(16, obsLines.length * 5 + 6);

  drawSectionHeader(doc, "OBSERVACIONES", M, y, pageW - M * 2, GREEN, WHITE);
  y += 6;
  setFill([250, 250, 250]);
  doc.rect(M, y - 3, pageW - M * 2, obsH, "F");
  setDraw([220, 220, 220]);
  doc.rect(M, y - 3, pageW - M * 2, obsH, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(DARK_TXT);
  doc.text(obsLines, M + 3, y + 2);
  y += obsH + 4;

  // ── ITEMS TABLE ──────────────────────────────────────────────────────────
  const items = planilla.items || [];
  const COL_WIDTHS = [8, 78, 30, 14, 22, 26]; // #, Desc, Tipo, Cant, P.Unit, Subtotal
  const COL_X = [M];
  for (let i = 0; i < COL_WIDTHS.length - 1; i++) {
    COL_X.push(COL_X[i] + COL_WIDTHS[i]);
  }
  const tableW = COL_WIDTHS.reduce((a, b) => a + b, 0);
  const ROW_H = 7;

  // Table header
  setFill(GREEN);
  doc.rect(M, y, tableW, 7, "F");
  const headers = ["#", "DESCRIPCIÓN DEL TRABAJO / REPUESTO", "TIPO", "CANT.", "P. UNITARIO", "SUBTOTAL"];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(WHITE);
  headers.forEach((h, i) => {
    doc.text(h, COL_X[i] + 1.5, y + 4.5);
  });
  y += 7;

  // Table rows (min 5)
  const totalRows = Math.max(items.length, 5);
  for (let i = 0; i < totalRows; i++) {
    const item = items[i];
    const bg = i % 2 === 0 ? WHITE : [248, 248, 248];
    setFill(bg);
    doc.rect(M, y, tableW, ROW_H, "F");

    if (item) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setColor([80, 80, 80]);
      doc.text(String(i + 1).padStart(2, "0"), COL_X[0] + 1.5, y + 4.5);

      doc.setFont("helvetica", "normal");
      setColor(DARK_TXT);
      const descLines = doc.splitTextToSize(item.descripcion || "", COL_WIDTHS[1] - 3);
      doc.text(descLines[0], COL_X[1] + 1.5, y + 4.5);

      doc.setFont("helvetica", "italic");
      setColor([100, 100, 100]);
      doc.text(item.tipo || "", COL_X[2] + 1.5, y + 4.5);

      doc.setFont("helvetica", "normal");
      setColor(DARK_TXT);
      doc.text(String(item.cantidad || ""), COL_X[3] + 1.5, y + 4.5);

      doc.setFont("helvetica", "bold");
      doc.text(`$${Number(item.precioUnitario || 0).toLocaleString("es-AR")}`, COL_X[4] + 1.5, y + 4.5);
      doc.text(`$${Number(item.subtotal || 0).toLocaleString("es-AR")}`, COL_X[5] + 1.5, y + 4.5);
    }

    // Row border
    setDraw([220, 220, 220]);
    doc.setLineWidth(0.15);
    doc.line(M, y + ROW_H, M + tableW, y + ROW_H);
    y += ROW_H;
  }

  // Table outer border + vertical column lines
  setDraw([180, 180, 180]);
  doc.setLineWidth(0.3);
  doc.rect(M, y - totalRows * ROW_H - 7, tableW, totalRows * ROW_H + 7, "S");
  COL_X.slice(1).forEach((cx) => {
    doc.setLineWidth(0.15);
    setDraw([210, 210, 210]);
    doc.line(cx, y - totalRows * ROW_H - 7, cx, y);
  });

  y += 4;

  // ── TOTALS ───────────────────────────────────────────────────────────────
  const subtotal = planilla.subtotal || pricing.total || 0;
  const discount = planilla.descuentoPercent || 0;
  const totalFinal = planilla.totalAPagar || subtotal;

  const totalBoxX = pageW - M - 70;
  const totalBoxW = 70;

  // Subtotal row
  setFill([245, 245, 245]);
  doc.rect(totalBoxX, y, totalBoxW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(MID);
  doc.text("SUBTOTAL:", totalBoxX + 3, y + 4.8);
  setColor(DARK_TXT);
  doc.text(`$${Number(subtotal).toLocaleString("es-AR")}`, totalBoxX + totalBoxW - 3, y + 4.8, { align: "right" });
  y += 7;

  // Discount row
  setFill([245, 245, 245]);
  doc.rect(totalBoxX, y, totalBoxW, 7, "F");
  doc.setFont("helvetica", "bold");
  setColor(MID);
  doc.text("DESCUENTO:", totalBoxX + 3, y + 4.8);
  doc.text(`${discount}%`, totalBoxX + totalBoxW - 3, y + 4.8, { align: "right" });
  y += 7;

  // Total final (highlighted)
  setFill(GREEN);
  doc.rect(totalBoxX, y, totalBoxW, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(WHITE);
  doc.text("TOTAL A PAGAR:", totalBoxX + 3, y + 5.8);
  doc.text(`$${Number(totalFinal).toLocaleString("es-AR")}`, totalBoxX + totalBoxW - 3, y + 5.8, { align: "right" });
  y += 14;

  // ── CONDITIONS ───────────────────────────────────────────────────────────
  // Check if we need a new page
  if (y + 60 > pageH - 20) {
    doc.addPage();
    y = 20;
  }

  drawSectionHeader(doc, "CONDICIONES DEL SERVICIO", M, y, pageW - M * 2, GREEN, WHITE);
  y += 8;

  SERVICE_CONDITIONS.forEach((cond) => {
    const lines = doc.splitTextToSize(cond, pageW - M * 2 - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(DARK_TXT);
    doc.text(lines, M + 2, y);
    y += lines.length * 4.5 + 1;
  });

  y += 8;

  // ── SIGNATURES ──────────────────────────────────────────────────────────
  if (y + 30 > pageH - 10) {
    doc.addPage();
    y = 20;
  }

  const sigW = (pageW - M * 2 - 20) / 2;
  const sig2X = M + sigW + 20;

  // Signature boxes
  setDraw([180, 180, 180]);
  doc.setLineWidth(0.3);

  // Client signature
  setFill([250, 250, 250]);
  doc.rect(M, y, sigW, 22, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(MID);
  doc.text("Firma y aclaración del cliente", M + sigW / 2, y + 18, { align: "center" });

  // Technician signature
  setFill([250, 250, 250]);
  doc.rect(sig2X, y, sigW, 22, "FD");
  doc.text("Firma del técnico autorizado", sig2X + sigW / 2, y + 18, { align: "center" });

  y += 30;

  // ── FOOTER ──────────────────────────────────────────────────────────────
  setFill([240, 240, 240]);
  doc.rect(0, pageH - 10, pageW, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(MID);
  doc.text(
    `genesisairsoft.com.ar  |  @genesis.airsoft  |  Buenos Aires, Argentina`,
    pageW / 2, pageH - 4, { align: "center" }
  );
  doc.text(`Pág. 1`, pageW - M, pageH - 4, { align: "right" });

  doc.save(`presupuesto-${presupuestoNumber}-${(turno.user?.name || "cliente").replace(/\s+/g, "_")}.pdf`);
}

// Helper: draw a green section header bar
function drawSectionHeader(doc, title, x, y, width, fillColor, textColor) {
  doc.setFillColor(...fillColor);
  doc.rect(x, y, width, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...textColor);
  doc.text(title, x + 2, y + 4.2, { charSpace: 0.3 });
}
