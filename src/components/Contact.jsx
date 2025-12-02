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
            <img src="/icons/whatsapp.svg" alt="WhatsApp" />
            WhatsApp
          </a>

          <a
            href="https://instagram.com/genesis_airsoft"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn instagram"
          >
            <img src="/icons/instagram.svg" alt="Instagram" />
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
