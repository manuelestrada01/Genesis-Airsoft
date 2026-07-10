import { jsPDF } from "jspdf";

const DARK      = [15,  15,  15];
const GREEN     = [34, 139, 34];
const WHITE     = [255, 255, 255];
const GREY      = [240, 240, 240];
const MID       = [100, 100, 100];
const DARK_TXT  = [30, 30, 30];

const CONDITIONS = [
  "1. Este presupuesto es válido por 15 días corridos desde su fecha de emisión.",
  "2. Los precios pueden variar si se modifican las condiciones del trabajo descripto.",
  "3. Genesis Airsoft no se hace responsable por demoras ajenas a su operación.",
  "4. El presupuesto aprobado requiere una seña del 50% para iniciar el trabajo.",
  "5. Todos los repuestos utilizados cuentan con garantía de 30 días.",
];

function drawSectionHeader(doc, title, x, y, width, fillColor, textColor) {
  doc.setFillColor(...fillColor);
  doc.rect(x, y, width, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...textColor);
  doc.text(title, x + 2, y + 4.2, { charSpace: 0.3 });
}

/**
 * Genera y descarga un presupuesto manual como PDF.
 * @param {object} presupuesto - documento de Firestore de presupuestosManuales
 */
export function generatePresupuestoManualPDF(presupuesto) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;

  const setColor = (rgb) => doc.setTextColor(...rgb);
  const setFill  = (rgb) => doc.setFillColor(...rgb);
  const setDraw  = (rgb) => doc.setDrawColor(...rgb);

  const numero       = presupuesto.numero || "BORRADOR";
  const cliente      = presupuesto.cliente || {};
  const items        = presupuesto.items || [];
  const fechaDoc     = new Date().toLocaleDateString("es-AR");
  const descripcion  = presupuesto.descripcion || "—";
  const observaciones = presupuesto.observaciones || "—";
  const formaDePago  = presupuesto.formaDePago || "—";
  const subtotal     = presupuesto.subtotal || 0;
  const descuento    = presupuesto.descuentoPercent || 0;
  const totalAPagar  = presupuesto.totalAPagar || subtotal;

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  setFill(DARK);
  doc.rect(0, 0, pageW, 36, "F");

  setFill(GREEN);
  doc.rect(0, 36, pageW, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor(WHITE);
  doc.text("GENESIS", M, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor([200, 244, 0]);
  doc.text("AIRSOFT", M, 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(WHITE);
  doc.text("PRESUPUESTO", pageW - M, 13, { align: "right" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  setColor([200, 244, 0]);
  doc.text("PRESUPUESTO MANUAL", pageW - M, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor([180, 180, 180]);
  doc.text("genesisairsoft.com.ar", pageW - M, 28, { align: "right" });

  y = 46;

  // ── TWO-COLUMN INFO SECTION ───────────────────────────────────────────────
  const colW = (pageW - M * 2 - 8) / 2;
  const rx = M + colW + 8;

  // Left: DATOS DEL PRESUPUESTO
  drawSectionHeader(doc, "DATOS DEL PRESUPUESTO", M, y, colW, GREEN, WHITE);
  y += 6;

  const leftRows = [
    ["N° Presupuesto", numero],
    ["Fecha", fechaDoc],
    ["Válido (días)", "15 días"],
    ["Forma de pago", formaDePago],
    ["Estado", presupuesto.status === "enviado" ? "Enviado al cliente" : "Borrador"],
  ];

  let leftY = y;
  leftRows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? [245, 245, 245] : WHITE;
    setFill(bg);
    doc.rect(M, leftY, colW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MID);
    doc.text(label, M + 2, leftY + 4);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    doc.text(String(value || "—"), M + colW * 0.45, leftY + 4);
    leftY += 6;
  });

  // Right: DATOS DEL CLIENTE
  drawSectionHeader(doc, "DATOS DEL CLIENTE", rx, y - 6, colW, GREEN, WHITE);

  const clientRows = [
    ["Cliente", cliente.nombre || "—"],
    ["Teléfono", cliente.telefono || "—"],
    ["Email", cliente.email || "—"],
  ];

  let rightY = y;
  clientRows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? [245, 245, 245] : WHITE;
    setFill(bg);
    doc.rect(rx, rightY, colW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(MID);
    doc.text(label, rx + 2, rightY + 4);
    doc.setFont("helvetica", "normal");
    setColor(DARK_TXT);
    const maxW = colW * 0.55 - 2;
    const truncVal = doc.splitTextToSize(String(value || "—"), maxW)[0];
    doc.text(truncVal, rx + colW * 0.44, rightY + 4);
    rightY += 6;
  });

  y = Math.max(leftY, rightY) + 6;

  // ── DESCRIPCIÓN DEL PRESUPUESTO ──────────────────────────────────────────
  // IMPORTANT: set font size BEFORE splitTextToSize so wrapping matches render
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const descLines = doc.splitTextToSize(descripcion, pageW - M * 2 - 8);
  const lineH85 = (8.5 / doc.internal.scaleFactor) * doc.getLineHeightFactor();
  const descH = Math.max(14, descLines.length * lineH85 + 8);

  drawSectionHeader(doc, "DESCRIPCIÓN DEL PRESUPUESTO", M, y, pageW - M * 2, GREEN, WHITE);
  y += 6;
  setColor(DARK_TXT);
  setFill([250, 250, 250]);
  doc.rect(M, y, pageW - M * 2, descH, "F");
  setDraw([220, 220, 220]);
  doc.setLineWidth(0.2);
  doc.rect(M, y, pageW - M * 2, descH, "S");
  doc.text(descLines, M + 3, y + 5);
  y += descH + 4;

  // ── OBSERVACIONES ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const obsLines = doc.splitTextToSize(observaciones, pageW - M * 2 - 8);
  const obsH = Math.max(14, obsLines.length * lineH85 + 8);

  drawSectionHeader(doc, "OBSERVACIONES", M, y, pageW - M * 2, GREEN, WHITE);
  y += 6;
  setFill([250, 250, 250]);
  doc.rect(M, y, pageW - M * 2, obsH, "F");
  setDraw([220, 220, 220]);
  doc.rect(M, y, pageW - M * 2, obsH, "S");
  setColor(DARK_TXT);
  doc.text(obsLines, M + 3, y + 5);
  y += obsH + 4;

  // ── ITEMS TABLE ──────────────────────────────────────────────────────────
  const COL_WIDTHS = [8, 78, 30, 14, 22, 26];
  const COL_X = [M];
  for (let i = 0; i < COL_WIDTHS.length - 1; i++) {
    COL_X.push(COL_X[i] + COL_WIDTHS[i]);
  }
  const tableW = COL_WIDTHS.reduce((a, b) => a + b, 0);
  const ROW_H = 7;

  setFill(GREEN);
  doc.rect(M, y, tableW, 7, "F");
  const headers = ["#", "DESCRIPCIÓN DEL TRABAJO / REPUESTO", "TIPO", "CANT.", "P. UNITARIO", "SUBTOTAL"];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(WHITE);
  headers.forEach((h, i) => doc.text(h, COL_X[i] + 1.5, y + 4.5));
  y += 7;

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
      const descL = doc.splitTextToSize(item.descripcion || "", COL_WIDTHS[1] - 3);
      doc.text(descL[0], COL_X[1] + 1.5, y + 4.5);

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

    setDraw([220, 220, 220]);
    doc.setLineWidth(0.15);
    doc.line(M, y + ROW_H, M + tableW, y + ROW_H);
    y += ROW_H;
  }

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
  const totalBoxX = pageW - M - 70;
  const totalBoxW = 70;

  setFill([245, 245, 245]);
  doc.rect(totalBoxX, y, totalBoxW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(MID);
  doc.text("SUBTOTAL:", totalBoxX + 3, y + 4.8);
  setColor(DARK_TXT);
  doc.text(`$${Number(subtotal).toLocaleString("es-AR")}`, totalBoxX + totalBoxW - 3, y + 4.8, { align: "right" });
  y += 7;

  setFill([245, 245, 245]);
  doc.rect(totalBoxX, y, totalBoxW, 7, "F");
  doc.setFont("helvetica", "bold");
  setColor(MID);
  doc.text("DESCUENTO:", totalBoxX + 3, y + 4.8);
  doc.text(`${descuento}%`, totalBoxX + totalBoxW - 3, y + 4.8, { align: "right" });
  y += 7;

  setFill(GREEN);
  doc.rect(totalBoxX, y, totalBoxW, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(WHITE);
  doc.text("TOTAL A PAGAR:", totalBoxX + 3, y + 5.8);
  doc.text(`$${Number(totalAPagar).toLocaleString("es-AR")}`, totalBoxX + totalBoxW - 3, y + 5.8, { align: "right" });
  y += 14;

  // ── CONDITIONS ───────────────────────────────────────────────────────────
  if (y + 50 > pageH - 20) {
    doc.addPage();
    y = 20;
  }

  drawSectionHeader(doc, "CONDICIONES", M, y, pageW - M * 2, GREEN, WHITE);
  y += 8;

  CONDITIONS.forEach((cond) => {
    const lines = doc.splitTextToSize(cond, pageW - M * 2 - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(DARK_TXT);
    doc.text(lines, M + 2, y);
    y += lines.length * 4.5 + 1;
  });

  y += 8;

  // ── SIGNATURE ────────────────────────────────────────────────────────────
  if (y + 30 > pageH - 10) {
    doc.addPage();
    y = 20;
  }

  const sigW = (pageW - M * 2 - 20) / 2;
  const sig2X = M + sigW + 20;

  setDraw([180, 180, 180]);
  doc.setLineWidth(0.3);

  setFill([250, 250, 250]);
  doc.rect(M, y, sigW, 22, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(MID);
  doc.text("Firma y aclaración del cliente", M + sigW / 2, y + 18, { align: "center" });

  setFill([250, 250, 250]);
  doc.rect(sig2X, y, sigW, 22, "FD");
  doc.text("Sello / Firma Genesis Airsoft", sig2X + sigW / 2, y + 18, { align: "center" });

  // ── FOOTER ──────────────────────────────────────────────────────────────
  setFill([240, 240, 240]);
  doc.rect(0, pageH - 10, pageW, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(MID);
  doc.text(
    "genesisairsoft.com.ar  |  @genesis.airsoft  |  Buenos Aires, Argentina",
    pageW / 2, pageH - 4, { align: "center" }
  );
  doc.text("Pág. 1", pageW - M, pageH - 4, { align: "right" });

  const nombreArchivo = (cliente.nombre || "cliente").replace(/\s+/g, "_");
  doc.save(`presupuesto-${numero}-${nombreArchivo}.pdf`);
}
