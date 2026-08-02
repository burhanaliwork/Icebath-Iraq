import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Plus, Pencil, Trash2, LogOut, Package, ShoppingBag, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';

interface Product {
  id: number; name: string; description?: string | null;
  price: number; imageUrl?: string | null; inStock: boolean;
}
interface OrderItem { id: number; productName: string; quantity: number; price: number; }
interface Order {
  id: number; customerName: string; customerPhone: string;
  customerAddress: string; total: number; status: string;
  notes?: string | null; createdAt: string; items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'جديد', confirmed: 'مؤكد', delivered: 'مُسلَّم', cancelled: 'ملغي',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = { name: '', description: '', price: '', imageUrl: '', inStock: true };

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const checkAuth = useCallback(async () => {
    const res = await fetch('/api/admin/me', { credentials: 'include' });
    if (!res.ok) navigate('/admin/login');
  }, [navigate]);

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/admin/products', { credentials: 'include' });
    if (res.ok) setProducts(await res.json());
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders', { credentials: 'include' });
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    checkAuth().then(() => Promise.all([loadProducts(), loadOrders()])).then(() => setLoading(false));
  }, [checkAuth, loadProducts, loadOrders]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    navigate('/admin/login');
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: String(p.price), imageUrl: p.imageUrl || '', inStock: p.inStock });
    setShowForm(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const body = { ...form, price: parseInt(form.price), inStock: form.inStock };
    const url = editing ? `/api/admin/products/${editing.id}` : '/api/admin/products';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    if (res.ok) { await loadProducts(); setShowForm(false); }
    setSaving(false);
  }

  async function toggleStock(p: Product) {
    await fetch(`/api/admin/products/${p.id}/stock`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ inStock: !p.inStock }),
    });
    await loadProducts();
  }

  async function deleteProduct() {
    if (!deleteId) return;
    await fetch(`/api/admin/products/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleteId(null); await loadProducts();
  }

  async function updateOrderStatus(id: number, status: string) {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ status }),
    });
    await loadOrders();
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-4xl animate-spin">🧊</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top bar */}
      <header className="bg-[#0d1b36] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="font-black text-lg">لوحة إدارة ICEBATH.IRAQ</h1>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm hover:text-cyan-300 transition-colors">
          <LogOut size={16} /> خروج
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-1">
        <button
          onClick={() => setTab('products')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'products' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Package size={16} /> المنتجات ({products.length})
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'orders' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ShoppingBag size={16} /> الطلبات ({orders.length})
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* ── Products tab ── */}
        {tab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#0d1b36]">إدارة المنتجات</h2>
              <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#0d1b36] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-colors">
                <Plus size={16} /> منتج جديد
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
                <span className="text-5xl block mb-3">📦</span>
                <p>لا توجد منتجات — أضف أول منتج!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-14 h-14 rounded-xl bg-[#0d1b36] flex items-center justify-center shrink-0 overflow-hidden">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-2xl">🧊</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0d1b36] truncate">{p.name}</p>
                      <p className="text-sm text-gray-500">{p.price.toLocaleString('ar-IQ')} IQD</p>
                      {p.description && <p className="text-xs text-gray-400 truncate">{p.description}</p>}
                    </div>
                    {/* Stock toggle */}
                    <button
                      onClick={() => toggleStock(p)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${p.inStock ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      {p.inStock ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {p.inStock ? 'متوفر' : 'نفذ'}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders tab ── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <h2 className="font-bold text-[#0d1b36]">الطلبات الواردة</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
                <span className="text-5xl block mb-3">📬</span>
                <p>لا توجد طلبات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#0d1b36]">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.customerPhone}</p>
                        <p className="text-xs text-gray-400">{order.customerAddress}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-black text-[#0d1b36]">{order.total.toLocaleString('ar-IQ')} IQD</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</p>
                      </div>
                    </div>
                    {/* Items */}
                    <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.productName} × {item.quantity}</span>
                          <span className="font-semibold">{(item.price * item.quantity).toLocaleString('ar-IQ')} IQD</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && <p className="text-xs text-gray-500 italic">ملاحظة: {order.notes}</p>}
                    {/* Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      {['pending', 'confirmed', 'delivered', 'cancelled'].map((s) => (
                        s !== order.status && (
                          <button
                            key={s}
                            onClick={() => updateOrderStatus(order.id, s)}
                            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-[#0d1b36] text-lg">{editing ? 'تعديل المنتج' : 'منتج جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={saveProduct} className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">اسم المنتج *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">السعر (IQD) *</label>
                <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">رابط الصورة</label>
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" dir="ltr" placeholder="https://..." />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button type="button" onClick={() => setForm({ ...form, inStock: !form.inStock })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.inStock ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.inStock ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-semibold text-gray-700">{form.inStock ? 'متوفر في المخزون' : 'غير متوفر'}</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#0d1b36] text-white py-2.5 rounded-xl font-bold hover:bg-cyan-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1">
                  <Check size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center" dir="rtl">
            <p className="font-bold text-[#0d1b36] mb-2">حذف المنتج؟</p>
            <p className="text-sm text-gray-500 mb-5">لا يمكن التراجع عن هذا الإجراء</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 py-2 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={deleteProduct} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
