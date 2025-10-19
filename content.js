(()=>{
  const startTs = Date.now();
  try {
    console.log("[CSFlip] Script loading… ts="+startTs);
    console.log("CSFloat Flip Helper active ✅");

// Utility to clean a price string
function parsePrice(str) {
  if (!str) return null;
  return parseFloat(str.replace(/[^0-9.]/g, ""));
}

// Per-item cached Latest Sales stats (key: "<itemName>|<condition>")
const salesStatsCache = new Map();

function extractItemKey(fromNode) {
  try {
    const normalize = txt => (txt || '').replace(/\s+/g,' ').trim();
    // If dialog(s) exist, constrain to the dialog of the node (or topmost dialog)
    const dialogs = Array.from(document.querySelectorAll('.mat-mdc-dialog-container, .mat-dialog-container'));
    let scope = null;
    if (dialogs.length) {
      let dialog = fromNode?.closest?.('.mat-mdc-dialog-container, .mat-dialog-container') || dialogs[dialogs.length - 1];
      scope = fromNode?.closest?.('app-item-name');
      if (scope && !dialog.contains(scope)) scope = null;
      if (!scope) scope = dialog.querySelector('app-item-name');
    } else {
      // Listing view (no dialog): find the nearest item-card, then its app-item-name inside
      const card = fromNode?.closest?.('item-card') || fromNode?.closest?.('.price-row')?.closest('item-card');
      if (card) {
        scope = card.querySelector('app-item-name');
        if (!scope) {
          // Fallback: manual extraction directly from card
          const nameEl = card.querySelector('.item-name');
          const condEl = card.querySelector('.subtext');
          const itemName = normalize(nameEl?.textContent);
          const condition = normalize(condEl?.textContent);
          if (itemName && condition) return `${itemName}|${condition}`;
        }
      } else {
        // Last resort: closest app-item-name to fromNode (more local than global first)
        scope = fromNode?.closest?.('app-item-name');
      }
    }
    if (!scope) return null; 

    // Structure: app-item-name > .container > .item-name & .subtext
    const container = scope.querySelector('.container');
    if (!container) return null;
    const nameEl = container.querySelector('.item-name');
    const condEl = container.querySelector('.subtext');
    if (!nameEl || !condEl) return null;
    const itemName = normalize(nameEl.textContent);
    const condition = normalize(condEl.textContent);
    if (!itemName || !condition) return null;
    return `${itemName}|${condition}`;
  } catch (err) {
    console.debug('[CSFlip] extractItemKey error', err);
    return null;
  }
}

// Utility to reassign blank data-item-key boxes once dialog key becomes available
window.__csflipRekeyBlankBoxes = () => {
  const key = extractItemKey(document.querySelector('.mat-mdc-dialog-container, .mat-dialog-container'));
  if (!key) { console.log('[CSFlip] Rekey: no dialog item key resolved'); return; }
  let count = 0;
  document.querySelectorAll('.flip-helper-box').forEach(box => {
    if (!box.dataset.itemKey) { box.setAttribute('data-item-key', key); count++; }
  });
  console.log(`[CSFlip] Rekeyed ${count} blank box(es) to key ${key}`);
};

// Compute latest sales stats directly from DOM (Latest Sales table) without extra API calls
function computeDomSalesStats() {
  const priceNodes = document.querySelectorAll('td.mat-column-price .price');
  const prices = [];
  priceNodes.forEach(node => {
    const val = parsePrice(node.textContent.trim());
    if (val) prices.push(val);
  });
  if (!prices.length) return null;
  prices.sort((a,b)=>a-b);
  const sum = prices.reduce((a,b)=>a+b,0);
  const avg = sum / prices.length;
  const median = prices.length % 2 ? prices[(prices.length-1)/2] : (prices[prices.length/2 - 1] + prices[prices.length/2]) / 2;
  return { count: prices.length, min: prices[0], max: prices[prices.length-1], avg, median };
}

// Injects calculation box after the entire price row block
function injectFlipBox(priceEl, priceRow) {
  if (!priceEl || !priceRow) return;
  // Avoid duplicate box right after the row
  const nextSibling = priceRow.nextElementSibling;
  if (nextSibling && nextSibling.classList.contains("flip-helper-box")) return;

  const priceText = priceEl.textContent.trim();
  const buyPrice = parsePrice(priceText);
  if (!buyPrice || Number.isNaN(buyPrice)) return;

  const fee = 0.02; // 2%
  const breakEven = buyPrice * (1 + fee);

  // Resolve item key (try dialog first, then local app-item-name ancestor if outside dialog)
  let itemKey = extractItemKey(priceRow);
  const domStats = itemKey ? salesStatsCache.get(itemKey) : null;
  // Only build sales info once (will live inside .csflip-dynamic). Avoid duplication by not placing sales lines outside dynamic.
  let profitabilityHtml = '';
  if (domStats) {
    const expectedProfitAvg = domStats.avg - breakEven;
    const expectedProfitMedian = domStats.median - breakEven;
    const avgColor = expectedProfitAvg >= 0 ? '#4CAF50' : '#F44336';
    const medColor = expectedProfitMedian >= 0 ? '#4CAF50' : '#F44336';
    profitabilityHtml = `Sales (n=${domStats.count}): Min $${domStats.min.toLocaleString()} / Max $${domStats.max.toLocaleString()}<br>
      Avg: <span style="color:${avgColor}">$${expectedProfitAvg.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>
      Median: <span style="color:${medColor}">$${expectedProfitMedian.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>`;
  } else {
    profitabilityHtml = '<em>Open "Latest Sales" to load sales data</em><br>';
  }

  const box = document.createElement("div");
  box.className = "flip-helper-box";
  box.style.margin = "6px 0";
  box.setAttribute('data-item-key', itemKey || '');
  box.innerHTML = `
    <strong>💰 Flip Helper</strong><br>
    Buy:<input type="number" step="0.01" min="0" class="csflip-custom-buy" value="${buyPrice.toFixed(2)}" style="width:80px;font-size:12px;margin:0 4px;"> <button class="csflip-apply" style="font-size:11px;padding:2px 6px;cursor:pointer">Set</button><br>
    <div class="csflip-dynamic">
      Break-even (2%): $${breakEven.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br>
      ${profitabilityHtml}
    </div>
  `;

  priceRow.insertAdjacentElement("afterend", box);
  console.log("✅ Flip Helper box injected after price row");

  // Store reference for potential later dynamic update
  priceRow.__flipHelperBox = box;

  // If key was missing at injection, schedule a one-time retry to fill it (without overwriting if already set)
  if (!itemKey) {
    setTimeout(() => {
      if (box.dataset.itemKey) return; // already filled
      const retryKey = extractItemKey(priceRow) || extractItemKey(document.querySelector('.mat-mdc-dialog-container, .mat-dialog-container'));
      if (retryKey) {
        box.dataset.itemKey = retryKey;
        const cached = salesStatsCache.get(retryKey);
        if (cached) {
          // Trigger update for this single box using cached stats
          const priceEl2 = priceRow.querySelector('.price');
          if (priceEl2) {
            const buyP = parsePrice(priceEl2.textContent.trim());
            if (buyP) {
              const breakEven2 = buyP * 1.02;
              const expAvg = cached.avg - breakEven2;
              const expMed = cached.median - breakEven2;
              const avgColor2 = expAvg >= 0 ? '#4CAF50' : '#F44336';
              const medColor2 = expMed >= 0 ? '#4CAF50' : '#F44336';
              const dyn = box.querySelector('.csflip-dynamic');
              if (dyn) {
                dyn.innerHTML = `Break-even (2%): $${breakEven2.toLocaleString(undefined,{minimumFractionDigits:2})}<br>
                  Sales (n=${cached.count}): Min $${cached.min.toLocaleString()} / Max $${cached.max.toLocaleString()}<br>
                  Avg: <span style=\"color:${avgColor2}\">$${expAvg.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>
                  Median: <span style=\"color:${medColor2}\">$${expMed.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>`;
              }
            }
          }
        }
      }
    }, 300);
  }

  // Custom price application logic
  const applyBtn = box.querySelector('.csflip-apply');
  const inputEl = box.querySelector('.csflip-custom-buy');
  const dynamicEl = box.querySelector('.csflip-dynamic');
  if (applyBtn && inputEl && dynamicEl) {
    applyBtn.addEventListener('click', () => {
      const customVal = parsePrice(inputEl.value);
      if (!customVal || customVal <= 0) return;
      const breakEvenCustom = customVal * 1.02;
      const stats = itemKey ? salesStatsCache.get(itemKey) : null;
      let profitHtml = '<em>No sales stats yet</em><br>';
      if (stats) {
        const expAvg = stats.avg - breakEvenCustom;
        const expMed = stats.median - breakEvenCustom;
        const avgColor = expAvg >= 0 ? '#4CAF50' : '#F44336';
        const medColor = expMed >= 0 ? '#4CAF50' : '#F44336';
        profitHtml = `Sales (n=${stats.count}): Min $${stats.min.toLocaleString()} / Max $${stats.max.toLocaleString()}<br>
          Avg: <span style=\"color:${avgColor}\">$${expAvg.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>
          Median: <span style=\"color:${medColor}\">$${expMed.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>`;
      }
      dynamicEl.innerHTML = `Break-even (2%): $${breakEvenCustom.toLocaleString(undefined,{minimumFractionDigits:2})}<br>${profitHtml}`;
    });
  }
}

// Track rows we have registered (to avoid re-observing)
const observedRows = new WeakSet();

// IntersectionObserver: inject only when row is in viewport
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
  const row = entry.target;
  const priceEl = row.querySelector('.price');
  if (priceEl) injectFlipBox(priceEl, row);
  }
}, { root: null, threshold: 0 });

function registerPriceRow(row) {
  if (!row || observedRows.has(row)) return;
  observedRows.add(row);
  io.observe(row);
}

// MutationObserver: only look for newly added .price-row elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      // If the node itself is a price-row
      if (node.classList?.contains('price-row')) {
        registerPriceRow(node);
        continue;
      }
      // Otherwise, query its descendants (shallow scope) for price-rows
      const rows = node.querySelectorAll?.('.price-row');
      if (rows && rows.length) rows.forEach(registerPriceRow);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial scan for existing rows (might be empty if not yet rendered)
const initialRows = document.querySelectorAll('.price-row');
if (initialRows.length) {
  initialRows.forEach(registerPriceRow);
  console.log(`[CSFlip] Registered ${initialRows.length} initial price-row(s).`);
} else {
  console.log('[CSFlip] No initial price-rows found at load; will rely on mutations.');
}

// Optional: expose a cleanup if needed
window.__csflipCleanup = () => {
  observer.disconnect();
  io.disconnect();
  console.log('🧹 CSFloat Flip Helper observers disconnected');
};

// Debug API
window.__csflipGetStats = () => computeDomSalesStats();

// Throttled observer for sales table updates
let salesUpdateScheduled = false;
let lastSignature = '';
function applySalesStats(force=false) {
  // Resolve key from the dialog (source of Latest Sales) but update all boxes on page with that key
  const currentItemKey = extractItemKey(document.querySelector('.mat-mdc-dialog-container, .mat-dialog-container'));
  if (!currentItemKey) { salesUpdateScheduled = false; return; }
  // Do NOT globally assign blank boxes now; let their scheduled retry fill correct key

  // Gather prices only inside dialog for stats (avoid background noise)
  const dialog = document.querySelector('.mat-mdc-dialog-container, .mat-dialog-container');
  const priceNodes = dialog ? Array.from(dialog.querySelectorAll('td.mat-column-price .price')) : [];
  const prices = priceNodes.map(n=>parsePrice(n.textContent.trim())).filter(v=>v);
  const signature = prices.length ? prices.slice().sort((a,b)=>a-b).join(',') : '';
  if (!force && signature === lastSignature && salesStatsCache.has(currentItemKey)) { salesUpdateScheduled = false; return; }
  lastSignature = signature;
  const stats = computeDomSalesStats();
  if (!stats) { salesStatsCache.delete(currentItemKey); salesUpdateScheduled = false; return; }
  salesStatsCache.set(currentItemKey, stats);

  // Select all boxes globally that match the key
  const matchingBoxes = document.querySelectorAll(`.flip-helper-box[data-item-key="${currentItemKey}"]`);
  if (!matchingBoxes.length) { salesUpdateScheduled = false; return; }

  matchingBoxes.forEach(box => {
    // Robustly find original price-row for this box.
    let priceRow = box.previousElementSibling;
    if (!(priceRow && priceRow.classList && priceRow.classList.contains('price-row'))) {
      // Try stored reference from injection
      priceRow = box.__sourcePriceRow;
      // Or scan upward within dialog for nearest preceding .price-row
      if (!priceRow) {
        let prev = box.previousElementSibling;
        while (prev) {
          if (prev.classList?.contains('price-row')) { priceRow = prev; break; }
          prev = prev.previousElementSibling;
        }
      }
    }
    if (!priceRow || !priceRow.querySelector) return;
    const priceEl = priceRow.querySelector('.price');
    if (!priceEl) return;
    const buyPrice = parsePrice(priceEl.textContent.trim());
    if (!buyPrice) return;
    const breakEven = buyPrice * 1.02;
    const expectedProfitAvg = stats.avg - breakEven;
    const expectedProfitMedian = stats.median - breakEven;
    const avgColor = expectedProfitAvg >= 0 ? '#4CAF50' : '#F44336';
    const medColor = expectedProfitMedian >= 0 ? '#4CAF50' : '#F44336';
    let dynamic = box.querySelector('.csflip-dynamic');
    if (!dynamic) {
      dynamic = document.createElement('div');
      dynamic.className = 'csflip-dynamic';
      box.appendChild(dynamic);
    }
    dynamic.innerHTML = `Break-even (2%): $${breakEven.toLocaleString(undefined,{minimumFractionDigits:2})}<br>
      Sales (n=${stats.count}): Min $${stats.min.toLocaleString()} / Max $${stats.max.toLocaleString()}<br>
      Avg: <span style="color:${avgColor}">$${expectedProfitAvg.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>
      Median: <span style="color:${medColor}">$${expectedProfitMedian.toLocaleString(undefined,{minimumFractionDigits:2})}</span><br>`;
  });
  salesUpdateScheduled = false;
}
const salesObserver = new MutationObserver(() => {
  if (!salesUpdateScheduled) {
    salesUpdateScheduled = true;
    requestAnimationFrame(()=>applySalesStats(false));
  }
});

function attachSalesObserverScope() {
  // Attempt to narrow scope to table containing latest sales
  const salesTable = document.querySelector('table, .mat-mdc-table');
  if (salesTable) {
    salesObserver.disconnect();
    salesObserver.observe(salesTable, { childList: true, subtree: true });
    console.log('[CSFlip] Sales observer scoped to table');
  }
}

// Initial broad observe until table appears
salesObserver.observe(document.body, { childList: true, subtree: true });

// Click listener on Latest Sales button to force recompute
document.addEventListener('click', (e) => {
  const target = e.target instanceof HTMLElement ? e.target : null;
  if (!target) return;
  if (target.textContent?.trim() === 'Latest Sales') {
    // Determine item key at click time for logging
    const clickedItemKey = extractItemKey(target);
    console.log('[CSFlip] Latest Sales clicked for item key:', clickedItemKey || '(unknown)');
    // Give Angular a tick to render new rows
    setTimeout(()=>{
      const preUpdateKey = extractItemKey(document.querySelector('app-item-name'));
      console.log('[CSFlip] Applying sales stats update for item key:', preUpdateKey || '(unknown)');
      attachSalesObserverScope();
      applySalesStats(true);
    }, 250);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const rows = document.querySelectorAll('.price-row');
  rows.forEach(registerPriceRow);
  console.log(`[CSFlip] DOMContentLoaded rescan registered ${rows.length} price-row(s).`);
});

  } catch (e) {
    console.error('[CSFlip] Initialization error:', e);
  }
})();
