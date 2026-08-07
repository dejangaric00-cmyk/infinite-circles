/**
 * Shared reveal animation.
 *
 * The .reveal class and its transition are defined globally in
 * BaseLayout.astro; this is the observer half.
 *
 * The block below used to sit verbatim in three page scripts, under a note
 * claiming Astro cannot share client scripts across pages. It can — every
 * component in src/ imports utils/lifecycle.ts — so the copies are gone and
 * this is the one remaining version.
 *
 * Returns its own teardown:
 *
 *   onPage(() => {
 *     const off = disposer();
 *     off.add(initReveal());
 *     return off.run;
 *   });
 */
export function initReveal(threshold = 0.1): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        // The class is never taken off again, so one sighting is enough.
        observer.unobserve(e.target);
      }
    },
    { threshold },
  );

  for (const el of document.querySelectorAll('.reveal')) observer.observe(el);

  return () => observer.disconnect();
}
