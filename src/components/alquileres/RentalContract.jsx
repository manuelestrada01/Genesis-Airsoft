import React from "react";
import generateRentalContract from "../../utils/generateRentalContract";

export default function RentalContract({ reservation, partida }) {
  const handleDownload = () => {
    generateRentalContract(reservation, partida);
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        width: "100%",
        padding: "14px",
        background: "transparent",
        border: "1px solid var(--accent, #c8f400)",
        borderRadius: "var(--radius-md, 10px)",
        color: "var(--accent, #c8f400)",
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
        marginTop: 8,
        transition: "all 0.22s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "var(--accent-dim, rgba(200,244,0,0.1))";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "transparent";
      }}
    >
      Descargar Contrato PDF
    </button>
  );
}
