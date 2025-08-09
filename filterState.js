/*!
 * filterState.js
 * Minimal cross-page filter state + button wiring
 * Usage:
 *   <button data-filter data-key="Level" data-value="Beginner" data-next="results.html">Beginner</button>
 *   <button data-filter data-key="NAAB" data-value="S3" data-append="true">S3</button>
 *   <button data-clear-filters>Start Over</button>
 *
 * Include once per page:
 *   <script src="./filterState.js" defer></script>
 */
(() => {
  // ---------- constants ----------
  const STORAGE_KEY = 'licensureFilters';

  // ---------- one-time migration from old key name ----------
  (function migrateOldKey() {
    try {
      const old = localStorage.getItem('filterState');
      const cur = localStorage.getItem(STORAGE_KEY);
      if (old && !cur) {
        localStorage.setItem(STORAGE_KEY, old);
        localStorage.removeItem('filterState');
      }
    } catch { /* noop */ }
  })();

  // ---------- storage (localStorage, not session) ----------
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };

  const write = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // broadcast change for listeners on the page (e.g., results rendering)
    document.dispatchEvent(new CustomEvent('filters:change', { detail: { state } }));
  };

  // ---------- helpers ----------
  const toArray = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);

  const parseValue = (v) => {
    if (v == null) return v;
    const s = String(v).trim();
    if (s === '') return '';
    if (!Number.isNaN(Number(s)) && /^\d+(\.\d+)?$/.test(s)) return Number(s);
    try { return JSON.parse(s); } catch { /* leave as string */ }
    return s;
  };

  const currentPage = () => {
    const file = location.pathname.split('/').pop() || 'index.html';
    return file.toLowerCase();
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
      state[key] = state[key].filter(v => String(v) !== String(parseValue(value)));
      write(state);
      return state;
    },

    /** Clear whole filter state */
    clear() { write({}); },

    /** Replace entire state (advanced) */
    replace(nextState) { write({ ...(nextState || {}) }); },

    /** Convenience: route based on current role */
    routeByRole(map) {
      const state = read();
      const raw = state.role ?? state.Role ?? state.ROLE;
      const role = raw ? String(raw).toLowerCase() : '';
      const target = map[role];
      if (target) window.location.href = target;
    }
  };

  // expose globally (single export)
  window.LicensureFilters = Filters;

  // ---------- role-based flows (filenames must match your site) ----------
  const FLOWS = {
    Student: ['competencies.html', 'year.html', 'tasks.html'],
    Instructor: ['year.html', 'naab.html', 'tasks.html'],
    Admin: ['naab.html', 'competencies.html', 'tasks.html'],
  };

  // Which filter key is set on each page?
  const PAGE_TO_KEY = {
    'year.html': 'Level',
    'naab.html': 'NAAB',
    'competencies.html': 'Competency',
  };

  function nextInFlow(roleRaw, page) {
    const roleKey = roleRaw
      ? String(roleRaw).toLowerCase().replace(/^\w/, c => c.toUpperCase())
      : null;
    const flow = roleKey ? FLOWS[roleKey] : null;
    if (!flow) return null;
    const i = flow.findIndex(p => p.toLowerCase() === page);
    if (i === -1) return null;
    if (i >= flow.length - 1) return flow[i]; // already last page; stay
    return flow[i + 1];
  }

  function prevInFlow(roleRaw, page) {
    const roleKey = roleRaw
      ? String(roleRaw).toLowerCase().replace(/^\w/, c => c.toUpperCase())
      : null;
    const flow = roleKey ? FLOWS[roleKey] : null;
    if (!flow) return null;
    const i = flow.findIndex(p => p.toLowerCase() === page);
    if (i === -1) return null;
    if (i <= 0) return flow[i]; // already first page; stay
    return flow[i - 1];
  }


  // ---------- click handlers ----------
  function handleFilterClick(e) {
    const el = e.currentTarget;

    const key = el.dataset.key;                 // e.g. "Level", "NAAB", "Competency", "role"
    const value = el.dataset.value;             // e.g. "Beginner", "S3", "1", "Student"
    const explicitNext = el.dataset.next;       // optional URL to navigate to
    const append = el.dataset.append === 'true';
    const toggle = el.dataset.toggle === 'true';

    if (key) {
      Filters.set(key, value, { append, toggle });

      // optional selected state styling (aria-pressed for accessibility)
      if (toggle || append) {
        const state = Filters.get();
        const list = toArray(state[key]);
        el.setAttribute(
          'aria-pressed',
          list.some(v => String(v) === String(parseValue(value))) ? 'true' : 'false'
        );
      }
    }

    // Decide where to go next:
    // Priority: data-next > computed by role+currentPage > anchor href (default)
    const state = Filters.get();
    const role = state.role ?? state.Role ?? state.ROLE;
    const cur = currentPage();

    let target = explicitNext || nextInFlow(role, cur);

    // If no target yet and it's an anchor with a real href, let the browser handle it
    if (!target && el.tagName === 'A') {
      const href = el.getAttribute('href');
      if (href && href !== '#') return; // allow default navigation
    }

    if (target) {
      e.preventDefault();              // avoid double navigation
      window.location.href = target;
    }
  }

  function handleClearClick() {
    Filters.clear();
  }

  function handleBackClick(e) {
    e.preventDefault();

    const state = Filters.get();
    const role = state.role ?? state.Role ?? state.ROLE;
    const cur = currentPage();                // e.g., "naab.html"
    const prev = prevInFlow(role, cur);       // e.g., "year.html"

    if (prev) {
      // Clear the filter key that belongs to the page we’re going back to
      const keyToClear = e.currentTarget.dataset.backKey || PAGE_TO_KEY[prev.toLowerCase()];
      if (keyToClear) {
        const s = Filters.get();
        delete s[keyToClear];  // remove that choice
        localStorage.setItem('licensureFilters', JSON.stringify(s));
        document.dispatchEvent(new CustomEvent('filters:change', { detail: { state: s } }));
      }

      if (prev !== cur) {
        window.location.href = prev;
        return;
      }
    }

    // Fallback if flow isn't known
    window.history.back();
  }


  function initBindings(root = document) {
    root.querySelectorAll('[data-filter]').forEach(btn => {
      if (btn.__fsBound) return;
      btn.__fsBound = true;
      btn.addEventListener('click', handleFilterClick);

      // initialize aria-pressed if toggle/append and already selected
      const appendOrToggle = btn.dataset.append === 'true' || btn.dataset.toggle === 'true';
      if (appendOrToggle) {
        const state = Filters.get();
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        const selected = toArray(state[key]).some(v => String(v) === String(parseValue(value)));
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
    });

    root.querySelectorAll('[data-clear-filters]').forEach(btn => {
      if (btn.__fsBoundClear) return;
      btn.__fsBoundClear = true;
      btn.addEventListener('click', handleClearClick);
    });
    root.querySelectorAll('[data-back]').forEach(btn => {
    if (btn.__fsBoundBack) return;
    btn.__fsBoundBack = true;
    btn.addEventListener('click', handleBackClick);

    // Auto-hide on the first step of the flow
    const state = Filters.get();
    const role = state.role ?? state.Role ?? state.ROLE;
    const cur = currentPage();
    const prev = prevInFlow(role, cur);
    if (!prev || prev === cur) {
      btn.classList.add('hidden'); // nothing to go back to
    }
  });
  }

  // ---------- boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBindings());
  } else {
    initBindings();
  }
})();
