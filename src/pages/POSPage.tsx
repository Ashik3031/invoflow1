import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Monitor, Keyboard, Printer, X, Check, Loader2, User, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { useAuthStore } from '../store/useAuthStore';

interface CartItem extends Product {
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [processing, setProcessing] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');

  const tenant = useAuthStore(state => state.tenant);

  useEffect(() => {
    fetchProducts();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Barcode listener
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 3) {
          lookupBarcode(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }

      // Shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setShowCheckout(true);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setCart([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/inventory/products');
      setProducts(data);
      setPopularProducts(data.slice(0, 12));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lookupBarcode = async (code: string) => {
    try {
      const { data } = await api.get(`/inventory/product/barcode/${code}`);
      addToCart(data);
    } catch (err) {
      console.warn('Barcode not found:', code);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalGst = cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.gstRate / 100)), 0);
  const total = subtotal + totalGst;

  const generateUPI = async () => {
    const upiId = 'yourshop@upi'; // Default or from settings
    const upiLink = `upi://pay?pa=${upiId}&pn=${tenant?.shopName || 'Shop'}&am=${total.toFixed(2)}&cu=INR&tn=POS Sale`;
    try {
      const dataUrl = await QRCode.toDataURL(upiLink);
      setQrCodeData(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (paymentMode === 'upi') generateUPI();
  }, [paymentMode, total]);

  const handleCheckout = async () => {
    try {
      setProcessing(true);
      const billData = {
        customerPhone,
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
        payments: [{ mode: paymentMode, amount: total }],
        documentType: 'invoice'
      };
      
      await api.post('/billing/create', billData);
      setCart([]);
      setShowCheckout(false);
      setCustomerPhone('');
      setAmountReceived('');
      window.print(); // Trigger print dialog
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode?.includes(search) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      {/* Top bar */}
      <div className="h-20 bg-slate-900 border-b border-slate-800 flex items-center px-8 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter">POS TERMINAL</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tenant?.shopName} • COUNTER 01</p>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-12 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="Search product or scan barcode... (F2)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border-none rounded-2xl h-12 pl-14 pr-6 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operator</p>
              <p className="text-sm font-bold flex items-center gap-2">Ashik <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /></p>
           </div>
           <button onClick={() => window.history.back()} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="mb-8">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Popular Items</h3>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {loading ? (
                    Array(12).fill(0).map((_, i) => <div key={i} className="aspect-square bg-slate-900 rounded-3xl animate-pulse" />)
                ) : (search ? filteredProducts : popularProducts).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="group bg-slate-900 p-4 rounded-3xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left flex flex-col justify-between aspect-square relative overflow-hidden"
                  >
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{p.category}</p>
                        <p className="text-sm font-black leading-tight text-slate-200 group-hover:text-white line-clamp-2">{p.name}</p>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                        <p className="text-lg font-black text-indigo-400">{formatCurrency(p.price)}</p>
                        <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                           <ShoppingCart className="w-4 h-4" />
                        </div>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
          <div className="p-8 flex items-center justify-between border-b border-slate-800">
             <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-black">CART</h2>
             </div>
             <button onClick={() => setCart([])} className="text-[10px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Clear (F8)
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest">Cart is empty</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="bg-slate-800/50 p-4 rounded-3xl border border-slate-800 flex items-center gap-4">
                <div className="flex-1">
                   <p className="text-sm font-bold text-slate-200">{item.name}</p>
                   <p className="text-xs font-black text-indigo-400 mt-1">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                   <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-xl transition-colors">-</button>
                   <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                   <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-xl transition-colors">+</button>
                </div>
                <p className="text-sm font-black text-white min-w-[80px] text-right">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="p-8 bg-slate-950 border-t border-slate-800 space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                   <span>Subtotal</span>
                   <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                   <span>GST Tax</span>
                   <span>{formatCurrency(totalGst)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-white pt-2">
                   <span>Total</span>
                   <span className="text-indigo-400">{formatCurrency(total)}</span>
                </div>
             </div>

             <button 
               onClick={() => cart.length > 0 && setShowCheckout(true)}
               disabled={cart.length === 0}
               className="w-full bg-brand hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale py-6 rounded-[240px] text-white font-black text-lg shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 group"
             >
                CHECKOUT
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
             </button>
             <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">Press F4 to pay</p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-4xl rounded-[48px] border border-slate-800 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[700px]"
            >
              {/* Checkout Left */}
              <div className="w-full md:w-1/2 p-12 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
                 <div className="flex items-center justify-between mb-12">
                   <h2 className="text-3xl font-black tracking-tight">Payment</h2>
                   <button onClick={() => setShowCheckout(false)} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors">
                     <X className="w-6 h-6 text-slate-400" />
                   </button>
                 </div>

                 <div className="grid grid-cols-3 gap-4 mb-12">
                    <PaymentModeBtn mode="cash" current={paymentMode} set={setPaymentMode} icon={<Banknote className="w-6 h-6" />} label="CASH" />
                    <PaymentModeBtn mode="upi" current={paymentMode} set={setPaymentMode} icon={<QrCode className="w-6 h-6" />} label="UPI" />
                    <PaymentModeBtn mode="card" current={paymentMode} set={setPaymentMode} icon={<CreditCard className="w-6 h-6" />} label="CARD" />
                 </div>

                 <div className="space-y-6 flex-1">
                    {paymentMode === 'cash' && (
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount Received</label>
                          <input 
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            placeholder="Enter cash amount..."
                            className="w-full bg-slate-800 border-none rounded-3xl h-16 px-8 text-2xl font-black text-white focus:ring-2 focus:ring-indigo-500/50"
                          />
                          <div className="flex justify-between items-center p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                             <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Change Due</p>
                             <p className="text-3xl font-black text-emerald-400">
                                {amountReceived ? formatCurrency(Math.max(0, parseFloat(amountReceived) - total)) : formatCurrency(0)}
                             </p>
                          </div>
                       </motion.div>
                    )}

                    {paymentMode === 'upi' && (
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center justify-center flex-1 py-4">
                          <div className="p-6 bg-white rounded-[40px] mb-6 shadow-xl">
                             {qrCodeData ? <img src={qrCodeData} alt="UPI QR" className="w-48 h-48" /> : <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}
                          </div>
                          <p className="text-sm font-bold text-slate-400">Scan using Any UPI App</p>
                       </motion.div>
                    )}

                    {paymentMode === 'card' && (
                       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                          <div className="p-8 bg-slate-800/50 rounded-[40px] border border-slate-800 text-center">
                             <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                             <p className="text-lg font-black">Swipe or Insert Card</p>
                             <p className="text-xs font-bold text-slate-500 mt-2 italic">Use your card terminal to complete payment</p>
                          </div>
                       </motion.div>
                    )}
                 </div>
              </div>

              {/* Checkout Right */}
              <div className="w-full md:w-1/2 p-12 bg-slate-950/50 flex flex-col">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Order Summary</h3>
                 
                 <div className="flex-1 space-y-4 overflow-y-auto mb-10 custom-scrollbar pr-4">
                    {cart.map(item => (
                       <div key={item.id} className="flex justify-between items-center">
                          <p className="text-sm font-bold text-slate-400">{item.name} <span className="text-slate-600 ml-2">x{item.quantity}</span></p>
                          <p className="text-sm font-black">{formatCurrency(item.price * item.quantity)}</p>
                       </div>
                    ))}
                 </div>

                 <div className="pt-8 border-t border-slate-800 space-y-4">
                    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-3xl border border-slate-800">
                        <User className="w-5 h-5 text-slate-500" />
                        <input 
                           type="text"
                           placeholder="Customer Phone (Optional)"
                           value={customerPhone}
                           onChange={(e) => setCustomerPhone(e.target.value)}
                           className="bg-transparent border-none text-sm font-bold text-white placeholder:text-slate-600 focus:ring-0 w-full"
                        />
                    </div>

                    <div className="flex justify-between text-4xl font-black text-white py-4">
                       <span className="tracking-tighter">TOTAL</span>
                       <span className="text-indigo-400">{formatCurrency(total)}</span>
                    </div>

                    <button 
                      onClick={handleCheckout}
                      disabled={processing}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 py-6 rounded-[240px] text-white font-black text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {processing ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                         <>
                           <Check className="w-8 h-8" /> COMPLETE ORDER
                         </>
                       )}
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden printable bill */}
      <div className="hidden bill-print font-mono text-[10px]">
        <div className="text-center mb-4">
          <h2 className="text-sm font-bold uppercase">{tenant?.shopName}</h2>
          <p>BILLING INVOICE</p>
          <hr className="border-t border-dashed border-black my-2" />
        </div>
        <div className="flex justify-between mb-2">
          <span>Date: {new Date().toLocaleString()}</span>
        </div>
        <hr className="border-t border-dashed border-black my-2" />
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-1">Item</th>
              <th className="pb-1 text-right">Qty</th>
              <th className="pb-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {cart.map(item => (
              <tr key={item.id}>
                <td className="py-1">{item.name.slice(0, 15)}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="border-t border-dashed border-black my-2" />
        <div className="space-y-1">
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <p className="text-[8px] text-center mt-4 italic">Thank you for visiting!</p>
          <p className="text-[8px] text-center italic">GST: {tenant?.gstin || 'N/A'}</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }

        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; color: black; background: white; }
          .no-print, h1, h2, h3, h4, h5, h6, .h-20, .w-[450px], .fixed, .flex-1, .bg-slate-950, .bg-slate-900 { display: none !important; }
          .bill-print { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function PaymentModeBtn({ mode, current, set, icon, label }: any) {
  const active = current === mode;
  return (
    <button 
      onClick={() => set(mode)}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-[32px] border transition-all gap-3",
        active ? "bg-indigo-500 border-indigo-400 shadow-xl shadow-indigo-500/20 text-white" : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-750"
      )}
    >
      {icon}
      <span className="text-[10px] font-black tracking-widest">{label}</span>
    </button>
  );
}
