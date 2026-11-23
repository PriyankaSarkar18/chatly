import { Outlet } from 'react-router-dom';
import NavRail, { NAV_ITEMS } from './NavRail';
import { CallProvider } from '../../context/CallContext';
import CallOverlay from '../CallOverlay';

const AppShell = () => (
  <CallProvider>
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavRail />

      <main className="flex min-h-0 flex-1 flex-col pb-0 md:pb-16">
        <Outlet />
      </main>

      <CallOverlay />
    </div>
  </CallProvider>
);

export default AppShell;
