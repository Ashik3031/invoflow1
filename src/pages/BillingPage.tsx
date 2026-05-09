import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Loader2, CheckCircle2, MessageSquare, Ticket, Gift, Sparkles, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { Product, Customer, LoyaltyConfig, Coupon } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [loading, setLoading] = useState(false);
  const [successBill, setSuccessBill] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, lRes, cRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/marketing/loyalty/config'),
        api.get('/marketing/coupons')
      ]);
      setProducts(pRes.data);
      setLoyaltyConfig(lRes.data);
      setCoupons(cRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhoneChange = async (val: string) => {
    setCustomer(prev => ({ ...prev, phone: val }));
    if (val.length >= 10) {
      const dbRes = await api.get('/customer/list');
      const found = dbRes.data.find((c: Customer) => c.phone === val);
      if (found) {
        setActiveCustomer(found);
        setCustomer({ name: found.name, phone: found.phone });
      } else {
        setActiveCustomer(null);
      }
    } else {
      setActiveCustomer(null);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return;
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock < 1) return;
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (selectedCoupon) {
    if (selectedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * selectedCoupon.value) / 100;
    } else {
      discountAmount = selectedCoupon.value;
    }
  }

  const pointValue = redeemPoints * (loyaltyConfig?.valuePerPoint || 0);
  const grandTotal = Math.max(0, subtotal - discountAmount - pointValue);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        customerName: customer.name,
        customerPhone: customer.phone,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        paymentStatus,
        discountAmount,
        pointsRedeemed: redeemPoints
      };
      const { data } = await api.post('/billing/create', payload);
      setSuccessBill(data);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setActiveCustomer(null);
      setSelectedCoupon(null);
      setRedeemPoints(0);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Billing failed');
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppLink = () => {
    if (!successBill) return '';
    const message = `Hi ${customer.name || 'Customer'}, your bill from Xyraco Lite is ${formatCurrency(successBill.totalAmount)}. Points Earned: ${Math.floor(successBill.totalAmount * (loyaltyConfig?.pointsPerRupee || 0))}. Thank you!`;
    const phone = customer.phone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const applyCoupon = (code: string) => {
    const coupon = coupons.find(c => c.code === code && c.active);
    if (!coupon) return alert('Invalid Coupon');
    if (subtotal < coupon.minBillAmount) return alert(`Min order ₹${coupon.minBillAmount} required`);
    setSelectedCoupon(coupon);
  };

  if (successBill) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold">Transaction Complete</h2>
          <p className="text-gray-500 mt-2">Bill No: {successBill.billNumber}</p>
          <p className="text-4xl font-black mt-4 text-slate-800">{formatCurrency(successBill.totalAmount)}</p>
        </div>
        
        {customer.phone && (
          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            <MessageSquare className="w-5 h-5" />
            WhatsApp Invoice
          </a>
        )}
        
        <button
          onClick={() => setSuccessBill(null)}
          className="w-full py-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          New Transaction
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8">
      {/* Left Selection */}
      <div className="flex-[1.8] flex flex-col gap-6 overflow-hidden">
        <div className="glass-card flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Products
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Search SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock < 1}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-left hover:border-brand hover:shadow-indigo-50 transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50"
              >
                <p className="font-bold text-slate-800 text-sm mb-1 group-hover:text-brand transition-colors">{p.name}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category}</span>
                  {p.stock < 10 && p.stock > 0 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">{formatCurrency(p.price)}</span>
                  <div className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">STOCK: {p.stock}</div>
                </div>
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all">
                  <Plus className="w-4 h-4 text-brand" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Growth Bar */}
        <div className="glass-card p-6 border-l-4 border-emerald-400 bg-emerald-50/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Growth Engine Active</p>
              <p className="text-sm font-bold text-slate-600">Points available for returning customers.</p>
            </div>
          </div>
          {activeCustomer && (
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Loyalty Points</p>
              <div className="flex items-center justify-end gap-2 text-brand">
                <Gift className="w-4 h-4" />
                <span className="text-lg font-black">{activeCustomer.loyaltyPoints || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Cart Section */}
      <aside className="lg:w-[420px] flex flex-col gap-6">
        <div className="glass-card flex-1 flex flex-col overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">Selected Items</h2>
            <span className="px-2 py-0.5 bg-brand text-white rounded text-[10px] font-black">{cart.length} ITEMS</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map(item => (
              <div key={item.product.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 group">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">{item.product.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{formatCurrency(item.product.price)} / unit</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-100 rounded-lg p-1 bg-slate-50">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-all"><Minus className="w-2.5 h-2.5" /></button>
                    <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-all"><Plus className="w-2.5 h-2.5" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-1 hover:text-rose-500 text-slate-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                <ShoppingCart className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-widest">Checkout queue empty</p>
              </div>
            )}
          </div>

          {/* Customer & Discounts */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="tel"
                  placeholder="Customer Phone Number"
                  value={customer.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-300"
                />
              </div>
              <input
                type="text"
                placeholder="Name (Autofilled)"
                value={customer.name}
                onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Coupons & Loyalty Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const code = prompt('Enter Coupon Code:');
                  if(code) applyCoupon(code.toUpperCase());
                }}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                  selectedCoupon ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-100 text-slate-400 grayscale"
                )}
              >
                <Ticket className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Coupon</span>
              </button>
              <button 
                disabled={!activeCustomer || (activeCustomer.loyaltyPoints || 0) < 10}
                onClick={() => setRedeemPoints(redeemPoints > 0 ? 0 : Math.min(activeCustomer?.loyaltyPoints || 0, 500))}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all disabled:opacity-30",
                  redeemPoints > 0 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-slate-100 text-slate-400 grayscale"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Loyalty</span>
              </button>
            </div>
          </div>

          <div className="p-8 bg-slate-900 text-white space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <AnimatePresence>
                {(discountAmount > 0 || pointValue > 0) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2 overflow-hidden">
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-indigo-400 uppercase tracking-widest">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {pointValue > 0 && (
                      <div className="flex justify-between text-xs font-bold text-amber-400 uppercase tracking-widest">
                        <span>Points Redeemed</span>
                        <span>-{formatCurrency(pointValue)}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-end pt-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Payable</span>
                <span className="text-3xl font-black">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0 || loading}
              onClick={handleSubmit}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalize Transaction'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

