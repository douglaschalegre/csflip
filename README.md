# CSFlip – CSFloat Flip Helper Extension

CSFlip enhances the CSFloat item listing and dialog views by injecting a "Flip Helper" box next to each price row. It provides immediate profitability insights based on recent sale data and allows manual custom buy price experimentation.

## ✨ Features
- Automatic Flip Helper injection when price rows enter the viewport (IntersectionObserver).
- Live sales stats (min / max / average / median) parsed directly from the "Latest Sales" dialog (no extra API calls).
- Expected profit calculations (after 2% fee) for average and median sale prices.
- Inline custom buy price input with dynamic break-even and profit recalculation.
- Intelligent item key extraction supporting dialog and listing contexts without cross-item contamination.
- Performance-safe DOM observation using MutationObserver + requestAnimationFrame throttling.
- Caching of per-item sales stats to avoid recomputation when data unchanged.

## 📂 Current File Layout
```
content.js      # Main content script (logic, observers, UI injection)
style.css       # (Optional future) central stylesheet for flip box classes
manifest.json   # Chrome extension manifest
context.md      # Refactor & maintainability plan
README.md       # This documentation
```

## 🧠 Architecture Overview
Key components inside `content.js`:
- parsePrice: Normalizes price strings to numbers.
- extractItemKey: Resolves a stable key ("ItemName|Condition") via dialog or listing DOM structure.
- computeDomSalesStats: Reads the Latest Sales table, aggregates stats, and returns summary object.
- injectFlipBox: Creates and inserts the flip helper UI next to a price row.
- applySalesStats: Applies (or refreshes) cached sales stats to all matching flip boxes for the current dialog item.
- Observers:
  - IntersectionObserver for lazy injection of flip boxes as rows appear.
  - MutationObserver for discovering newly added price rows.
  - MutationObserver scoped to sales table for updating stats.

## 🔄 Data Flow
1. Price rows appear → registered and observed.
2. Row enters viewport → `injectFlipBox` runs.
3. User opens "Latest Sales" → sales table populates → `applySalesStats` computes and caches stats.
4. Matching flip boxes update their dynamic section without losing custom input state.
5. User modifies custom buy price → dynamic section recomputes profitability locally.

## 🛡️ Performance & Safety
- Sales updates are throttled (single rAF per mutation burst).
- Signature hashing prevents redundant stat recomputation when sales data unchanged.
- Key scoping avoids cross-item pollution by distinguishing dialog vs listing contexts.

## 🧪 Edge Cases Handled
- Missing item key at initial injection (retry with delayed resolution).
- Dialog structure changes introducing intermediary elements (robust traversal to find price row).
- Duplicate sales info avoidance (single dynamic section source of truth).

## 🗺️ Refactor Roadmap (from `context.md`)
Planned modularization:
- /core (pricing, itemKey, salesStats)
- /ui (flipBox rendering & updates)
- /observers (row and sales table observers)
- /utils (DOM helpers, logging)
Future improvements include fee variability, persistent custom prices, multi-fee simulation, volatility indicators, and structured logging levels.

## 🚀 Installation (Development)
1. Clone repository.
2. Open Chrome → Extensions → Enable Developer Mode.
3. Click "Load unpacked" and select the project folder.
4. Navigate to CSFloat site; open an item dialog or scroll listings to see Flip Helper boxes appear.

## 🧩 Usage
- Scroll listing: Flip boxes inject as items come into view.
- Open item dialog → Click "Latest Sales" → Stats load and boxes update.
- Adjust custom buy price → Press Set → Recalculated break-even and profit numbers appear.

## 🐞 Debugging Helpers
Available on `window`:
- `__csflipGetStats()` – Returns current computed sales stats object.
- `__csflipCleanup()` – Disconnects observers.
- `__csflipRekeyBlankBoxes()` – Attempts to assign dialog key to blank boxes (legacy utility; use sparingly).

## 📌 Design Decisions
- Direct DOM parsing avoids additional API calls and keeps extension lightweight.
- rAF batching chosen over arbitrary timeouts for smoother performance under rapid DOM mutations.
- Item key normalized as "Name|Condition" to align cache lookups and prevent whitespace/key mismatch.

## 🔐 Permissions
Minimal permissions (DOM access via content script). No external requests added by CSFlip.

## 🧱 Future Enhancements (Ideas)
- Persist custom price per item (sessionStorage or sync storage).
- ROI percentage display alongside profit values.
- Color-coded trend arrows using last N sales slope.
- Optional analytics panel summarizing all visible items.

## 🤝 Contributing
Refactor will introduce modular files; please keep functions small and pure where possible. Add JSDoc for any exported helper. Run lint/tests (if added) before committing.

## 📝 License
Add a license file (e.g., MIT) if you intend to make this open-source friendly. Currently undefined.

## 💬 Feedback
Open issues or discussions in the repository to suggest new features or report edge cases.

---
Happy flipping! Let the data guide smarter buys.
