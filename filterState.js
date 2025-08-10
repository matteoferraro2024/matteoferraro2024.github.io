
/*!
 * filterState.js — robust, single-file filter state + navigation
 * - Stores across pages in localStorage under 'licensureFilters'
 * - <button data-filter data-key="Level" data-value="Beginner" data-next="year.html">
 * - <button data-filter data-key="NAAB" data-value="S3" data-append="true">
 * - <button data-back> ← Back </button>   // pops the filter for the current page & routes to previous step
 * - <button data-clear-filters data-next="index.html">Restart</button> // clears everything, then navigates
 *
 * Include once per page:
 *   <script src="./filterState.js" defer></script>
 */
(() => {
  const STORAGE_KEY = 'licensureFilters';

  // ---------- storage helpers ----------
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };
  const write = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state || {}));
    document.dispatchEvent(new CustomEvent('filters:change', { detail: { state: state || {} } }));
  };
  const toArray = (v) => Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  const parseValue = (v) => {
    if (v == null) return v;
    const s = String(v).trim();
    if (s === '') return '';
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    try { return JSON.parse(s); } catch { return s; }
  };

  // ---------- public API ----------
  const Filters = {
    get() { return read(); },
    set(key, rawValue, { append = false, toggle = false } = {}) {
      const state = read();
      const val = parseValue(rawValue);

      if (append || toggle) {
        const list = toArray(state[key]);
        const idx = list.findIndex((x) => String(x) == String(val));
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
    remove(key) {
      const state = read();
      delete state[key];
      write(state);
      return state;
    },
    clear() { write({}); },
  };
  window.LicensureFilters = Filters;

  // ---------- flow + back behavior ----------
  const FLOWS = {
    student: ['competencies.html', 'year.html', 'tasks.html'],
    instructor: ['year.html', 'naab.html', 'tasks.html'],
    admin: ['naab.html', 'competencies.html', 'tasks.html'],
  };
  const PAGE_KEYS = {
    'index.html': 'role',
    'competencies.html': 'Competency',
    'year.html': 'Level',
    'naab.html': 'NAAB',
    'tasks.html': null, // back from tasks clears nothing by default
  };

  const getPageName = () => {
    const u = new URL(window.location.href);
    return u.pathname.split('/').pop().toLowerCase() || 'index.html';
  };
  const getRoleKey = () => {
    const s = read();
    const raw = s.role ?? s.Role ?? s.ROLE;
    return raw ? String(raw).toLowerCase() : '';
  };
  const prevInFlow = () => {
    const role = getRoleKey();
    const flow = FLOWS[role];
    if (!flow) return null;
    const page = getPageName();
    const i = flow.findIndex(p => p.toLowerCase() === page);
    if (i <= 0) return flow?.[0] || null;
    return flow[i - 1];
  };

  // ---------- event handlers ----------
  function handleFilterClick(e) {
    const el = e.currentTarget;
    const key = el.dataset.key;
    const value = el.dataset.value;
    const next = el.dataset.next;
    const append = el.dataset.append === 'true';
    const toggle = el.dataset.toggle === 'true';

    if (key) {
      Filters.set(key, value, { append, toggle });

      // accessibility / visual pressed state for multi-select buttons
      if (append || toggle) {
        const state = Filters.get();
        const list = toArray(state[key]);
        el.setAttribute('aria-pressed', list.some(v => String(v) === String(parseValue(value))) ? 'true' : 'false');
      }
    }

    // routing
    if (next) {
      window.location.href = next;
    } else if (!append && !toggle) {
      // only auto-advance on single-choice steps when next isn't explicitly given
      const go = (() => {
        const role = getRoleKey();
        const flow = FLOWS[role];
        if (!flow) return null;
        const page = getPageName();
        const i = flow.findIndex(p => p.toLowerCase() === page);
        return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
      })();
      if (go) window.location.href = go;
    }
  }

  function handleBackClick(_e) {
    // clear the filter for THIS page (if mapped)
    const page = getPageName();
    const key = PAGE_KEYS[page];
    if (key) Filters.remove(key);

    // figure out where we are in the flow
    const role = getRoleKey();
    const flow = FLOWS[role];
    if (flow) {
      const i = flow.findIndex(p => p.toLowerCase() === page);
      // If user is on the FIRST step of the flow, back should return to index and reset role
      if (i === 0) {
        Filters.remove('role');
        window.location.href = 'index.html';
        return;
      }
    }

    // Otherwise go to the previous step in flow if available
    const prev = prevInFlow();
    if (prev) window.location.href = prev;
    else window.history.back();
  }

  function handleClearAllClick(e) {
    const el = e.currentTarget;
    const next = el.dataset.next;
    Filters.clear();
    if (next) window.location.href = next;
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

    root.querySelectorAll('[data-back]').forEach(btn => {
      if (btn.__fsBoundBack) return;
      btn.__fsBoundBack = true;
      btn.addEventListener('click', handleBackClick);
      // show back button on all pages except index
      if (getPageName() === 'index.html') btn.hidden = true;
    });

    root.querySelectorAll('[data-clear-filters]').forEach(btn => {
      if (btn.__fsBoundClear) return;
      btn.__fsBoundClear = true;
      btn.addEventListener('click', handleClearAllClick);
    });
  }

  window.LicensureFiltersRebind = initBindings;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBindings());
  } else {
    initBindings();
  }
})();
