/**
 * GSAP Animation presets for Simple Cube website
 * Used with ScrollTrigger for scroll-based animations
 */

export const animationPresets = {
  fadeUp: {
    from: { opacity: 0, y: 60 },
    to: { opacity: 1, y: 0, duration: 1, ease: 'power3.out' },
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 1.2, ease: 'power2.out' },
  },
  slideLeft: {
    from: { opacity: 0, x: 100 },
    to: { opacity: 1, x: 0, duration: 1, ease: 'power3.out' },
  },
  slideRight: {
    from: { opacity: 0, x: -100 },
    to: { opacity: 1, x: 0, duration: 1, ease: 'power3.out' },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' },
  },
  textReveal: {
    from: { opacity: 0.15 },
    to: { opacity: 1, duration: 0.8, ease: 'none' },
  },
} as const;

export type AnimationPreset = keyof typeof animationPresets;
