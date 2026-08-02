import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLocation } from 'wouter';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalPrice, removeItem, updateQuantity } = useCart();
  const [, navigate] = useLocation();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1b36] text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} /> سلة التسوق
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <span className="text-6xl">🛒</span>
              <p className="font-medium">السلة فارغة</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-14 h-14 rounded-lg bg-[#0d1b36] flex items-center justify-center shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🧊</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0d1b36] truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.price.toLocaleString('ar-IQ')} IQD</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 hover:text-red-600 p-1 self-start"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-[#0d1b36]">
              <span className="font-bold text-lg">المجموع:</span>
              <span className="font-black text-xl">{totalPrice.toLocaleString('ar-IQ')} IQD</span>
            </div>
            <button
              onClick={() => { onClose(); navigate('/checkout'); }}
              className="w-full bg-[#0d1b36] text-white py-3 rounded-xl font-bold text-base hover:bg-cyan-600 transition-colors"
            >
              إتمام الطلب ←
            </button>
          </div>
        )}
      </div>
    </>
  );
}
