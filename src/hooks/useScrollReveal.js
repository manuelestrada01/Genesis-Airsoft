import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Stagger-reveal cards or any list of elements on scroll.
 * @param {React.RefObject} containerRef - ref to parent element
 * @param {string} selector - CSS selector for children to animate
 * @param {object} opts - optional overrides
 */
export const useScrollReveal = (containerRef, selector = ".product-card", opts = {}) => {
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const els = container.querySelectorAll(selector);
    if (!els.length) return;

    const anim = gsap.from(els, {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.07,
      ease: "power2.out",
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
        once: true,
      },
      ...opts,
    });

    return () => {
      anim.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [containerRef, selector]);
};

/**
 * Simple fade-in on scroll for a single element.
 */
export const useFadeIn = (ref, opts = {}) => {
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    const anim = gsap.from(el, {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        once: true,
      },
      ...opts,
    });

    return () => {
      anim.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [ref]);
};
