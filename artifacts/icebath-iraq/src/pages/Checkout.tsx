import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useLocation } from 'wouter';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerAddress: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0 && !done) {
    navigate('/');
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items }),
      });
      if (!res.ok) { setError('حدث خطأ، حاول مجدداً'); return; }
      clearCart();
      setDone(true);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center" dir="rtl">
          <CheckCircle size={56} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#0d1b36]">تم استلام طلبك! 🎉</h2>
          <p className="text-gray-500 mt-2 text-sm">سنتواصل معك قريباً لتأكيد الطلب والتوصيل</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-[#0d1b36] text-white py-3 rounded-xl font-bold hover:bg-cyan-600 transition-colors"
          >
            العودة للمتجر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-500 mb-4 hover:text-[#0d1b36]" dir="rtl">
          <ArrowRight size={16} /> العودة
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5" dir="rtl">
          <h1 className="text-xl font-black text-[#0d1b36]">إتمام الطلب</h1>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.productName} × {item.quantity}</span>
                <span className="font-semibold">{(item.price * item.quantity).toLocaleString('ar-IQ')} IQD</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-black text-[#0d1b36]">
              <span>المجموع</span>
              <span>{totalPrice.toLocaleString('ar-IQ')} IQD</span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">الاسم الكامل *</label>
              <input
                required value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="محمد أحمد"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">رقم الهاتف *</label>
              <input
                required value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="07xxxxxxxxx"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">العنوان *</label>
              <textarea
                required value={form.customerAddress}
                onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                rows={2} placeholder="المحافظة / المنطقة / التفاصيل"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">ملاحظات (اختياري)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="أي ملاحظات إضافية"
              />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit" disabled={submitting}
              className="w-full bg-[#0d1b36] text-white py-3 rounded-xl font-bold text-base hover:bg-cyan-600 transition-colors disabled:opacity-60"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب 🧊'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
