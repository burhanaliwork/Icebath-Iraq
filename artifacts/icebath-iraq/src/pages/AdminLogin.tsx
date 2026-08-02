import { useState } from 'react';
import { useLocation } from 'wouter';

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطأ في الدخول'); return; }
      navigate('/admin');
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1b36] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm" dir="rtl">
        <div className="text-center mb-6">
          <span className="text-5xl">🧊</span>
          <h1 className="text-xl font-black text-[#0d1b36] mt-2">لوحة الإدارة</h1>
          <p className="text-gray-400 text-sm mt-1">ICEBATH.IRAQ</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">اسم المستخدم</label>
            <input
              required value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="admin"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">كلمة المرور</label>
            <input
              required type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#0d1b36] text-white py-3 rounded-xl font-bold hover:bg-cyan-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
