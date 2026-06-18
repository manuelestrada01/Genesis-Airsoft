import { jsPDF } from "jspdf";

export default function generateRentalContract(reservation, partida) {
  const doc = new jsPDF();
  const pricing = reservation.pricing || {};
  const user = reservation.user || {};
  const extras = reservation.extras || [];

  const horario = partida?.horario?.toDate
    ? partida.horario.toDate()
    : partida?.horario
    ? new Date(partida.horario)
    : new Date();

  const dateStr = horario.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${dateStr}`, pageWidth - margin, y, { align: "right" });

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE ALQUILER DE EQUIPAMIENTO DE AIRSOFT", pageWidth / 2, y, { align: "center" });

  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Locatario: ${user.name || "___________"}`, margin, y);
  doc.text(`DNI: ${user.dni || "_________"}`, pageWidth / 2 + 10, y);
  y += 6;
  doc.text(`Tel: ${user.phone || "_________"}`, margin, y);
  doc.text(`Email: ${user.email || "_________"}`, pageWidth / 2 + 10, y);

  y += 10;
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);

  // 1. OBJETO
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("1. OBJETO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const objText = "Ambas partes acuerdan celebrar el presente Contrato de Alquiler de Equipamiento de Airsoft bajo las siguientes cláusulas. El locador entrega en alquiler equipamiento para la práctica de airsoft. El locatario lo recibe en buen estado y se compromete a su uso responsable y devolución en iguales condiciones.";
  const objLines = doc.splitTextToSize(objText, pageWidth - margin * 2);
  doc.text(objLines, margin, y);
  y += objLines.length * 4 + 4;

  // 2. EQUIPAMIENTO SOLICITADO
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("2. EQUIPAMIENTO SOLICITADO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const baseItems = [
    "1 marcadora funcional N°: ___",
    "1 batería cargada",
    "1 cargador (magazine con 300bbs)",
    "1 par de lentes",
  ];

  baseItems.forEach((item) => {
    doc.text(`[X] ${item}`, margin + 4, y);
    y += 5;
  });

  // Extras
  if (extras.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Extras seleccionados:", margin + 4, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    extras.forEach((e) => {
      doc.text(`[X] ${e.name} / $${Number(e.price).toLocaleString("es-AR")}`, margin + 4, y);
      y += 5;
    });
  }

  // 3. RESPONSABILIDAD
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("3. RESPONSABILIDAD DEL LOCATARIO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const rules = [
    "- No se debe usar bbs del suelo u otra marca que no sea BLS.",
    "- Usar el equipo responsablemente.",
    "- Devolverlo en buen estado.",
    "- Reembolsar daños, pérdidas o robos en su totalidad.",
    "- Usar lentes protectores obligatoriamente.",
  ];

  rules.forEach((rule) => {
    doc.text(rule, margin + 4, y);
    y += 5;
  });

  // 4. PRECIO Y PAGO
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("4. PRECIO Y PAGO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(`Seña abonada (50%): $${Number(pricing.deposit || 0).toLocaleString("es-AR")}`, margin + 4, y);
  y += 5;
  doc.text(`Saldo restante: $${Number(pricing.remainingOnDay || 0).toLocaleString("es-AR")}`, margin + 4, y);
  y += 5;
  doc.text(`Total del alquiler: $${Number(pricing.totalFull || 0).toLocaleString("es-AR")}`, margin + 4, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("(Cualquier extra durante partida se deberá sumar al \"Saldo Total\")", margin + 4, y);

  // 5. Partida info
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("5. DATOS DE LA PARTIDA", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(`Lugar: ${partida?.lugar || "___________"}`, margin + 4, y);
  y += 5;
  if (partida?.direccion) {
    doc.text(`Dirección: ${partida.direccion}`, margin + 4, y);
    y += 5;
  }
  doc.text(`Fecha: ${dateStr}`, margin + 4, y);
  y += 5;
  doc.text(`Modalidad: ${partida?.modalidad || "___________"}`, margin + 4, y);

  // 6. ACEPTACIÓN
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("6. ACEPTACIÓN", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("El locatario declara haber leído, entendido y aceptado los términos del contrato.", margin + 4, y);

  y += 16;
  doc.line(margin, y, margin + 60, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;
  doc.text("Firma Locatario", margin, y);
  doc.text("Firma Locador", pageWidth / 2 + 10, y);

  y += 8;
  doc.line(margin, y, margin + 60, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;
  doc.text("Aclaración", margin, y);
  doc.text("Aclaración", pageWidth / 2 + 10, y);

  y += 8;
  doc.line(margin, y, margin + 40, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth / 2 + 50, y);
  y += 5;
  doc.text("DNI", margin, y);
  doc.text("DNI", pageWidth / 2 + 10, y);

  // Footer
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Genesis Airsoft — genesisairsoft.com.ar", pageWidth / 2, y, { align: "center" });

  // Save
  doc.save(`contrato-alquiler-${reservation.id || "genesis"}.pdf`);
}
