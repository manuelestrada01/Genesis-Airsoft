import React, { useEffect, useRef, useState } from "react";
import "./Carousel.css";
import trinitymk3 from "../assets/Capturatrinity.png";
import ak74 from "../assets/ak74.png";
import atak from "../assets/atak.png";
import ar15 from "../assets/ar15.png";
import vanguard from "../assets/vanguard.png";

const Carousel = () => {
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [trinitymk3, ak74, atak, ar15, vanguard];

useEffect(() => {
  const interval = setInterval(() => {
    const nextIndex = (currentIndex + 1) % slides.length;
    setCurrentIndex(nextIndex);
    if (carouselRef.current) {
      const slideWidth = carouselRef.current.offsetWidth; // ✅ ancho real del carrusel
      carouselRef.current.scrollTo({
        left: nextIndex * slideWidth,
        behavior: "smooth",
      });
    }
  }, 5000);

  return () => clearInterval(interval);
}, [currentIndex, slides.length]);

  return (
    <div className="carousel" ref={carouselRef}>
      {slides.map((slide, index) => (
        <div className="carousel-item" key={index}>
          <img src={slide} alt={`Slide ${index + 1}`} />
        </div>
      ))}
    </div>
  );
};

export default Carousel;
