(function(){
  // Pricing / Profit pure helpers
  const FEE_DEFAULT = 0.02;
  function parsePrice(str){
    if(!str) return null;
    return parseFloat(String(str).replace(/[^0-9.]/g,'') || '');
  }
  function breakEven(buy, fee = FEE_DEFAULT){
    if(buy == null) return null;
    return buy * (1 + fee);
  }
  function expectedProfit(saleValue, buy, fee = FEE_DEFAULT){
    const be = breakEven(buy, fee);
    if(be == null || saleValue == null) return null;
    return saleValue - be;
  }
  function profitColor(profit){
    if(profit == null) return '#888';
    return profit >= 0 ? '#4CAF50' : '#F44336';
  }
  // Expose globally
  window.CSFlipPricing = { parsePrice, breakEven, expectedProfit, profitColor, FEE_DEFAULT };
})();
