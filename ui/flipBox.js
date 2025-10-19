(function(){
  /** Flip Box UI utilities */
  const Pricing = window.CSFlipPricing;
  const Sales = window.CSFlipSales;
  const resolveItemKey = window.CSFlipItemKey?.resolveItemKey;
  const SalesCache = Sales?.SalesCache;
  const S = window.CSFlipSelectors || {};

  function buildStatsMarkup(stats, buyPrice, fee){
    if (!buyPrice || Number.isNaN(buyPrice)) return '<em>Invalid buy price</em><br>';
    const breakEven = Pricing.breakEven(buyPrice, fee);
    if (!stats){
      return `Break-even (${(fee*100).toFixed(0)}%): $${breakEven.toLocaleString(undefined,{minimumFractionDigits:2})}<br><em>Open "Latest Sales" to load sales data</em><br>`;
    }
    const expectedProfitAvg = Pricing.expectedProfit(stats.avg, buyPrice, fee);
    const expectedProfitMedian = Pricing.expectedProfit(stats.median, buyPrice, fee);
    const avgColor = Pricing.profitColor(expectedProfitAvg);
    const medColor = Pricing.profitColor(expectedProfitMedian);
    return `Break-even (${(fee*100).toFixed(0)}%): $${breakEven.toLocaleString(undefined,{minimumFractionDigits:2})}<br>
      Sales (n=${stats.count}): Min $${stats.min.toLocaleString()} / Max $${stats.max.toLocaleString()}<br>
      Avg: <span style="color:${avgColor}">$${expectedProfitAvg.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>
      Median: <span style="color:${medColor}">$${expectedProfitMedian.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>`;
  }

  function createFlipBoxElement(buyPrice, itemKey, fee){
    const box = document.createElement('div');
    box.className = 'flip-helper-box csflip-box';
    if (itemKey) box.setAttribute('data-item-key', itemKey);
    const stats = itemKey ? SalesCache.get(itemKey) : null;
    box.innerHTML = `
      <strong>💰 Flip Helper</strong><br>
      Buy:<input type="number" step="0.01" min="0" class="csflip-custom-buy csflip-buy-input" value="${buyPrice.toFixed(2)}"> <button class="csflip-apply csflip-apply-btn">Set</button><br>
      <div class="csflip-dynamic">${buildStatsMarkup(stats, buyPrice, fee)}</div>
    `;
    return box;
  }

  function updateStatsSection(box, buyPrice, fee){
    if (!box) return;
    const itemKey = box.dataset.itemKey || resolveItemKey(box.previousElementSibling); // attempt resolution if missing
    if (itemKey && !box.dataset.itemKey) box.dataset.itemKey = itemKey;
    const stats = itemKey ? SalesCache.get(itemKey) : null;
    const dyn = box.querySelector('.csflip-dynamic');
    if (dyn){
      dyn.innerHTML = buildStatsMarkup(stats, buyPrice, fee);
    }
  }

  function bindCustomPrice(box, fee){
    const applyBtn = box.querySelector('.csflip-apply');
    const inputEl = box.querySelector('.csflip-custom-buy');
    if (!applyBtn || !inputEl) return;
    applyBtn.addEventListener('click', () => {
      const customVal = Pricing.parsePrice(inputEl.value);
      if (!customVal || customVal <= 0) return;
      updateStatsSection(box, customVal, fee);
    });
  }

  window.CSFlipUI = { createFlipBoxElement, updateStatsSection, bindCustomPrice, buildStatsMarkup };
})();
