import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import "./Carousel.css";
import trinitymk3 from "../assets/Capturatrinity.png";
import ak74 from "../assets/ak74.png";
import atak from "../assets/atak.png";
import ar15 from "../assets/ar15.png";
import vanguard from "../assets/vanguard.png";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const slides = [trinitymk3, ak74, atak, ar15, vanguard];

const Carousel = () => {
  const [current, setCurrent] = useState(0);
  const animatingRef = useRef(false);
  const currentRef   = useRef(0);     // sync ref for interval/callbacks
  const slideRefs    = useRef([]);
  const intervalRef  = useRef(null);

  // Init: ensure slide 0 is visible, rest hidden — pure CSS, no GSAP conflict
  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.opacity  = i === 0 ? "1" : "0";
      el.style.zIndex   = i === 0 ? "1" : "0";
      el.style.pointerEvents = i === 0 ? "auto" : "none";
    });
  }, []);

  const goTo = useCallback((next) => {
    if (animatingRef.current) return;
    const prev = currentRef.current;
    if (next === prev) return;

    animatingRef.current = true;

    const outEl = slideRefs.current[prev];
    const inEl  = slideRefs.current[next];
    if (!outEl || !inEl) { animatingRef.current = false; return; }

    // Bring incoming on top, invisible
    gsap.set(inEl,  { opacity: 0, zIndex: 2 });
    gsap.set(outEl, { zIndex: 1 });
    inEl.style.pointerEvents = "auto";

    gsap.to(inEl, {
      opacity: 1,
      duration: 0.55,
      ease: "power2.inOut",
      onComplete: () => {
        // Hide outgoing
        gsap.set(outEl, { opacity: 0, zIndex: 0 });
        outEl.style.pointerEvents = "none";
        inEl.style.zIndex = "1";
        animatingRef.current = false;
        currentRef.current   = next;
        setCurrent(next);
      },
    });
  }, []);

  const next = useCallback(() => {
    goTo((currentRef.current + 1) % slides.length);
  }, [goTo]);

  const prev = useCallback(() => {
    goTo((currentRef.current - 1 + slides.length) % slides.length);
  }, [goTo]);

  // Auto-advance
  useEffect(() => {
    intervalRef.current = setInterval(next, 5000);
    return () => clearInterval(intervalRef.current);
  }, [next]);

  return (
    <div className="carousel-wrapper">
      <div className="carousel-track">
        {slides.map((src, i) => (
          <div
            key={i}
            className="carousel-slide"
            ref={el => slideRefs.current[i] = el}
          >
            <div
              className="carousel-slide-bg"
              style={{ backgroundImage: `url(${src})` }}
            />
            <img src={src} alt={`Slide ${i + 1}`} draggable={false} />
          </div>
        ))}
      </div>

      <button className="carousel-btn carousel-btn-prev" onClick={prev} aria-label="Anterior">
        <FaChevronLeft />
      </button>
      <button className="carousel-btn carousel-btn-next" onClick={next} aria-label="Siguiente">
        <FaChevronRight />
      </button>

      <div className="carousel-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot ${i === current ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Ir a slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
