/**
 * Shared reveal animation utility.
 *
 * NOTE: The .reveal CSS class and its animation are defined globally in
 * BaseLayout.astro. The IntersectionObserver wiring is done inline in each
 * page's <script> block since Astro does not support shared client scripts
 * across pages without a bundler import.
 *
 * This file is kept as a reference / for potential future use with
 * Astro's client:load directive or a shared island component.
 *
 * Usage in any page script:
 *   const observer = new IntersectionObserver(
 *     (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
 *     { threshold: 0.1 }
 *   );
 *   document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
 */
export function initReveal(threshold = 0.1): void {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
    { threshold }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
