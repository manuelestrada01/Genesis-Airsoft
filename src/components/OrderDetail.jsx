import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useEffect, useMemo, useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import "./OrderDetail.css";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchOrder = async () => {
    try {
      const ref = doc(db, "orders", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const raw = snap.data();

      // ============================
      // 🔒 NORMALIZACIÓN DEFENSIVA
      // ============================
      const items = Array.isArray(raw.items) ? raw.items : [];

      // Subtotal real desde items (evita subtotal 0)
      const subtotal = items.reduce(
        (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
        0
      );

      const shipping = raw.shipping || {
        cost: 0,
        free: true,
        label: raw.buyer?.method === "pickup" ? "Retiro en tienda" : "Envío",
      };

      const trackingNumber = raw.trackingNumber || raw.tracking?.number || null;

      const totalWithShipping =
        raw.totalWithShipping ?? subtotal + Number(shipping.cost || 0);

      const normalized = {
        ...raw,
        items,
        buyer: raw.buyer || {},
        shipping,
        total: subtotal,
        totalWithShipping,
        status: raw.status || "pending",
        dispatched: Boolean(raw.dispatched),
        trackingNumber,
      };

      setOrder(normalized);
    } catch (err) {
      console.error("❌ Error cargando pedido:", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ============================
  // Helpers
  // ============================
  const isTransferOrder = order?.paymentType === "bank_transfer" || order?.status === "pending_transfer";
  const canUploadProof = useMemo(() => {
    if (!order) return false;
    if (!user?.uid) return false;
    if (order.userId && order.userId !== user.uid) return false; // seguridad UI
    if (!isTransferOrder) return false;

    // Solo permitir si está pendiente de transferencia o "proof_submitted" (si querés permitir re-subir, ajustamos)
    const allowedStatuses = ["pending_transfer", "transfer_proof_submitted"];
    if (!allowedStatuses.includes(order.status)) return false;

    return true;
  }, [order, user, isTransferOrder]);

  const existingProof = order?.transferProof || null; // { url, name, uploadedAt, path, size, contentType }

  const onSelectFile = (e) => {
    setUploadError("");
    setSuccessMsg("");
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }

    // ✅ Validaciones simples (cliente)
    const maxMB = 10;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

    if (f.size > maxMB * 1024 * 1024) {
      setUploadError(`El archivo supera ${maxMB}MB.`);
      setFile(null);
      return;
    }

    if (!allowed.includes(f.type)) {
      setUploadError("Formato no permitido. Usá PDF, JPG o PNG.");
      setFile(null);
      return;
    }

    setFile(f);
  };

  const handleUploadProof = async () => {
    setUploadError("");
    setSuccessMsg("");

    if (!user?.uid) {
      setUploadError("Tenés que iniciar sesión.");
      return;
    }
    if (!order) return;
    if (!file) {
      setUploadError("Seleccioná un archivo primero.");
      return;
    }
    if (!canUploadProof) {
      setUploadError("No tenés permisos o el pedido no admite comprobante.");
      return;
    }

    try {
      setUploading(true);
      setUploadPct(0);

      // ✅ Path estable y único
      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const ts = Date.now();
      const path = `transferProofs/${id}/${user.uid}/${ts}-${safeName}`;
      const sRef = storageRef(storage, path);

      const task = uploadBytesResumable(sRef, file, {
        contentType: file.type,
      });

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploadPct(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);

      // ✅ Guardar referencia en Firestore
      const orderRef = doc(db, "orders", id);
      await updateDoc(orderRef, {
        transferProof: {
          url,
          path,
          name: file.name,
          size: file.size,
          contentType: file.type,
          uploadedAt: serverTimestamp(),
        },
        status: "transfer_proof_submitted",
        updatedAt: serverTimestamp(),
      });

      setSuccessMsg("Comprobante subido correctamente ✅");
      setFile(null);

      // refrescar orden para ver datos nuevos
      await fetchOrder();
    } catch (err) {
      console.error("❌ Error subiendo comprobante:", err);
      setUploadError("No se pudo subir el comprobante. Probá de nuevo.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  // ============================
  // STATES
  // ============================
  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: 50 }}>
        Cargando pedido...
      </p>
    );
  }

  if (!order) {
    return (
      <p style={{ textAlign: "center", marginTop: 50 }}>
        Pedido no encontrado.
      </p>
    );
  }

  const createdDate = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString()
    : "Fecha desconocida";

  const expiresDate =
    order.expiresAt?.toDate ? order.expiresAt.toDate().toLocaleString() : null;

  // ============================
  // RENDER
  // ============================
  return (
    <div className="order-detail-container">
      <button className="btn-back" onClick={() => navigate("/profile")}>
        ← Volver a mis pedidos
      </button>

      <div className="order-card-detail">
        <h2>Detalle del Pedido</h2>

        <div className="detail-row">
          <span>ID del pedido:</span>
          <strong>{id}</strong>
        </div>

        <div className="detail-row">
          <span>Fecha:</span>
          <strong>{createdDate}</strong>
        </div>

        <div className="detail-row">
          <span>Subtotal:</span>
          <strong>${order.total.toFixed(2)}</strong>
        </div>

        <div className="detail-row">
          <span>Envío:</span>
          <strong>
            {order.shipping.free
              ? order.shipping.label || "Gratis"
              : `$${Number(order.shipping.cost || 0).toFixed(2)}`}
          </strong>
        </div>

        <div className="detail-row">
          <span>Total:</span>
          <strong>${order.totalWithShipping.toFixed(2)}</strong>
        </div>

        <div className="detail-row">
          <span>Estado de pago:</span>
          <span
            className={`status-badge ${
              order.status === "approved" ? "approved" : "pending"
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* =========================== */}
        {/* 🏦 TRANSFERENCIA: INSTRUCCIONES + SUBIR COMPROBANTE */}
        {/* =========================== */}
        {isTransferOrder && (
          <div className="section">
            <h3>Instrucciones de transferencia</h3>

            {expiresDate && (
              <div className="detail-row">
                <span>Vence:</span>
                <strong>{expiresDate}</strong>
              </div>
            )}

            <div className="buyer-box">
              <p><strong>Banco:</strong> {order.transfer?.bank || "—"}</p>
              <p><strong>Alias:</strong> {order.transfer?.alias || "—"}</p>
              <p><strong>CVU:</strong> {order.transfer?.cvu || "—"}</p>
              <p><strong>Titular:</strong> {order.transfer?.holder || "—"}</p>
            </div>

            {/* ✅ Comprobante existente */}
            {existingProof?.url && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "8px 0" }}>
                  <strong>Comprobante cargado:</strong>{" "}
                  <a href={existingProof.url} target="_blank" rel="noopener noreferrer">
                    Ver archivo
                  </a>
                </p>
              </div>
            )}

            {/* ✅ Subida de comprobante (sin cambiar estética: usamos estilos inline mínimos) */}
            {canUploadProof && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={onSelectFile}
                    disabled={uploading}
                  />

                  <button
                    type="button"
                    className="tracking-btn"
                    onClick={handleUploadProof}
                    disabled={uploading || !file}
                    style={{ textDecoration: "none" }}
                  >
                    {uploading ? `Subiendo... ${uploadPct}%` : "Subir comprobante"}
                  </button>
                </div>

                {uploadError && (
                  <p className="checkout-error" style={{ marginTop: 10 }}>
                    {uploadError}
                  </p>
                )}
                {successMsg && (
                  <p style={{ marginTop: 10, color: "green" }}>
                    {successMsg}
                  </p>
                )}
              </div>
            )}

            {!canUploadProof && order.userId && user?.uid && order.userId !== user.uid && (
              <p style={{ marginTop: 10, opacity: 0.8 }}>
                Este pedido pertenece a otro usuario.
              </p>
            )}
          </div>
        )}

        {/* =========================== */}
        {/* 📦 ESTADO DEL PEDIDO */}
        {/* =========================== */}
        <div className="section">
          <h3>Estado del Pedido</h3>

          <div className="timeline">
            <div className={`step ${order.status === "approved" ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Pagado</p>
            </div>

            <div className={`step ${order.status === "approved" ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Preparando</p>
            </div>

            <div className={`step ${order.dispatched ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Despachado</p>
            </div>
          </div>
        </div>

        {/* =========================== */}
        {/* 🚚 SEGUIMIENTO VIA CARGO */}
        {/* =========================== */}
        {order.dispatched && order.trackingNumber && (
          <div className="section tracking-section">
            <h3>Seguimiento del Envío</h3>

            <div className="detail-row">
              <span>Número de seguimiento:</span>
              <strong>{order.trackingNumber}</strong>
            </div>

            <a
              href={`https://viacargo.com.ar/seguimiento-de-envio/${order.trackingNumber}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="tracking-btn"
            >
              Ver seguimiento en Via Cargo
            </a>
          </div>
        )}

        {/* =========================== */}
        {/* 🧾 ARTÍCULOS */}
        {/* =========================== */}
        <div className="section">
          <h3>Artículos</h3>
          <ul className="items-list">
            {order.items.map((item, i) => (
              <li key={i} className="item-card">
                <div>
                  <strong>{item.name || "Producto"}</strong>
                </div>
                <div>
                  {item.quantity} × ${Number(item.price).toFixed(2)}
                </div>
                <div>
                  Total: ${(item.quantity * item.price).toFixed(2)}
                </div>

                {/* ✅ si existe basePrice (transferencia), lo mostramos sin cambiar estética */}
                {item.basePrice != null && (
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    Precio base: ${Number(item.basePrice).toFixed(2)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* =========================== */}
        {/* 👤 DATOS DEL COMPRADOR */}
        {/* =========================== */}
        <div className="section">
          <h3>Datos del comprador</h3>
          <div className="buyer-box">
            <p><strong>Nombre:</strong> {order.buyer.name || "—"}</p>
            <p><strong>Email:</strong> {order.buyer.email || "—"}</p>
            <p><strong>Teléfono:</strong> {order.buyer.phone || "—"}</p>
            <p><strong>DNI:</strong> {order.buyer.dni || "—"}</p>
            <p><strong>Método:</strong> {order.buyer.method || "—"}</p>

            {order.buyer.method === "delivery" && (
              <>
                <p>
                  <strong>Dirección:</strong>{" "}
                  {order.buyer.street || ""} {order.buyer.number || ""}
                </p>
                <p><strong>Ciudad:</strong> {order.buyer.city || "—"}</p>
                <p><strong>Provincia:</strong> {order.buyer.province || "—"}</p>
                <p><strong>CP:</strong> {order.buyer.zip || "—"}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
