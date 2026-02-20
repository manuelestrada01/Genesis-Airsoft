import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import "./admin.css";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tracking Via Cargo
  const [tracking, setTracking] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  // Transfer proof
  const [proofUrl, setProofUrl] = useState("");
  const [proofMeta, setProofMeta] = useState(null); // { name, contentType, path }
  const [loadingProof, setLoadingProof] = useState(false);

  // Approve transfer
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const ref = doc(db, "orders", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setOrder(null);
          return;
        }

        const raw = snap.data();

        const normalized = {
          id: snap.id,
          ...raw,
          buyer: raw.buyer || {},
          items: Array.isArray(raw.items) ? raw.items : [],
          shipping:
            raw.shipping || {
              cost: 0,
              free: true,
              label:
                raw.buyer?.method === "pickup"
                  ? "Retiro en tienda"
                  : "No especificado",
            },
          total: Number(raw.total || 0),
          totalWithShipping: Number(raw.totalWithShipping ?? 0),
          status: raw.status || "pending",
          dispatched: !!raw.dispatched,
          trackingNumber: raw.trackingNumber || "",
          transfer: raw.transfer || null,
        };

        setOrder(normalized);
        setTracking(raw.trackingNumber || "");
      } catch (err) {
        console.error("Error cargando pedido:", err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  // ✅ Subtotal calculado desde items si order.total es 0/undefined
  const computedSubtotal = useMemo(() => {
    if (!order) return 0;

    const subtotalFromItems = (order.items || []).reduce((acc, it) => {
      const q = Number(it.quantity || 0);
      const p = Number(it.price || 0);
      return acc + q * p;
    }, 0);

    return order.total > 0 ? order.total : subtotalFromItems;
  }, [order]);

  // ✅ Shipping robusto
  const shippingCost = useMemo(() => {
    if (!order) return 0;
    const c = Number(order.shipping?.cost || 0);
    return isNaN(c) ? 0 : c;
  }, [order]);

  // ✅ Total final
  const computedTotalFinal = useMemo(() => {
    if (!order) return 0;
    const saved = Number(order.totalWithShipping || 0);
    if (saved > 0) return saved;
    return computedSubtotal + shippingCost;
  }, [order, computedSubtotal, shippingCost]);

  // ✅ Comentario
  const buyerNotes = useMemo(() => {
    if (!order) return "";
    const b = order.buyer || {};
    const value =
      b.notes ??
      b.note ??
      b.comentario ??
      b.comment ??
      b.observaciones ??
      "";
    return typeof value === "string" ? value : String(value ?? "");
  }, [order]);

  // ==========================================
  // 🔎 Detectar path/url del comprobante
  // ==========================================
  const detectedProof = useMemo(() => {
    if (!order) return null;

    const tpList = Array.isArray(order.transferProofs)
      ? order.transferProofs
      : Array.isArray(order.transfer_proofs)
      ? order.transfer_proofs
      : null;

    if (tpList?.length) {
      const first = tpList[0] || {};
      return {
        path: first.path || first.fullPath || "",
        url: first.url || "",
        name: first.name || first.fileName || "",
        contentType: first.contentType || "",
      };
    }

    const tpObj = order.transferProof || order.transfer_proof || null;
    if (tpObj) {
      return {
        path: tpObj.path || tpObj.fullPath || "",
        url: tpObj.url || "",
        name: tpObj.name || tpObj.fileName || "",
        contentType: tpObj.contentType || "",
      };
    }

    const t = order.transfer || null;
    if (t) {
      return {
        path: t.proofPath || t.path || t.storagePath || "",
        url: t.proofUrl || t.url || "",
        name: t.proofName || t.fileName || "",
        contentType: t.proofContentType || t.contentType || "",
      };
    }

    return {
      path: order.proofPath || order.transferProofPath || "",
      url: order.proofUrl || order.transferProofUrl || "",
      name: order.proofName || "",
      contentType: order.proofContentType || "",
    };
  }, [order]);

  // ==========================================
  // 📥 Cargar DownloadURL del comprobante
  // ==========================================
  useEffect(() => {
    const loadProof = async () => {
      if (!order) return;

      const path = detectedProof?.path?.trim();
      const url = detectedProof?.url?.trim();

      setProofUrl("");
      setProofMeta(null);

      if (url) {
        setProofUrl(url);
        setProofMeta({
          name: detectedProof?.name || "",
          contentType: detectedProof?.contentType || "",
          path: path || "",
        });
        return;
      }

      if (!path) return;

      try {
        setLoadingProof(true);
        const dl = await getDownloadURL(storageRef(storage, path));
        setProofUrl(dl);
        setProofMeta({
          name: detectedProof?.name || path.split("/").pop() || "",
          contentType: detectedProof?.contentType || "",
          path,
        });
      } catch (e) {
        console.error("No se pudo obtener downloadURL del comprobante:", e);
      } finally {
        setLoadingProof(false);
      }
    };

    loadProof();
  }, [order, detectedProof]);

  // ==========================================
  // ✅ Guardar tracking
  // ==========================================
  const saveTracking = async () => {
    if (!tracking.trim()) {
      alert("El número de seguimiento no puede estar vacío.");
      return;
    }

    if (!confirm("¿Guardar número de seguimiento en este pedido?")) return;

    setSavingTracking(true);

    try {
      await updateDoc(doc(db, "orders", id), {
        trackingNumber: tracking.trim(),
        dispatched: true,
      });

      setOrder((prev) => ({
        ...prev,
        trackingNumber: tracking.trim(),
        dispatched: true,
      }));

      alert("Número de seguimiento guardado correctamente ✔");
    } catch (err) {
      console.error("Error guardando seguimiento:", err);
      alert("No se pudo guardar el número de seguimiento.");
    } finally {
      setSavingTracking(false);
    }
  };

  // ==========================================
  // ✅ Aprobar transferencia
  // ==========================================
  const approveTransfer = async () => {
    if (!order) return;

    const status = String(order.status || "");
    const isTransfer =
      order.paymentType === "bank_transfer" ||
      order.paymentMethod === "bank_transfer" ||
      status.includes("transfer");

    if (!isTransfer) {
      alert("Esta orden no parece ser por transferencia.");
      return;
    }

    if (!proofUrl) {
      const ok = confirm("No se detectó comprobante (URL). ¿Querés aprobar igual?");
      if (!ok) return;
    }

    if (!confirm("¿Aprobar transferencia y marcar pedido como aprobado?")) return;

    setApproving(true);

    try {
      await updateDoc(doc(db, "orders", id), {
        status: "approved",
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        transferApprovedAt: serverTimestamp(),
      });

      setOrder((prev) => ({
        ...prev,
        status: "approved",
      }));

      alert("Transferencia aprobada ✔");
    } catch (e) {
      console.error("Error aprobando transferencia:", e);
      alert("No se pudo aprobar la transferencia.");
    } finally {
      setApproving(false);
    }
  };

  // ==========================================
  // UI helpers
  // ==========================================
  if (loading) return <p style={{ padding: 20 }}>Cargando pedido...</p>;
  if (!order) return <p style={{ padding: 20 }}>Pedido no encontrado.</p>;

  const createdAtLabel = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString()
    : "—";

  const expiresAtLabel = order.expiresAt?.toDate
    ? order.expiresAt.toDate().toLocaleString()
    : null;

  const statusLabel = String(order.status || "pending");

  const showTransferBlock =
    statusLabel.includes("transfer") ||
    order.paymentType === "bank_transfer" ||
    order.paymentMethod === "bank_transfer" ||
    !!order.transfer;

  const isApproved = statusLabel === "approved";

  const statusPillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 0.4,
    color: "#fff",
    background:
      statusLabel === "approved"
        ? "#16a34a"
        : statusLabel === "pending" || statusLabel.includes("transfer")
        ? "#f59e0b"
        : statusLabel === "rejected"
        ? "#dc2626"
        : "#64748b",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 6px 22px rgba(0,0,0,0.06)",
  };

  const sectionTitleStyle = {
    margin: 0,
    fontSize: 14,
    fontWeight: 900,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

  const fieldRow = {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
  };

  const labelStyle = { color: "#475569", fontWeight: 700, fontSize: 13 };
  const valueStyle = { color: "#0f172a", fontWeight: 700, fontSize: 13, textAlign: "right" };

  const primaryBtn = (disabled) => ({
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    opacity: disabled ? 0.6 : 1,
  });

  const ghostBtn = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 900,
  };

  const gridWrap = {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 16,
    alignItems: "start",
  };

  const rightStack = { display: "grid", gap: 16 };

  const itemsTableWrap = {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  const itemsTable = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const th = {
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#334155",
    background: "#f8fafc",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
    color: "#0f172a",
    verticalAlign: "top",
  };

  const money = (n) => Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
        className="admin-content"
        style={{ background: "#f8fafc", paddingTop: 220 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, color: "#0f172a" }}>
            Pedido <span style={{ color: "#64748b" }}>#{order.id}</span>
          </h1>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={statusPillStyle}>{statusLabel.toUpperCase()}</span>
            <span style={{ color: "#475569", fontWeight: 700, fontSize: 13 }}>
              Fecha: <span style={{ color: "#0f172a" }}>{createdAtLabel}</span>
            </span>
            <span style={{ color: "#475569", fontWeight: 700, fontSize: 13 }}>
              Envío:{" "}
              <span style={{ color: "#0f172a" }}>
                {order.buyer?.method === "pickup" ? "Retiro en tienda" : "Delivery"}
              </span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* CTA transferencia */}
          {showTransferBlock && !isApproved && (
            <button
              onClick={approveTransfer}
              disabled={approving}
              style={primaryBtn(approving)}
              title="Aprobar la transferencia y marcar como aprobado"
            >
              {approving ? "Aprobando..." : "Aprobar transferencia"}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />

      {/* Layout */}
      <div style={gridWrap}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Cliente + Dirección */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <h3 style={sectionTitleStyle}>Cliente y entrega</h3>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontWeight: 900,
                  fontSize: 12,
                  background: order.dispatched ? "#16a34a" : "#ef4444",
                  color: "#fff",
                }}
              >
                {order.dispatched ? "DESPACHADO" : "PENDIENTE"}
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={fieldRow}>
                <div style={labelStyle}>Nombre</div>
                <div style={valueStyle}>{order.buyer?.name || "—"}</div>
              </div>
              <div style={fieldRow}>
                <div style={labelStyle}>Email</div>
                <div style={valueStyle}>{order.buyer?.email || "—"}</div>
              </div>
              <div style={fieldRow}>
                <div style={labelStyle}>Teléfono</div>
                <div style={valueStyle}>{order.buyer?.phone || "—"}</div>
              </div>
              {order.buyer?.dni && (
                <div style={fieldRow}>
                  <div style={labelStyle}>DNI</div>
                  <div style={valueStyle}>{order.buyer?.dni}</div>
                </div>
              )}

              <div style={{ height: 10 }} />

              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Dirección</div>
              {order.buyer?.method === "delivery" ? (
                <div style={{ color: "#334155", fontWeight: 700, lineHeight: 1.5 }}>
                  <div>
                    {order.buyer.street} {order.buyer.number}
                  </div>
                  <div>
                    {order.buyer.city}, {order.buyer.province} (CP {order.buyer.zip})
                  </div>
                </div>
              ) : (
                <div style={{ color: "#334155", fontWeight: 700 }}>
                  <i>Retiro en tienda</i>
                </div>
              )}

              <div style={{ height: 12 }} />

              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Comentario del envío</div>
              <div style={{ whiteSpace: "pre-wrap", color: "#334155", fontWeight: 700 }}>
                {buyerNotes.trim() ? buyerNotes : "—"}
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Items</h3>
            <div style={{ height: 12 }} />

            <div style={itemsTableWrap}>
              <table style={itemsTable}>
                <thead>
                  <tr>
                    <th style={th}>Producto</th>
                    <th style={{ ...th, width: 90, textAlign: "right" }}>Cant.</th>
                    <th style={{ ...th, width: 140, textAlign: "right" }}>Unit.</th>
                    <th style={{ ...th, width: 160, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    const q = Number(item.quantity || 0);
                    const p = Number(item.price || 0);
                    const line = q * p;

                    return (
                      <tr key={i}>
                        <td style={td}>
                          <div style={{ fontWeight: 900 }}>{item.name || "Producto"}</div>
                          {item.productId && (
                            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12 }}>
                              ID: {item.productId}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 900 }}>{q}</td>
                        <td style={{ ...td, textAlign: "right" }}>${money(p)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 900 }}>${money(line)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={rightStack}>
          {/* Totales */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Totales</h3>
            <div style={{ marginTop: 12 }}>
              <div style={fieldRow}>
                <div style={labelStyle}>Subtotal</div>
                <div style={valueStyle}>${money(computedSubtotal)}</div>
              </div>

              <div style={fieldRow}>
                <div style={labelStyle}>Envío</div>
                <div style={valueStyle}>
                  {order.buyer?.method === "pickup"
                    ? "Retiro en tienda"
                    : shippingCost === 0
                    ? "Gratis"
                    : `$${money(shippingCost)}`}
                </div>
              </div>

              <div style={{ ...fieldRow, borderBottom: "none", paddingBottom: 0 }}>
                <div style={{ ...labelStyle, fontSize: 14 }}>Total final</div>
                <div style={{ ...valueStyle, fontSize: 16 }}>${money(computedTotalFinal)}</div>
              </div>
            </div>
          </div>

          {/* Transferencia */}
          {showTransferBlock && (
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h3 style={sectionTitleStyle}>Transferencia</h3>
                {expiresAtLabel && (
                  <span style={{ color: "#475569", fontWeight: 900, fontSize: 12 }}>
                    Vence: <span style={{ color: "#0f172a" }}>{expiresAtLabel}</span>
                  </span>
                )}
              </div>

              {order.transfer && (
                <div style={{ marginTop: 12, color: "#334155", fontWeight: 800, fontSize: 13, lineHeight: 1.6 }}>
                  <div><b>Banco:</b> {order.transfer.bank || "—"}</div>
                  <div><b>Alias:</b> {order.transfer.alias || "—"}</div>
                  <div><b>CVU:</b> {order.transfer.cvu || "—"}</div>
                  <div><b>Titular:</b> {order.transfer.holder || "—"}</div>
                </div>
              )}

              <div style={{ height: 12 }} />

              {loadingProof ? (
                <p style={{ margin: 0, color: "#475569", fontWeight: 800 }}>Cargando comprobante...</p>
              ) : proofUrl ? (
                <>
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      fontWeight: 900,
                      color: "#0f172a",
                      textDecoration: "underline",
                      marginBottom: 10,
                    }}
                  >
                    Ver comprobante {proofMeta?.name ? `(${proofMeta.name})` : ""}
                  </a>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#f8fafc",
                    }}
                  >
                    <iframe
                      src={proofUrl}
                      title="Comprobante de transferencia"
                      style={{ width: "100%", height: 320, border: "none", display: "block" }}
                    />
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {!isApproved && (
                      <button onClick={approveTransfer} disabled={approving} style={primaryBtn(approving)}>
                        {approving ? "Aprobando..." : "Aprobar transferencia"}
                      </button>
                    )}
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>
                      Abrir en nueva pestaña
                    </a>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, color: "#475569", fontWeight: 800 }}>
                  No hay comprobante cargado todavía.
                </p>
              )}
            </div>
          )}

          {/* Seguimiento */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Seguimiento (Via Cargo)</h3>
            <div style={{ height: 12 }} />

            <input
              type="text"
              placeholder="Ej: 999029504038"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              style={{
                padding: "10px 12px",
                width: "100%",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontWeight: 800,
                outline: "none",
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={saveTracking} disabled={savingTracking} style={primaryBtn(savingTracking)}>
                {savingTracking ? "Guardando..." : "Guardar seguimiento"}
              </button>

              {order.trackingNumber && (
                <a
                  href={`https://viacargo.com.ar/seguimiento-de-envio/${order.trackingNumber}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...ghostBtn,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Ver en Via Cargo
                </a>
              )}
            </div>

            {order.trackingNumber && (
              <div style={{ marginTop: 10, color: "#475569", fontWeight: 800, fontSize: 13 }}>
                Guardado: <span style={{ color: "#0f172a" }}>{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive tweak simple */}
      <style>{`
        @media (max-width: 980px){
          .admin-content { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
