import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  inStock: boolean;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-[#0d1b36] to-[#1a3a6b] flex items-center justify-center relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl select-none">🧊</span>
        )}
        {/* Stock badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
          product.inStock ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {product.inStock ? (
            <><CheckCircle size={10} /> متوفر</>
          ) : (
            <><XCircle size={10} /> نفذ</>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2" dir="rtl">
        <h3 className="font-bold text-[#0d1b36] text-base leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="font-black text-[#0d1b36] text-lg">
            {product.price.toLocaleString('ar-IQ')} IQD
          </span>
          <button
            disabled={!product.inStock}
            onClick={() =>
              addItem({
                productId: product.id,
                productName: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
              })
            }
            className="flex items-center gap-1.5 bg-[#0d1b36] text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={14} />
            أضف
          </button>
        </div>
      </div>
    </div>
  );
}
