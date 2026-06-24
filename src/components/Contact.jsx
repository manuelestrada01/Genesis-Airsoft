import { useEffect, useRef } from "react";
import "./Contact.css";
import contactImg from "../assets/tactical.jpg"; // Tu imagen

export default function Contact() {
  const containerRef = useRef();

  useEffect(() => {
    const element = containerRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("show");
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="contact-section" ref={containerRef}>
      {/* Imagen izquierda */}
      <div className="contact-image">
        <img src={contactImg} alt="Contacto Genesis Airsoft" />
      </div>

      {/* Texto y formulario */}
      <div className="contact-content">
        <h2>Contacto</h2>
        <h3>Estamos para ayudarte</h3>

        <p>
          Si tenés dudas sobre productos, pedidos, envíos o querés asesoramiento
          personalizado, completá el formulario o escribinos directamente a nuestras redes.
        </p>

        {/* 🔥 LINKS DIRECTOS */}
        <div className="contact-links">
          <a
            href="https://wa.me/541130441967"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn whatsapp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.524 5.845L.057 23.884l6.194-1.624A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.37l-.36-.214-3.676.964.982-3.585-.234-.369A9.818 9.818 0 1 1 12 21.818z"/></svg>
            WhatsApp
          </a>

          <a
            href="https://instagram.com/genesis_airsoft"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn instagram"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            Instagram
          </a>
        </div>

        {/* FORMULARIO */}
                <form
        className="contact-form"
        onSubmit={async (e) => {
            e.preventDefault();

            const name = e.target.name.value;
            const email = e.target.email.value;
            const message = e.target.message.value;

            try {
            const res = await fetch(
                "https://us-central1-genesis-airsoft.cloudfunctions.net/contactForm",
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message }),
                }
            );

            if (res.ok) {
                alert("📩 ¡Mensaje enviado correctamente!");
                e.target.reset();
            } else {
                alert("❌ Error enviando mensaje. Intentalo nuevamente.");
            }
            } catch (error) {
            console.error(error);
            alert("❌ Error de conexión");
            }
        }}
        >
        <label>Nombre</label>
        <input type="text" name="name" required placeholder="Tu nombre" />

        <label>Email</label>
        <input type="email" name="email" required placeholder="tuemail@example.com" />

        <label>Mensaje</label>
        <textarea
            name="message"
            rows="4"
            required
            placeholder="Escribí tu consulta..."
        />

        <button type="submit">Enviar mensaje</button>
        </form>
      </div>
    </section>
  );
}
