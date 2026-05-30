/**
 * Shared reveal animation observer.
 * Import and call initReveal() on any page that uses .reveal elements.
 * Already handles repeated calls gracefully.
 */
export function initReveal(): void {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
