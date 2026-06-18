import React from "react";

export default function ReservationSummary({ pricing, extras, transferInfo, expirationMinutes }) {
  return (
    <div className="rf-summary">
      <h3 className="rf-section-title">Resumen de la reserva</h3>

      <div className="rf-summary-card">
        <div className="rf-summary-row">
          <span>Alquiler base</span>
          <span className="rf-summary-val">${Number(pricing.basePrice).toLocaleString("es-AR")}</span>
        </div>

        {extras.length > 0 && (
          <>
            <div className="rf-summary-divider" />
            <div className="rf-summary-label">Extras (se pagan el día de la partida)</div>
            {extras.map((e) => (
              <div key={e.id} className="rf-summary-row rf-summary-row--sub">
                <span>{e.name}</span>
                <span>${Number(e.price).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </>
        )}

        <div className="rf-summary-divider" />
        <div className="rf-summary-row">
          <span>Total completo</span>
          <span className="rf-summary-val">${Number(pricing.totalFull).toLocaleString("es-AR")}</span>
        </div>

        <div className="rf-summary-highlight">
          <div className="rf-summary-row">
            <span>Seña a transferir ahora (50% base)</span>
            <span className="rf-summary-deposit">${Number(pricing.deposit).toLocaleString("es-AR")}</span>
          </div>
        </div>

        <div className="rf-summary-row">
          <span>Restante día de partida</span>
          <span className="rf-summary-val">${Number(pricing.remainingOnDay).toLocaleString("es-AR")}</span>
        </div>
      </div>

      <div className="rf-transfer-card">
        <h4>Datos de transferencia</h4>
        <div className="rf-transfer-row"><span>Alias:</span><span className="rf-transfer-val">{transferInfo.alias}</span></div>
        <div className="rf-transfer-row"><span>CVU:</span><span className="rf-transfer-val">{transferInfo.cvu}</span></div>
        <div className="rf-transfer-row"><span>Titular:</span><span className="rf-transfer-val">{transferInfo.holder}</span></div>
      </div>

      <div className="rf-warning">
        Tenés <strong>{expirationMinutes} minutos</strong> para completar la transferencia después de confirmar. Si no se confirma el pago, la reserva se cancela automáticamente.
      </div>
    </div>
  );
}
