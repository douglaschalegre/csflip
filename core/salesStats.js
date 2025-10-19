(function(){
  /** Sales stats & caching facade */
  const _cache = new Map();
  const S = window.CSFlipSelectors || {};

  /**
   * Parse latest sales table prices from DOM.
   * Relies on global CSFlipPricing.parsePrice.
   * @returns {{count:number,min:number,max:number,avg:number,median:number}|null}
   */
  function computeDomSalesStats(){
  const priceNodes = document.querySelectorAll(S.SALES_TABLE_CELL || 'td.mat-column-price .price');
    const prices = [];
    priceNodes.forEach(node => {
      const v = window.CSFlipPricing.parsePrice(node.textContent.trim());
      if (v) prices.push(v);
    });
    if (!prices.length) return null;
    prices.sort((a,b)=>a-b);
    const sum = prices.reduce((a,b)=>a+b,0);
    const avg = sum / prices.length;
    const median = prices.length % 2 ? prices[(prices.length-1)/2] : (prices[prices.length/2 - 1] + prices[prices.length/2]) / 2;
    return { count: prices.length, min: prices[0], max: prices[prices.length-1], avg, median };
  }

  /** Generate a deterministic signature for a price array */
  function generateSignature(prices){
    if (!prices || !prices.length) return '';
    const sorted = prices.slice().sort((a,b)=>a-b);
    return sorted.join(',');
  }

  const SalesCache = {
    get: (key) => _cache.get(key),
    set: (key, stats) => _cache.set(key, stats),
    has: (key) => _cache.has(key),
    invalidate: (key) => _cache.delete(key),
    keys: () => Array.from(_cache.keys())
  };

  window.CSFlipSales = { computeDomSalesStats, generateSignature, SalesCache };
})();
