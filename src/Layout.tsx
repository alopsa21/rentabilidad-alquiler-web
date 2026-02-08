import { Outlet } from 'react-router-dom';
import { Footer } from './components/Footer';

export function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
