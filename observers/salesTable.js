(function(){
  /** Sales table observation & stats application */
  const Pricing = window.CSFlipPricing;
  const Sales = window.CSFlipSales;
  const UI = window.CSFlipUI;
  const SalesCache = Sales?.SalesCache;
  const resolveItemKey = window.CSFlipItemKey?.resolveItemKey;
  const S = window.CSFlipSelectors || {};

  let salesObserver = null;
  let salesUpdateScheduled = false;
  let lastSignature = '';

  function applySalesStats(force=false){
  const currentItemKey = resolveItemKey(document.querySelector(S.DIALOG || '.mat-mdc-dialog-container, .mat-dialog-container'));
    if (!currentItemKey){ salesUpdateScheduled = false; return; }
  const dialog = document.querySelector(S.DIALOG || '.mat-mdc-dialog-container, .mat-dialog-container');
  const priceNodes = dialog ? Array.from(dialog.querySelectorAll(S.SALES_TABLE_CELL || 'td.mat-column-price .price')) : [];
    const prices = priceNodes.map(n=>Pricing.parsePrice(n.textContent.trim())).filter(v=>v);
    const signature = Sales.generateSignature(prices);
    if (!force && signature === lastSignature && SalesCache.has(currentItemKey)) { salesUpdateScheduled = false; return; }
    lastSignature = signature;
    const stats = Sales.computeDomSalesStats();
    if (!stats){ SalesCache.invalidate(currentItemKey); salesUpdateScheduled = false; return; }
    SalesCache.set(currentItemKey, stats);
    const boxes = document.querySelectorAll(`.flip-helper-box[data-item-key="${currentItemKey}"]`);
    boxes.forEach(box => {
      // derive buy price from associated price row
      let priceRow = box.previousElementSibling;
      if (!(priceRow && priceRow.classList?.contains((S.PRICE_ROW||'.price-row').replace('.','')))){
        priceRow = box.__sourcePriceRow;
        if (!priceRow){
          let prev = box.previousElementSibling;
          while(prev){
            if (prev.classList?.contains((S.PRICE_ROW||'.price-row').replace('.',''))) { priceRow = prev; break; }
            prev = prev.previousElementSibling;
          }
        }
      }
      const priceEl = priceRow?.querySelector?.(S.PRICE_CELL || '.price');
      if (!priceEl) return;
      const buyPrice = Pricing.parsePrice(priceEl.textContent.trim());
      if (!buyPrice) return;
      UI.updateStatsSection(box, buyPrice, Pricing.FEE_DEFAULT);
    });
    salesUpdateScheduled = false;
  }

  function scopeSalesObserver(){
  const salesTable = document.querySelector(S.TABLE_GENERIC || 'table, .mat-mdc-table');
    if (salesTable){
      salesObserver.disconnect();
      salesObserver.observe(salesTable, { childList: true, subtree: true });
    }
  }

  function initSalesObserver(){
    if (salesObserver) return;
    salesObserver = new MutationObserver(()=>{
      if (!salesUpdateScheduled){
        salesUpdateScheduled = true;
        requestAnimationFrame(()=>applySalesStats(false));
      }
    });
    salesObserver.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', e => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      if (target.textContent?.trim() === 'Latest Sales'){
        setTimeout(()=>{ scopeSalesObserver(); applySalesStats(true); }, 250);
      }
    });
  }

  function destroySalesObserver(){
    salesObserver?.disconnect();
    salesObserver = null;
  }

  window.CSFlipObservers = window.CSFlipObservers || {};
  window.CSFlipObservers.salesTable = { initSalesObserver, destroySalesObserver, applySalesStats };
})();
