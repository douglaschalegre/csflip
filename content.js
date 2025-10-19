(()=>{
  /**
   * CSFlip Content Script Orchestrator
   * Responsibilities:
   *  - Initialize observer modules (price rows & sales table)
   *  - Expose cleanup & lightweight debug APIs
   *  - Delegate all business logic to core/ui/observer modules
   *  - Keep this file minimal (<150 lines) for maintainability
   */
  try {
    console.log('[CSFlip] Orchestrator init');

// Pricing helpers now loaded from core/pricing.js (window.CSFlipPricing)

// Sales stats & item key helpers exposed via core modules
const resolveItemKey = window.CSFlipItemKey?.resolveItemKey;

// Deprecated manual rekey helper retained as no-op for backwards compatibility
// @deprecated Use automatic key resolution in observers
window.__csflipRekeyBlankBoxes = () => {};

// computeDomSalesStats now provided by core/salesStats.js (window.CSFlipSales.computeDomSalesStats)

// (injectFlipBox moved to /observers/priceRows.js via UI helpers)

// Initialize new observer modules
window.CSFlipObservers?.priceRows?.initPriceRowObserver();
window.CSFlipObservers?.salesTable?.initSalesObserver();

// Cleanup orchestrates observer teardown
window.__csflipCleanup = () => {
  window.CSFlipObservers?.priceRows?.destroyPriceRowObserver();
  window.CSFlipObservers?.salesTable?.destroySalesObserver();
  console.log('[CSFlip] Cleanup completed');
};

// Debug API
window.__csflipGetStats = () => window.CSFlipSales.computeDomSalesStats();

// Diagnostic trigger
window.__csflipForceSalesUpdate = () => window.CSFlipObservers?.salesTable?.applySalesStats(true);

  } catch (e) {
    console.error('[CSFlip] Orchestrator error:', e);
  }
})();
