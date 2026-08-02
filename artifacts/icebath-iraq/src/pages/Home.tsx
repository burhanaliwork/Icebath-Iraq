import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { Snowflake } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  inStock: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0d1b36] via-[#1a3a6b] to-[#0d1b36] text-white py-12 px-4 text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex justify-center">
            <span className="text-6xl animate-pulse">🧊</span>
          </div>
          <h2 className="text-2xl font-black leading-tight" dir="rtl">
            أول متجر لأحواض الاستشفاء بالماء البارد في العراق
          </h2>
          <p className="text-cyan-300 text-sm" dir="rtl">
            جودة عالية • توصيل لجميع المحافظات • ضمان المنتج
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-black text-[#0d1b36] mb-5 flex items-center gap-2" dir="rtl">
          <Snowflake size={22} className="text-cyan-500" />
          منتجاتنا
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400" dir="rtl">
            <span className="text-5xl block mb-3">📦</span>
            <p className="font-medium">لا توجد منتجات حتى الآن</p>
            <p className="text-sm mt-1">ستُضاف المنتجات قريباً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
