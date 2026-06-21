import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Loader2, CheckCircle2, MessageSquare, Ticket, Gift, Sparkles, TrendingUp, Building, MapPin, FileBox, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { StoreCreditBanner } from '../components/returns/StoreCreditBanner';
import { Product, Customer, LoyaltyConfig, Coupon, Bill } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

export default function BillingPage() {
  const { tenant: authTenant } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customer, setCustomer] = useState({ 
    name: '', 
    phone: '', 
    gstin: '', 
    state: authTenant?.state || 'Karnataka' 
  });
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [documentType, setDocumentType] = useState<'invoice' | 'estimate' | 'credit_note' | 'challan'>('invoice');
  const [isB2B, setIsB2B] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successBill, setSuccessBill] = useState<any>(null);
  const [applyStoreCredit, setApplyStoreCredit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, lRes, cRes, tRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/marketing/loyalty/config'),
        api.get('/marketing/coupons'),
        api.get('/settings/tenant')
      ]);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setLoyaltyConfig(lRes.data);
      setCoupons(Array.isArray(cRes.data) ? cRes.data : []);
      setTenant(tRes.data);
      if (tRes.data?.state) setCustomer(prev => ({ ...prev, state: tRes.data.state }));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhoneChange = async (val: string) => {
    setCustomer(prev => ({ ...prev, phone: val }));
    if (val.length >= 10) {
      const dbRes = await api.get('/customer/list');
      const customers = Array.isArray(dbRes.data) ? dbRes.data : [];
      const found = customers.find((c: Customer) => c.phone === val);
      if (found) {
        setActiveCustomer(found);
        setCustomer(prev => ({ ...prev, name: found.name }));
        setApplyStoreCredit(false);
      } else {
        setActiveCustomer(null);
        setApplyStoreCredit(false);
      }
    } else {
      setActiveCustomer(null);
      setApplyStoreCredit(false);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock && (documentType === 'invoice' || documentType === 'challan')) return;
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock < 1 && (documentType === 'invoice' || documentType === 'challan')) return;
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.product.stock && (documentType === 'invoice' || documentType === 'challan')) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product.id !== id));
  };

  // GST Calculation Logic
  const isInterState = tenant?.state && customer.state !== tenant.state;
  
  let subtotal = 0;
  let totalGst = 0;
  
  const processedItems = cart.map(item => {
    const base = item.product.price * item.quantity;
    const gstRate = item.product.gstRate || 0;
    const gstAmt = base * (gstRate / 100);
    subtotal += base;
    totalGst += gstAmt;
    return { ...item, base, gstAmt };
  });

  const cgst = isInterState ? 0 : totalGst / 2;
  const sgst = isInterState ? 0 : totalGst / 2;
  const igst = isInterState ? totalGst : 0;
  
  let discountAmount = 0;
  if (selectedCoupon) {
    if (selectedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * selectedCoupon.value) / 100;
    } else {
      discountAmount = selectedCoupon.value;
    }
  }

  const pointValue = redeemPoints * (loyaltyConfig?.valuePerPoint || 0);
  const calculatedBillTotal = Math.max(0, subtotal + totalGst - discountAmount - pointValue);

  // Store Credit Calculus
  const storeCreditAvailable = activeCustomer?.storeCredit || 0;
  const creditToApply = applyStoreCredit ? Math.min(storeCreditAvailable, calculatedBillTotal) : 0;
  const grandTotal = Math.max(0, calculatedBillTotal - creditToApply);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerGstin: isB2B ? customer.gstin : undefined,
        customerState: customer.state,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        payments: paymentStatus === 'paid' ? [{ mode: 'cash', amount: grandTotal }] : [],
        paymentStatus,
        discountAmount,
        pointsRedeemed: redeemPoints,
        documentType,
        storeCreditApplied: creditToApply
      };
      const { data } = await api.post('/billing/create', payload);
      setSuccessBill(data);
      setCart([]);
      setCustomer({ name: '', phone: '', gstin: '', state: authTenant?.state || tenant?.state || 'Karnataka' });
      setActiveCustomer(null);
      setSelectedCoupon(null);
      setRedeemPoints(0);
      setIsB2B(false);
      setApplyStoreCredit(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Billing failed');
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppLink = () => {
    if (!successBill) return '';
    const message = `Hi ${customer.name || 'Customer'}, your bill ${successBill.billNumber} for ${formatCurrency(successBill.totalAmount)} is ready. Thank you!`;
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
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Order Confirmed</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{successBill.documentType} #{successBill.billNumber}</p>
          <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Amount</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{formatCurrency(successBill.totalAmount)}</p>
          </div>
        </div>
        
        {customer.phone && (
          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
          >
            <MessageSquare className="w-5 h-5" />
            Send WhatsApp Invoice
          </a>
        )}
        
        <button
          onClick={() => setSuccessBill(null)}
          className="w-full py-5 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:bg-slate-50 transition-colors"
        >
          Close & New Entry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8">
      {/* Left Selection */}
      <div className="flex-[1.8] flex flex-col gap-6 overflow-hidden">
        {/* Document Type & B2B Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {['invoice', 'estimate', 'credit_note', 'challan'].map((type) => (
              <button
                key={type}
                onClick={() => setDocumentType(type as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  documentType === type ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsB2B(!isB2B)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all",
              isB2B ? "bg-indigo-50 border-brand text-brand" : "bg-white border-slate-100 text-slate-400"
            )}
          >
            <Building className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">B2B Mode</span>
          </button>
        </div>

        <div className="glass-card flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand" /> Stock Selector
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Product, SKU or Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base w-full pl-10 h-10 text-xs"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 content-start custom-scrollbar">
            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock < 1 && (documentType === 'invoice' || documentType === 'challan')}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-soft text-left hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors leading-tight">{p.name}</p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg">GST {p.gstRate}%</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">{p.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(p.price)}</span>
                  <div className={cn(
                    "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm",
                    p.stock < 10 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                  )}>{p.stock} Units</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Growth Bar */}
        <div className="modern-card p-6 border-l-8 border-emerald-500 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Intelligent Growth Active</p>
              <div className="flex items-center gap-2">
                 <Building className="w-3.5 h-3.5 text-slate-400" />
                 <p className="text-sm font-bold text-slate-600">{tenant?.state || 'Store Region'} <span className="text-slate-300 mx-1">|</span> {isInterState ? 'Outside State' : 'Home State'}</p>
              </div>
            </div>
          </div>
          {activeCustomer && (
            <div className="text-right px-6 border-l border-slate-100 flex items-center gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loyalty</p>
                <div className="flex items-center justify-end gap-2 text-indigo-600">
                  <Gift className="w-4 h-4" />
                  <span className="text-xl font-black">{activeCustomer.loyaltyPoints || 0}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-200" />
            </div>
          )}
        </div>
      </div>

      {/* Right Cart Section */}
      <aside className="lg:w-[480px] flex flex-col gap-6">
        <div className="glass-card flex-1 flex flex-col overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Billing Snapshot</h2>
            <span className="px-3 py-1 bg-brand text-white rounded-full text-[10px] font-black">{cart.length} LINE ITEMS</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {processedItems.map(item => (
              <div key={item.product.id} className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2 group">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black text-slate-800">{item.product.name}</p>
                  <p className="text-xs font-black text-slate-900">{formatCurrency(item.base + item.gstAmt)}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>{item.quantity} x {formatCurrency(item.product.price)}</span>
                    <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[9px] font-black text-slate-400">GST {item.product.gstRate}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-100 rounded-lg p-0.5 bg-slate-50">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded transition-all"><Minus className="w-2 h-2" /></button>
                      <span className="w-6 text-center text-[10px] font-black">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded transition-all"><Plus className="w-2 h-2" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="p-1 hover:text-rose-500 text-slate-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                <FileBox className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
              </div>
            )}
          </div>

          {/* Store Credit Banner Alert */}
          {activeCustomer && (activeCustomer.storeCredit || 0) > 0 && (
            <div className="px-6 py-4 bg-white border-t border-slate-100">
              <StoreCreditBanner
                creditAmount={activeCustomer.storeCredit || 0}
                customerName={activeCustomer.name}
                applyStoreCredit={applyStoreCredit}
                setApplyStoreCredit={setApplyStoreCredit}
              />
            </div>
          )}

          {/* Customer & GST Details */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Customer Phone</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="tel" placeholder="10 Digits" value={customer.phone} onChange={(e) => handlePhoneChange(e.target.value)} className="input-base w-full pl-10 py-3 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Customer Name</label>
                <input type="text" placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))} className="input-base w-full py-3 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isB2B && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-brand uppercase tracking-widest pl-1">Buyer GSTIN</label>
                  <input type="text" placeholder="15 Digit GSTIN" value={customer.gstin} onChange={(e) => setCustomer(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))} className="input-base w-full py-3 text-sm focus:ring-brand/20" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Billing State</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <select value={customer.state} onChange={(e) => setCustomer(prev => ({ ...prev, state: e.target.value }))} className="input-base w-full pl-10 py-3 text-sm appearance-none">
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-900 text-white space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <span>Total Taxable Value</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="space-y-2 pb-2 border-b border-white/5">
                {isInterState ? (
                  <div className="flex justify-between text-[11px] font-black text-brand uppercase tracking-widest">
                    <span>IGST Collected</span>
                    <span>{formatCurrency(igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                      <span>CGST Collected</span>
                      <span>{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                      <span>SGST Collected</span>
                      <span>{formatCurrency(sgst)}</span>
                    </div>
                  </>
                )}
              </div>
              <AnimatePresence>
                {(discountAmount > 0 || pointValue > 0) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-1.5 overflow-hidden">
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        <span>Extra Discounts</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {pointValue > 0 && (
                      <div className="flex justify-between text-[10px] font-black text-amber-400 uppercase tracking-widest">
                        <span>Points Benefit</span>
                        <span>-{formatCurrency(pointValue)}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-end pt-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Final Invoice Total</p>
                  <p className="text-4xl font-black tracking-tighter">{formatCurrency(grandTotal)}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const code = prompt('Enter Coupon:');
                      if(code) applyCoupon(code.toUpperCase());
                    }}
                    className={cn(
                      "p-3 rounded-xl border border-white/10 transition-all",
                      selectedCoupon ? "bg-brand text-white border-brand" : "text-slate-500 hover:text-white"
                    )}
                  >
                    <Ticket className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={!activeCustomer || (activeCustomer.loyaltyPoints || 0) < 10}
                    onClick={() => setRedeemPoints(redeemPoints > 0 ? 0 : Math.min(activeCustomer?.loyaltyPoints || 0, 500))}
                    className={cn(
                      "p-3 rounded-xl border border-white/10 transition-all disabled:opacity-30",
                      redeemPoints > 0 ? "bg-amber-500 text-white border-amber-500" : "text-slate-500 hover:text-white"
                    )}
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              disabled={cart.length === 0 || loading}
              onClick={handleSubmit}
              className="w-full py-5 bg-brand text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Finalize ${documentType}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

