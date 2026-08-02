import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import MarqueeBanner from '@/components/MarqueeBanner';
import CartDrawer from '@/components/CartDrawer';
import Home from '@/pages/Home';
import Checkout from '@/pages/Checkout';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function StoreLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <MarqueeBanner />
      <Navbar onCartOpen={() => setCartOpen(true)} onMenuOpen={() => setMenuOpen(!menuOpen)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/checkout" component={Checkout} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={StoreLayout} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </CartProvider>
    </QueryClientProvider>
  );
}
