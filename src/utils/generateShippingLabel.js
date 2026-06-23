import { jsPDF } from "jspdf";

const LIME      = [200, 244, 0];
const NAVY      = [26,  58,  108];
const WHITE     = [255, 255, 255];
const LIGHT_SEP = [240, 240, 240];
const LABEL_CLR = [170, 170, 170];
const BLACK     = [17,  17,  17];

/**
 * Genera y descarga la etiqueta de despacho como PDF.
 *
 * @param {object} sender     { name, dni, tel }
 * @param {object} address    { city, street, zip }
 * @param {object} recipient  { name, dni, zip, province, city, street, phone, email }
 * @param {Array}  items      [{ name, quantity }]
 * @param {string} orderId
 */
export function generateShippingLabel(sender, address, recipient, items, orderId = "manual", paymentType = "Pago en Origen") {
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const M     = 14;                          // margin
  const colW  = (pageW - M * 2 - 8) / 2;   // ~84mm per column
  const divX  = M + colW + 4;               // x of vertical divider

  const setColor = (rgb) => doc.setTextColor(...rgb);
  const setFill  = (rgb) => doc.setFillColor(...rgb);
  const setDraw  = (rgb) => doc.setDrawColor(...rgb);

  // ── 1. LIME TOP BAR ─────────────────────────────────────────────────────────
  setFill(LIME);
  doc.rect(0, 0, pageW, 3, "F");

  // ── 2. BRAND ROW ─────────────────────────────────────────────────────────────
  let y = 9;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text("GENESIS AIRSOFT", M, y, { charSpace: 1.4 });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  setColor(LABEL_CLR);
  doc.text("ETIQUETA DE DESPACHO", pageW - M - 4, y, { align: "right", charSpace: 0.5 });

  // Payment type badge
  const isDestino = paymentType === "Pago en Destino";
  const badgeColor = isDestino ? [200, 244, 0] : [230, 230, 230];
  const badgeTxtColor = isDestino ? [20, 20, 20] : [100, 100, 100];
  const badgeLabel = paymentType.toUpperCase();
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  const CHAR_SP = 0.5;
  const badgeW = doc.getTextWidth(badgeLabel) + badgeLabel.length * CHAR_SP + 8;
  const badgeX = pageW / 2 - badgeW / 2;
  y += 4;
  setFill(badgeColor);
  doc.roundedRect(badgeX, y - 3.2, badgeW, 4.5, 1, 1, "F");
  setColor(badgeTxtColor);
  doc.text(badgeLabel, badgeX + badgeW / 2, y, { align: "center", charSpace: CHAR_SP });
  y += 2;

  // thin separator
  y += 3;
  setDraw(LIGHT_SEP);
  doc.setLineWidth(0.25);
  doc.line(M, y, pageW - M, y);

  y += 6;

  // ── 3. SECTION HEADERS ───────────────────────────────────────────────────────
  const lx = M;
  const rx = divX + 4;

  // "REMITENTE" label + underline
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(NAVY);
  doc.text("REMITENTE", lx, y, { charSpace: 1.5 });
  const remW = doc.getTextWidth("REMITENTE") + 6;
  setDraw(NAVY);
  doc.setLineWidth(0.6);
  doc.line(lx, y + 1.5, lx + remW, y + 1.5);

  // "DESTINATARIO" label + underline
  doc.text("DESTINATARIO", rx, y, { charSpace: 1.5 });
  const destW = doc.getTextWidth("DESTINATARIO") + 6;
  doc.line(rx, y + 1.5, rx + destW, y + 1.5);

  y += 6;

  // ── 4. DATA COLUMNS ──────────────────────────────────────────────────────────

  const LABEL_W = 22;
  const ROW_H   = 6.2;

  const drawField = (label, value, x, fy, maxW) => {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    setColor(LABEL_CLR);
    doc.text(label.toUpperCase(), x, fy, { charSpace: 0.2 });

    doc.setFont("helvetica", "normal");
    setColor(BLACK);
    const val   = value ? String(value) : "—";
    const lines = doc.splitTextToSize(val, maxW - LABEL_W - 2);
    doc.text(lines[0] || val, x + LABEL_W, fy);

    setDraw(LIGHT_SEP);
    doc.setLineWidth(0.18);
    doc.line(x, fy + 1.8, x + maxW, fy + 1.8);

    return lines.length > 1 ? ROW_H + (lines.length - 1) * 4 : ROW_H;
  };

  const startY = y;
  let leftY  = startY;
  let rightY = startY;

  leftY  += drawField("Nombre", sender.name, lx, leftY, colW);
  leftY  += drawField("DNI",    sender.dni,  lx, leftY, colW);
  leftY  += drawField("Ciudad", address.city, lx, leftY, colW);
  leftY  += drawField("Cód. Postal", address.zip, lx, leftY, colW);
  leftY  += drawField("Tel",    sender.tel,  lx, leftY, colW);

  rightY += drawField("Nombre",     recipient.name,     rx, rightY, colW);
  rightY += drawField("DNI",        recipient.dni,      rx, rightY, colW);
  rightY += drawField("Cód. Postal",recipient.zip,      rx, rightY, colW);
  rightY += drawField("Provincia",  recipient.province, rx, rightY, colW);
  rightY += drawField("Localidad",  recipient.city,     rx, rightY, colW);
  rightY += drawField("Dirección",  recipient.street,   rx, rightY, colW);
  rightY += drawField("Tel",        recipient.phone,    rx, rightY, colW);
  rightY += drawField("Mail",       recipient.email,    rx, rightY, colW);

  // Vertical divider between columns
  const colBodyH = Math.max(leftY, rightY) - startY + 2;
  setDraw([220, 220, 220]);
  doc.setLineWidth(0.25);
  doc.line(divX, startY - 5, divX, startY + colBodyH);

  y = Math.max(leftY, rightY) + 5;

  // ── 5. SECTION SEPARATOR ─────────────────────────────────────────────────────
  setDraw(LIGHT_SEP);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageW - M, y);
  y += 6;

  // ── 6. DETALLE LABEL ─────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(NAVY);
  doc.text("DETALLE DE LA VENTA", M, y, { charSpace: 1.5 });
  y += 7;

  // ── 7. TABLE ─────────────────────────────────────────────────────────────────
  const prodW    = pageW - M * 2 - 24;
  const cantColX = M + prodW;

  // Header row
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  setColor(LABEL_CLR);
  doc.text("PRODUCTO", M, y, { charSpace: 0.8 });
  doc.text("CANTIDAD", cantColX + 2, y, { charSpace: 0.8 });

  setDraw(LIGHT_SEP);
  doc.setLineWidth(0.25);
  doc.line(M, y + 2, pageW - M, y + 2);
  y += 6;

  // Rows — min 10
  const ROW_TABLE = 7;
  const TOTAL_ROWS = Math.max(items.length, 10);

  for (let i = 0; i < TOTAL_ROWS; i++) {
    const item = items[i];
    if (item) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      setColor(BLACK);
      const trunc = doc.splitTextToSize(item.name || "", prodW - 2);
      doc.text(trunc[0], M, y);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.quantity ?? ""), cantColX + 12, y, { align: "center" });
    }
    setDraw(LIGHT_SEP);
    doc.setLineWidth(0.18);
    doc.line(M, y + 2, pageW - M, y + 2);
    y += ROW_TABLE;
  }

  // Table outer border
  const tableTop = y - ROW_TABLE * TOTAL_ROWS - 10;
  setDraw([200, 200, 200]);
  doc.setLineWidth(0.3);
  doc.rect(M, tableTop, pageW - M * 2, ROW_TABLE * TOTAL_ROWS + 10, "S");
  // Vertical divider
  doc.line(cantColX, tableTop, cantColX, tableTop + ROW_TABLE * TOTAL_ROWS + 10);

  // ── 8. FOOTER ────────────────────────────────────────────────────────────────
  y += 6;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  setColor(LABEL_CLR);
  doc.text("genesisairsoft.com.ar", pageW / 2, y, { align: "center", charSpace: 0.3 });

  const safeName = (recipient.name || "destinatario")
    .trim().toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const d = new Date();
  const dateStr = `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
  doc.save(`etiqueta-${safeName}-${dateStr}.pdf`);
}
