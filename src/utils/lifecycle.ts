// src/utils/lifecycle.ts
//
// Astro runs a component's <script> exactly once per full page load. With the
// ClientRouter enabled the document body is swapped without re-running those
// modules, so anything that grabbed a DOM node on first load would keep
// pointing at a discarded element.
//
// onPage() fixes that: the setup function runs on the initial load and again
// after every client-side navigation. Whatever it returns is treated as a
// teardown and runs before the next setup, so window listeners, intervals and
// engine subscriptions never stack up.
//
// Works with or without the router — before the ClientRouter exists the astro
// events simply never fire and setup runs once, exactly as it does today.

export type Teardown = () => void;

export function onPage(setup: () => Teardown | void): void {
  let teardown: Teardown | void;

  const run = () => {
    if (teardown) teardown();
    teardown = setup();
  };

  // The router also fires page-load for the very first page. We already ran
  // synchronously at module evaluation, so the first one gets skipped.
  let skipFirstEvent = true;

  run();

  document.addEventListener('astro:page-load', () => {
    if (skipFirstEvent) { skipFirstEvent = false; return; }
    run();
  });

  document.addEventListener('astro:before-swap', () => {
    if (teardown) teardown();
    teardown = undefined;
  });
}

/**
 * Collects teardown callbacks so a setup function can return one combined
 * teardown without bookkeeping at every call site.
 *
 *   onPage(() => {
 *     const off = disposer();
 *     off.add(subscribe(render));
 *     off.listen(window, 'scroll', onScroll);
 *     return off.run;
 *   });
 */
export function disposer() {
  const jobs: Teardown[] = [];

  return {
    /** Register any teardown, e.g. the unsubscribe returned by subscribe(). */
    add(job: Teardown) { jobs.push(job); },

    /** Add an event listener and remember how to remove it. */
    listen<T extends EventTarget>(
      target: T,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions,
    ) {
      target.addEventListener(type, handler, options);
      jobs.push(() => target.removeEventListener(type, handler, options));
    },

    /** setInterval that clears itself on teardown. */
    interval(handler: () => void, ms: number) {
      const id = setInterval(handler, ms);
      jobs.push(() => clearInterval(id));
      return id;
    },

    /** requestAnimationFrame loop that stops itself on teardown. */
    raf(frame: (stop: () => void) => void) {
      let id = 0;
      let stopped = false;
      const stop = () => { stopped = true; cancelAnimationFrame(id); };
      const tick = () => {
        if (stopped) return;
        frame(stop);
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      jobs.push(stop);
    },

    /** Run every registered teardown, newest first. */
    run() {
      for (let i = jobs.length - 1; i >= 0; i--) {
        try { jobs[i](); } catch { /* a failing teardown must not block the rest */ }
      }
      jobs.length = 0;
    },
  };
}
