import React from "react";
import { useParams } from "react-router-dom";

const AlquileresConstruccion = () => {
  const { zona } = useParams(); // capital | mendoza

  return (
    <div className="construction-container">
      <h1>🚧 Alquileres {zona}</h1>
      <p>Esta sección estará disponible muy pronto.</p>
    </div>
  );
};

export default AlquileresConstruccion;
