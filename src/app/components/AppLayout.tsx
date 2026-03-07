import { Outlet } from 'react-router';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-black">
      {/* Page content with bottom padding for nav bar */}
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
