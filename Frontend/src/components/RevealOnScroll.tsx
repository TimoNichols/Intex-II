import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Adds .reveal-on-scroll--visible when the block intersects the viewport.
 * Pair with styles in LandingPage.css; no-ops to visible if reduced motion is requested.
 */
export default function RevealOnScroll({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const merged = `reveal-on-scroll${visible ? ' reveal-on-scroll--visible' : ''}${className ? ` ${className}` : ''}`.trim();

  return (
    <div ref={ref} className={merged}>
      {children}
    </div>
  );
}
