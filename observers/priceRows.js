(function(){
  /** Price row observation & injection */
  const Pricing = window.CSFlipPricing;
  const UI = window.CSFlipUI;
  const resolveItemKey = window.CSFlipItemKey?.resolveItemKey;
  const S = window.CSFlipSelectors || {};

  const observedRows = new WeakSet();
  let intersectionObserver = null;
  let mutationObserver = null;

  function injectIfNeeded(row){
    if (!row || observedRows.has(row)) return;
    observedRows.add(row);
    intersectionObserver.observe(row);
  }

  function onIntersection(entries){
    for (const entry of entries){
      if (!entry.isIntersecting) continue;
      const row = entry.target;
  const priceEl = row.querySelector(S.PRICE_CELL || '.price');
      if (!priceEl) continue;
      // Delegates creation to UI module
      const priceText = priceEl.textContent.trim();
      const buyPrice = Pricing.parsePrice(priceText);
      if (!buyPrice || Number.isNaN(buyPrice)) continue;
      const fee = Pricing.FEE_DEFAULT;
      const itemKey = resolveItemKey(row);
      const box = UI.createFlipBoxElement(buyPrice, itemKey, fee);
      row.insertAdjacentElement('afterend', box);
      row.__flipHelperBox = box;
      UI.bindCustomPrice(box, fee);
      if (!itemKey){
        setTimeout(()=>{
          if (box.dataset.itemKey) return;
          const retryKey = resolveItemKey(row) || resolveItemKey(document.querySelector('.mat-mdc-dialog-container, .mat-dialog-container'));
          if (retryKey){
            box.dataset.itemKey = retryKey;
            const priceEl2 = row.querySelector('.price');
            const buyP = priceEl2 ? Pricing.parsePrice(priceEl2.textContent.trim()) : null;
            if (buyP) UI.updateStatsSection(box, buyP, fee);
          }
        },300);
      }
    }
  }

  function initPriceRowObserver(){
    if (intersectionObserver) return; // already initialized
    intersectionObserver = new IntersectionObserver(onIntersection, { root: null, threshold: 0 });
    mutationObserver = new MutationObserver(mutations => {
      for (const m of mutations){
        for (const node of m.addedNodes){
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList?.contains((S.PRICE_ROW||'.price-row').replace('.',''))) { injectIfNeeded(node); continue; }
          const rows = node.querySelectorAll?.(S.PRICE_ROW || '.price-row');
          if (rows && rows.length) rows.forEach(injectIfNeeded);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    // initial scan
    document.querySelectorAll(S.PRICE_ROW || '.price-row').forEach(injectIfNeeded);
  }

  function destroyPriceRowObserver(){
    mutationObserver?.disconnect();
    intersectionObserver?.disconnect();
    intersectionObserver = null;
    mutationObserver = null;
  }

  window.CSFlipObservers = window.CSFlipObservers || {};
  window.CSFlipObservers.priceRows = { initPriceRowObserver, destroyPriceRowObserver };
})();
