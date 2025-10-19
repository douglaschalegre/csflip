(function(){
  /** Item key resolution helpers */
  const S = window.CSFlipSelectors || {};
  function normalize(txt){
    return (txt || '').replace(/\s+/g,' ').trim();
  }

  function resolveItemKey(fromNode){
    try {
      const dialogs = Array.from(document.querySelectorAll(S.DIALOG || '.mat-mdc-dialog-container, .mat-dialog-container'));
      let scope = null;
      if (dialogs.length) {
        let dialog = fromNode?.closest?.(S.DIALOG || '.mat-mdc-dialog-container, .mat-dialog-container') || dialogs[dialogs.length - 1];
        scope = fromNode?.closest?.(S.ITEM_NAME_COMPONENT || 'app-item-name');
        if (scope && !dialog.contains(scope)) scope = null;
        if (!scope) scope = dialog.querySelector(S.ITEM_NAME_COMPONENT || 'app-item-name');
      } else {
        const card = fromNode?.closest?.('item-card') || fromNode?.closest?.(S.PRICE_ROW || '.price-row')?.closest('item-card');
        if (card) {
          scope = card.querySelector(S.ITEM_NAME_COMPONENT || 'app-item-name');
          if (!scope) {
            const nameEl = card.querySelector('.item-name');
            const condEl = card.querySelector('.subtext');
            const itemName = normalize(nameEl?.textContent);
            const condition = normalize(condEl?.textContent);
            if (itemName && condition) return `${itemName}|${condition}`;
          }
        } else {
          scope = fromNode?.closest?.(S.ITEM_NAME_COMPONENT || 'app-item-name');
        }
      }
      if (!scope) return null;
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
      console.debug('[CSFlip] resolveItemKey error', err);
      return null;
    }
  }

  window.CSFlipItemKey = { resolveItemKey };
})();
