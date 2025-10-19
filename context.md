# CSFlip Content Script Maintainability & Refactor Plan

## 1. High-Level Goals
- Improve readability by separating concerns (DOM querying, data extraction, caching, UI rendering, observers).
- Reduce duplication of logic (price parsing, break-even & profit calculations, item-key extraction patterns).
- Increase testability by encapsulating pure computations away from live DOM side-effects.
- Provide clear extension points for future features (additional fee models, multi-market comparison, persistence of custom prices).
- Enhance robustness against DOM changes (structural selectors isolated in a single mapping layer).

## 2. Current Pain Points
- Monolithic `content.js` script (~ single IIFE) combining utility, state, observers, and rendering.
- Repeated inline calculations for expected profits & color selection.
- Mixed responsibilities inside `injectFlipBox` (key resolution, markup assembly, event binding, retry logic).
- `extractItemKey` holds complex branching and fallback logic directly; hard to test or extend.
- Observer callbacks contain business logic and DOM traversal interwoven.
- Hard-coded CSS styles inline instead of a central style class or stylesheet additions.
- No abstraction for fee calculation (currently fixed 2%).

## 3. Proposed Modular Structure
```
/ csflip
  /core
    pricing.js        // parsePrice, fee model, breakEven, profit calculations
    itemKey.js        // extractItemKey and related helpers
    salesStats.js     // computeDomSalesStats, signature hashing, caching API
  /ui
    flipBox.js        // createFlipBox, updateFlipBoxDynamic, bindCustomPrice
    styles.css        // (optional) extracted styles
  /observers
    priceRows.js      // registerPriceRow, intersection observer setup
    salesTable.js     // sales observer, applySalesStats
  /utils
    dom.js            // safeQuery helpers, element guards, closest wrappers
    log.js            // structured logging & debug toggles
  content.js          // orchestrates imports and initialization
```
(Adapt paths to Chrome extension constraints; ES modules or bundle step may be needed.)

## 4. Encapsulation Targets
- Pure Functions: `computeDomSalesStats`, `breakEven(amount, fee)`, `expectedProfit(saleStat, buyPrice, fee)`.
- Data Access Layer: `getCachedStats(itemKey)`, `setCachedStats(itemKey, stats)`, `invalidateStats(itemKey)`.
- UI Layer: `renderFlipBox(buyPrice, itemKey, stats?)`, `updateStatsSection(box, stats, buyPrice)`, `applyCustomPrice(box, customPrice)`.
- Key Extraction Layer: `resolveItemKey(contextNode, { preferDialog: true })` with small focused helpers.

## 5. Refactor Steps (Incremental)
1. Extract tiny pure helpers (pricing & profit) into a small module (can be inside same file initially).
2. Replace repeated inline profit calculations with calls to the new helpers.
3. Move sales stats caching operations behind a minimal facade object, e.g. `SalesCache`.
4. Split `injectFlipBox` into: `createFlipBoxElement`, `initializeFlipBox(box, itemKey, buyPrice, stats)`.
5. Adapt `applySalesStats` to use `updateStatsSection` rather than manual string building.
6. Isolate selector strings in a constants map (e.g., `SELECTORS.priceRow = '.price-row'`).
7. Migrate key extraction logic into `itemKey.js`; content script now calls `resolveItemKey(priceRow)`. Include unit tests (if feasible via jest + jsdom).
8. Introduce a debug flag controlling `console.log` output via centralized `log.js`.
9. Move inline styles to CSS classes in `style.css`. Example: `.csflip-box`, `.csflip-buy-input`, `.csflip-apply-btn`, `.csflip-profit-positive`, `.csflip-profit-negative`.
10. Document modules with concise JSDoc blocks (inputs, outputs, edge cases).

## 6. Edge Case & Robustness Enhancements
- Fee variability: Parameterize fee instead of hard-coded 0.02; allow per-market overrides.
- Dialog absence: Ensure fallback paths always return null gracefully without logs spam.
- Async rendering races: Convert delayed retry (setTimeout 300ms) into a utility `retry(fn, { attempts, delay })` pattern.
- Custom price persistence: Use `sessionStorage` keyed by `itemKey` (optional future feature).
- Mutation noise filtering: Debounce signature computation using microtask (Promise.resolve) or rAF batching already in place—extend with a max wait threshold.

## 7. Performance Considerations
- Avoid full-table scans when signature unchanged—already implemented via signature; move logic inside `salesStats.js`.
- Cache DOM element references (e.g., dialog root) and invalidate on dialog close event.
- Consider a lightweight virtual diff for updating only changed numeric spans instead of full HTML replacement.

## 8. Logging & Diagnostics
- Introduce levels: `info`, `debug`, `warn`. User can enable verbose via a stored flag.
- Provide a `window.__csflipDump()` that returns: registered rows count, cache keys, last signature.

## 9. Testing Strategy (Optional)
- Use jsdom to test `extractItemKey` with synthetic DOM structures (dialog vs listing).
- Validate pricing helpers with edge inputs (0, NaN, big numbers, rounding behavior).
- Snapshot test `createFlipBoxElement` output for base + with stats.

## 10. Style & Consistency Guidelines
- Prefer template functions over inline backtick concatenation for complex markup: `buildStatsMarkup(stats, buyPrice)`.
- Consistent naming: verbs for actions (`injectFlipBox`, `updateStatsSection`), nouns for data structures (`salesStatsCache` -> `salesCache`).
- Keep functions under ~40 lines; break out sub-steps.
- Use early returns to minimize nesting.

## 11. Migration Plan Without Build Step
If ES modules unsupported directly in content script environment:
- Concatenate modules at build-time using a simple script, or
- Use IIFE namespaces: `const CSFlipPricing = (()=>{ ... return { parsePrice, breakEven }})();`
- Transition gradually: start with pricing & stats modules, then UI, then observers.

## 12. Future Feature Hooks
- Multi-fee simulation: show profit at 1%, 2%, 5%.
- Historical trend sparkline (needs API or stored snapshots).
- Quick action buttons (copy item key, open external price history).
- Risk indicator: color-coded based on volatility (std deviation of recent sales).

## 13. Decommission / Cleanup Strategy
- Provide `window.__csflipDestroy()` to remove all injected boxes & observers cleanly.
- Observer registration map to avoid duplicates.

## 14. Documentation Additions
- Add README section describing architecture and each module.
- Inline JSDoc for public functions exposed on window for debugging.

## 15. Acceptance Criteria For Refactor Completion
- No functional regressions (existing features still work).
- `content.js` primarily orchestrates; contains < ~200 lines.
- All profit calculation duplication removed.
- Key extraction isolated & unit tested.
- Inline styles reduced by >80%; replaced with classes.
- Logging centrally managed.

---
This plan supports incremental refactor without a hard dependency on bundlers; each step can be tested manually before moving on.
