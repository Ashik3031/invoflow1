import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ArrowLeftRight, Check, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Bill, Product } from '../../types';
import { ReturnType } from '../../types/return.types';
import api from '../../lib/api';

interface StepSelectItemsProps {
  originalBill: Bill;
  returnType: ReturnType;
  returnItems: { [productId: string]: number };
  setReturnItems: React.Dispatch<React.SetStateAction<{ [productId: string]: number }>>;
  exchangeItems: { product: Product; quantity: number }[];
  setExchangeItems: React.Dispatch<React.SetStateAction<{ product: Product; quantity: number }[]>>;
  onNext: () => void;
  onPrev: () => void;
}

export const StepSelectItems: React.FC<StepSelectItemsProps> = ({
  originalBill,
  returnType,
  returnItems,
  setReturnItems,
  exchangeItems,
  setExchangeItems,
  onNext,
  onPrev
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (returnType === 'full_return') {
      // Auto package all original items
      const initial: { [id: string]: number } = {};
      originalBill.items.forEach(item => {
        initial[item.productId] = item.quantity;
      });
      setReturnItems(initial);
    }
  }, [returnType, originalBill]);

  useEffect(() => {
    if (returnType === 'exchange') {
      fetchProducts();
    }
  }, [returnType]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await api.get('/inventory/products');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load products for exchange', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleToggleItemSelection = (productId: string, maxQty: number) => {
    setReturnItems(prev => {
      const exists = prev[productId] !== undefined;
      if (exists) {
        const next = { ...prev };
        delete next[productId];
        return next;
      } else {
        return { ...prev, [productId]: 1 };
      }
    });
  };

  const handleChangeReturnQty = (productId: string, value: number, maxQty: number) => {
    if (value < 1 || value > maxQty) return;
    setReturnItems(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Exchange Logic
  const handleAddExchangeProduct = (product: Product) => {
    setExchangeItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateExchangeQty = (id: string, delta: number, maxStock: number) => {
    setExchangeItems(prev => prev.map(item => {
      if (item.product.id === id) {
        const nextQty = item.quantity + delta;
        if (nextQty < 1 || nextQty > maxStock) return item;
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const handleRemoveExchangeItem = (id: string) => {
    setExchangeItems(prev => prev.filter(item => item.product.id !== id));
  };

  // Math Calculations
  const calculateReturnTotal = () => {
    let retSubTotal = 0;
    let retGstTotal = 0;

    originalBill.items.forEach(item => {
      const qty = returnItems[item.productId] || 0;
      if (qty > 0) {
        const base = item.price * qty;
        const gst = base * ((item.gstRate || 0) / 100);
        retSubTotal += base;
        retGstTotal += gst;
      }
    });

    return retSubTotal + retGstTotal;
  };

  const calculateExchangeTotal = () => {
    let exSubTotal = 0;
    let exGstTotal = 0;

    exchangeItems.forEach(item => {
      const base = item.product.price * item.quantity;
      const gst = base * ((item.product.gstRate || 0) / 100);
      exSubTotal += base;
      exGstTotal += gst;
    });

    return exSubTotal + exGstTotal;
  };

  const returnVal = calculateReturnTotal();
  const exchangeVal = calculateExchangeTotal();
  const priceDiff = returnVal - exchangeVal;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="step-select-items" className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Step 3 of 4: Select Items to Return or Exchange</h3>
        <p className="text-xs text-slate-500">
          {returnType === 'full_return' 
            ? 'All items are automatically selected for return.' 
            : 'Select relevant checkboxes and choose the quantity. If doing an Exchange, choose items the customer wants to take as replacement.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original items layout */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Original Invoice Items
          </div>

          <div id="original-bill-items-list" className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {originalBill.items.map((item) => {
              const selectQty = returnItems[item.productId] || 0;
              const isSelected = selectQty > 0;

              return (
                <div
                  key={item.productId}
                  className={`border rounded-2xl p-4 transition-all ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/5' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {returnType !== 'full_return' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItemSelection(item.productId, item.quantity)}
                        className="mt-1 h-4 w-4 bg-white border-slate-300 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Purchased Qty: {item.quantity} · Price: ₹{item.price.toFixed(2)} (GST: {item.gstRate}%)
                      </div>

                      {isSelected && returnType !== 'full_return' && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Return Qty</span>
                          <div className="flex items-center border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleChangeReturnQty(item.productId, selectQty - 1, item.quantity)}
                              className="p-1.5 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                              disabled={selectQty <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={selectQty}
                              min={1}
                              max={item.quantity}
                              onChange={(e) => handleChangeReturnQty(item.productId, parseInt(e.target.value) || 0, item.quantity)}
                              className="w-10 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => handleChangeReturnQty(item.productId, selectQty + 1, item.quantity)}
                              className="p-1.5 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                              disabled={selectQty >= item.quantity}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">
                        ₹{(item.price * (isSelected ? selectQty : item.quantity) * (1 + (item.gstRate || 0) / 100)).toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                        {isSelected ? 'returning' : 'purchased'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exchange Layout */}
        {returnType === 'exchange' ? (
          <div className="space-y-4 border-t lg:border-t-0 lg:border-l lg:pl-6 border-slate-200/60 animate-fadeIn">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
              Add Replacements (Exchange)
            </div>

            {/* Product search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database products to exchange..."
                className="w-full bg-slate-55 pl-9 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="border border-slate-100 rounded-xl max-h-[140px] overflow-y-auto bg-white shadow-sm divide-y divide-slate-50">
                {filteredProducts.slice(0, 5).map(prod => (
                  <div key={prod.id} className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-50 transition duration-75">
                    <div>
                      <div className="font-bold text-slate-800">{prod.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Stock: {prod.stock} · Price: ₹{prod.price.toFixed(2)} (GST: {prod.gstRate}%)
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddExchangeProduct(prod)}
                      disabled={prod.stock <= 0}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider disabled:opacity-40"
                    >
                      {prod.stock <= 0 ? 'Out of Stock' : 'Add Item'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Replacements selected */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Selected Swaps</span>
              {exchangeItems.length === 0 ? (
                <div className="text-center py-6 text-slate-300 italic text-[10.5px] border-2 border-dashed border-slate-200 rounded-xl">
                  Add exchange items by searching database products above
                </div>
              ) : (
                exchangeItems.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center bg-indigo-50/10 border border-indigo-100 p-3 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-indigo-950 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        ₹{item.product.price.toFixed(2)} ea
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 bg-white rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleUpdateExchangeQty(item.product.id, -1, item.product.stock)}
                          className="p-1 hover:bg-slate-50 text-slate-600"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateExchangeQty(item.product.id, 1, item.product.stock)}
                          className="p-1 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveExchangeItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/30 rounded-2xl p-6 border border-slate-150 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[220px]">
            <ShoppingBag className="w-12 h-12 text-slate-200" />
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Return Items</div>
            <div className="text-slate-700 font-black text-2xl">
              {Object.keys(returnItems).length} Products Selected
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Confirm values on the receipt side panel to verify tax computation correct before choosing reimbursement methods.
            </p>
          </div>
        )}
      </div>

      {/* Pricing Breakdown Card */}
      <div className="bg-indigo-950 text-white rounded-2xl p-5 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Return & Exchange Valuations</h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-indigo-200 block text-[10px] font-bold uppercase tracking-wide">Returned Value</span>
            <span className="text-lg font-black block">₹{returnVal.toFixed(2)}</span>
          </div>
          {returnType === 'exchange' && (
            <>
              <div>
                <span className="text-indigo-200 block text-[10px] font-bold uppercase tracking-wide">Swap Items Cost</span>
                <span className="text-lg font-black block">₹{exchangeVal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-indigo-200 block text-[10px] font-bold uppercase tracking-wide">Exchange Balance</span>
                {priceDiff >= 0 ? (
                  <span className="text-lg font-black text-emerald-400 block">₹{priceDiff.toFixed(2)} Due Refund</span>
                ) : (
                  <span className="text-lg font-black text-rose-300 block">₹{Math.abs(priceDiff).toFixed(2)} Collect Due</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={Object.keys(returnItems).length === 0}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-45"
        >
          Proceed to Refund Setup
        </button>
      </div>
    </div>
  );
};
