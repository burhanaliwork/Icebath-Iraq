import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface NavbarProps {
  onCartOpen: () => void;
  onMenuOpen: () => void;
}

export default function Navbar({ onCartOpen, onMenuOpen }: NavbarProps) {
  const { totalItems } = useCart();

  return (
    <header className="bg-[#0d1b36] text-white sticky top-0 z-40 shadow-lg">
      <div className="flex items-center px-3 py-2 gap-2">
        {/* Left icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMenuOpen}
            className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="القائمة"
          >
            <Menu size={24} />
          </button>
          <button
            onClick={onCartOpen}
            className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors relative"
            aria-label="السلة"
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-cyan-400 text-[#0d1b36] text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Logo — fills remaining width */}
        <div className="flex-1 overflow-hidden text-right">
          <span
            className="font-black tracking-tight leading-none block"
            style={{ fontSize: 'clamp(2rem, 8.5vw, 5rem)', letterSpacing: '-0.03em' }}
          >
            ICEBATH.IRAQ
          </span>
        </div>
      </div>
    </header>
  );
}
