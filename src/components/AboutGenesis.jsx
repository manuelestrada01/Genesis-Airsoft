import "./AboutGenesis.css";
import bannerImg from "../assets/Parts_Amazon_Banner_900x.webp"; 
// ⬆️ Ajustá la ruta según donde tengas tu imagen

export default function AboutGenesis() {
  return (
    <section className="genesis-about">
      <div className="about-image">
        <img src={bannerImg} alt="Genesis Airsoft Banner" />
      </div>

      <div className="about-text">
        <h2>Genesis Airsoft</h2>
        <h3>Pasión por la precisión. Calidad en cada detalle.</h3>

        <p>
          En <strong>Genesis Airsoft</strong> creemos que el airsoft es más que un hobby:
          es disciplina, comunidad y dedicación. Desde nuestros inicios nos propusimos
          elevar el estándar del mercado argentino ofreciendo productos de alto
          rendimiento, asesoría honesta y una experiencia de compra premium.
        </p>

        <p><strong>¿Qué nos diferencia?</strong></p>

        <ul>
          <li>Catálogo curado con las mejores marcas internacionales.</li>
          <li>Productos originales seleccionados para máximo rendimiento.</li>
          <li>Asesoramiento especializado por jugadores y técnicos reales.</li>
          <li>Compromiso total con la experiencia de compra del cliente.</li>
        </ul>

        <p>
          Nuestra misión es impulsar el crecimiento del airsoft en Argentina, construir
          comunidad y acompañar a cada jugador en su evolución. En Genesis Airsoft no solo
          vendemos réplicas: <strong>equipamos experiencias.</strong>
        </p>
      </div>
    </section>
  );
}
