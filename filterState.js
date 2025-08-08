/*!
 * filterState.js
 * Minimal cross-page filter state + button wiring
 * Usage:
 *   <button data-filter data-key="Level" data-value="Beginner" data-next="results.html">Beginner</button>
 *   <button data-filter data-key="NAAB" data-value="S3" data-append="true">S3</button>
 *   <button data-clear-filters>Start Over</button>
 *
 * Include once per page:
 *   <script src="/js/filterState.js" defer></script>
 */
(() => {
  const STORE_KEY = 'licensureFilters';

  // ---------- storage ----------
  const read = () => {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  };
  const write = (state) => {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    // broadcast change for listeners on the page (e.g., results rendering)
    document.dispatchEvent(new CustomEvent('filters:change', { detail: { state } }));
  };

  // ---------- helpers ----------
  const toArray = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);

  const parseValue = (v) => {
    if (v == null) return v;
    const s = String(v).trim();
    if (s === '') return '';
    // number-like?
    if (!isNaN(s)) return Number(s);
    // try JSON (lets you pass arrays/objects as strings if needed)
    try { return JSON.parse(s); } catch { /* noop */ }
    return s;
  };

  // ---------- public API ----------
  const Filters = {
    /** Get full state object */
    get() { return read(); },

    /** Set a value (replace) or append/toggle in an array */
    set(key, value, opts = {}) {
      const { append = false, toggle = false } = opts;
      const state = read();
      const val = parseValue(value);

      if (append || toggle) {
        const list = toArray(state[key]);
        const idx = list.findIndex((x) => String(x) === String(val));

        if (toggle) {
          if (idx >= 0) list.splice(idx, 1);
          else list.push(val);
        } else if (append) {
          if (idx === -1) list.push(val);
        }

        state[key] = list;
      } else {
        state[key] = val;
      }

      write(state);
      return state;
    },

    /** Remove a single value from an array key */
    removeFromList(key, value) {
      const state = read();
      if (!Array.isArray(state[key])) return state;
      state[key] = state[key].filter(v => String(v) !== String(value));
      write(state);
      return state;
    },

    /** Clear whole filter state */
    clear() { write({}); },

    /** Replace entire state (advanced) */
    replace(nextState) { write({ ...(nextState || {}) }); },

    /** Convenience: route based on current role */
    routeByRole(map) {
      // map example: { student: 'competencies.html', instructor: 'naab.html', admin: 'naab.html' }
      const role = String((read().role || read().Role || '')).toLowerCase();
      const target = map[role];
      if (target) window.location.href = target;
    }
  };

  // expose globally
  window.LicensureFilters = Filters;

  // ---------- auto-bind buttons ----------
  function handleFilterClick(e) {
    const el = e.currentTarget;

    const key = el.dataset.key;                 // e.g. "Level", "NAAB", "Competency", "role"
    const value = el.dataset.value;             // e.g. "Beginner", "S3", "1", "Student"
    const next = el.dataset.next;               // optional URL to navigate to
    const append = el.dataset.append === 'true';
    const toggle = el.dataset.toggle === 'true';

    if (!key) return;

    Filters.set(key, value, { append, toggle });

    // optional selected state styling (aria-pressed for accessibility)
    if (toggle || append) {
      const state = Filters.get();
      const list = toArray(state[key]);
      el.setAttribute('aria-pressed', list.some(v => String(v) === String(parseValue(value))) ? 'true' : 'false');
    }

    if (next) window.location.href = next;
  }

  function handleClearClick() {
    Filters.clear();
  }

  function initBindings(root = document) {
    root.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', handleFilterClick);
      // initialize aria-pressed if toggle/append and already selected
      const append = btn.dataset.append === 'true' || btn.dataset.toggle === 'true';
      if (append) {
        const state = Filters.get();
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        const selected = toArray(state[key]).some(v => String(v) === String(parseValue(value)));
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
    });

    root.querySelectorAll('[data-clear-filters]').forEach(btn => {
      btn.addEventListener('click', handleClearClick);
    });
  }

  // ---------- boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBindings);
  } else {
    initBindings();
  }
})();
