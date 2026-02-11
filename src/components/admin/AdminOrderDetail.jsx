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

    // Variantes posibles (por si fuiste cambiando estructura):
    // 1) order.transferProofs: [{ path, url, name, contentType }]
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

    // 2) order.transferProof: { path/url/... }
    const tpObj = order.transferProof || order.transfer_proof || null;
    if (tpObj) {
      return {
        path: tpObj.path || tpObj.fullPath || "",
        url: tpObj.url || "",
        name: tpObj.name || tpObj.fileName || "",
        contentType: tpObj.contentType || "",
      };
    }

    // 3) order.transfer (lo que ya tenés): { proofPath, proofUrl, ... }
    const t = order.transfer || null;
    if (t) {
      return {
        path: t.proofPath || t.path || t.storagePath || "",
        url: t.proofUrl || t.url || "",
        name: t.proofName || t.fileName || "",
        contentType: t.proofContentType || t.contentType || "",
      };
    }

    // 4) campos sueltos
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

      // Si ya viene URL guardada, usala
      if (url) {
        setProofUrl(url);
        setProofMeta({
          name: detectedProof?.name || "",
          contentType: detectedProof?.contentType || "",
          path: path || "",
        });
        return;
      }

      // Si hay path, sacamos downloadURL desde Storage
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
      const ok = confirm(
        "No se detectó comprobante (URL). ¿Querés aprobar igual?"
      );
      if (!ok) return;
    }

    if (!confirm("¿Aprobar transferencia y marcar pedido como aprobado?")) return;

    setApproving(true);

    try {
      await updateDoc(doc(db, "orders", id), {
        status: "approved",
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // opcional pero útil para auditoría:
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
  // UI
  // ==========================================
  if (loading) return <p>Cargando pedido...</p>;
  if (!order) return <p>Pedido no encontrado.</p>;

  const createdAtLabel = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString()
    : "—";

  const expiresAtLabel = order.expiresAt?.toDate
    ? order.expiresAt.toDate().toLocaleString()
    : null;

  const statusLabel = order.status || "pending";

  const showTransferBlock =
    String(order.status || "").includes("transfer") ||
    order.paymentType === "bank_transfer" ||
    order.paymentMethod === "bank_transfer" ||
    !!order.transfer;

  // Estilos solo para achicar preview sin tocar tu estética global
  const previewWrapStyle = {
    marginTop: 10,
    border: "1px solid #ddd",
    borderRadius: 10,
    overflow: "hidden",
    background: "#f8f8f8",
  };

  const iframeStyle = {
    width: "100%",
    height: 380, // ✅ más chico
    border: "none",
    display: "block",
  };

  const btnStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div className="admin-content">
      <h1>Pedido #{order.id}</h1>

      <h3>Datos del Pedido</h3>
      <p>
        <strong>Fecha:</strong> {createdAtLabel}
      </p>

      <h3>Cliente</h3>
      <p>
        <strong>Nombre:</strong> {order.buyer?.name || "—"}
      </p>
      <p>
        <strong>Email:</strong> {order.buyer?.email || "—"}
      </p>
      <p>
        <strong>Teléfono:</strong> {order.buyer?.phone || "—"}
      </p>
      {order.buyer?.dni && (
        <p>
          <strong>DNI:</strong> {order.buyer.dni}
        </p>
      )}

      <h3>Dirección</h3>
      {order.buyer?.method === "delivery" ? (
        <>
          <p>
            {order.buyer.street} {order.buyer.number}
          </p>
          <p>
            {order.buyer.city}, {order.buyer.province}
          </p>
          <p>CP: {order.buyer.zip}</p>
        </>
      ) : (
        <p>
          <i>Retiro en tienda</i>
        </p>
      )}

      <h3>Comentario del envío</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {buyerNotes.trim() ? buyerNotes : "—"}
      </p>

      <h3>Estado</h3>
      <p>
        <strong>Pago:</strong>{" "}
        <span style={{ fontWeight: 800 }}>{statusLabel}</span>
      </p>

      {/* ============================= */}
      {/* ✅ BLOQUE TRANSFERENCIA */}
      {/* ============================= */}
      {showTransferBlock && (
        <>
          <h3>Comprobante</h3>

          {expiresAtLabel && (
            <p>
              <strong>Vence:</strong> {expiresAtLabel}
            </p>
          )}

          {/* Datos transferencia si existen */}
          {order.transfer && (
            <div style={{ marginBottom: 10 }}>
              <p>
                <strong>Banco:</strong> {order.transfer.bank || "—"}
              </p>
              <p>
                <strong>Alias:</strong> {order.transfer.alias || "—"}
              </p>
              <p>
                <strong>CVU:</strong> {order.transfer.cvu || "—"}
              </p>
              <p>
                <strong>Titular:</strong> {order.transfer.holder || "—"}
              </p>
            </div>
          )}

          {loadingProof ? (
            <p>Cargando comprobante...</p>
          ) : proofUrl ? (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>Archivo:</strong>{" "}
                <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                  Ver archivo {proofMeta?.name ? `(${proofMeta.name})` : ""}
                </a>
              </p>

              {/* ✅ Preview más chica */}
              <div style={previewWrapStyle}>
                <iframe
                  src={proofUrl}
                  title="Comprobante de transferencia"
                  style={iframeStyle}
                />
              </div>

              {/* ✅ Aprobar */}
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={approveTransfer}
                  disabled={approving || order.status === "approved"}
                  style={{
                    ...btnStyle,
                    opacity: approving || order.status === "approved" ? 0.6 : 1,
                  }}
                >
                  {order.status === "approved"
                    ? "Transferencia aprobada"
                    : approving
                    ? "Aprobando..."
                    : "Aprobar transferencia"}
                </button>
              </div>
            </>
          ) : (
            <p style={{ opacity: 0.8 }}>
              No hay comprobante cargado todavía.
            </p>
          )}
        </>
      )}

      <h3>Items</h3>
      <ul>
        {order.items.map((item, i) => (
          <li key={i}>
            {item.name || "Producto"} — {Number(item.quantity || 0)} × $
            {Number(item.price || 0)} = $
            {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Totales</h3>
      <p>
        <strong>Subtotal:</strong> ${computedSubtotal.toFixed(2)}
      </p>
      <p>
        <strong>Envío:</strong>{" "}
        {order.buyer?.method === "pickup"
          ? "Retiro en tienda"
          : shippingCost === 0
          ? "Gratis"
          : `$${shippingCost.toFixed(2)}`}
      </p>
      <p>
        <strong>Total final:</strong> ${computedTotalFinal.toFixed(2)}
      </p>

      <h3>Despacho</h3>
      <p>
        {order.dispatched ? (
          <span className="admin-dispatched">Despachado</span>
        ) : (
          <span className="admin-not-dispatched">Pendiente</span>
        )}
      </p>

      {/* Via Cargo */}
      <div style={{ marginTop: "30px" }}>
        <h3>Seguimiento (Via Cargo)</h3>

        <input
          type="text"
          placeholder="Ej: 999029504038"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="admin-input"
          style={{
            padding: "10px",
            width: "300px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginRight: "10px",
          }}
        />

        <button
          onClick={saveTracking}
          disabled={savingTracking}
          className="admin-save-btn"
        >
          {savingTracking ? "Guardando..." : "Guardar seguimiento"}
        </button>

        {order.trackingNumber && (
          <div style={{ marginTop: "15px" }}>
            <a
              href={`https://viacargo.com.ar/seguimiento-de-envio/${order.trackingNumber}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-track-link"
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "8px 12px",
                background: "#0077ff",
                color: "white",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Ver seguimiento en Via Cargo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
