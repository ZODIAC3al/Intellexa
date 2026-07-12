'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { setCredentials, clearCredentials } from '@/redux/slices/authSlice';
import { RootState } from '@/redux/store';
import { setView, setSidebarOpen } from '@/redux/slices/uiSlice';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import { Menu } from 'lucide-react';
import DashboardView from '@/components/DashboardView';
import LocalAssistantView from '@/components/LocalAssistantView';
import CloudAssistantView from '@/components/CloudAssistantView';
import DocumentsView from '@/components/DocumentsView';
import CollectionsView from '@/components/CollectionsView';
import SettingsView from '@/components/SettingsView';
import SearchView from '@/components/SearchView';
import ProfileView from '@/components/ProfileView';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VIEW_COMPONENTS: Record<string, React.ReactNode> = {
  dashboard: <DashboardView />,
  cloud: <CloudAssistantView />,
  local: <LocalAssistantView />,
  documents: <DocumentsView />,
  collections: <CollectionsView />,
  search: <SearchView />,
  settings: <SettingsView />,
  profile: <ProfileView />,
};

export default function DashboardLayout({ }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const activeView = useSelector((state: RootState) => state.ui.activeView);

  const { data: me, error } = useQuery({
    queryKey: ['me'],
    queryFn: api.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (me) {
      dispatch(setCredentials(me));
    } else if (error && !user) {
      dispatch(clearCredentials());
      router.replace('/login');
    }
    dispatch(setSidebarOpen(true));
  }, [me, error, dispatch, router, user]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/dashboard') {
      dispatch(setView('dashboard'));
    } else if (path.startsWith('/dashboard/assistant/')) {
      dispatch(setView(path.endsWith('/local') ? 'local' : 'cloud'));
    } else if (path === '/dashboard/documents') {
      dispatch(setView('documents'));
    } else if (path === '/dashboard/collections') {
      dispatch(setView('collections'));
    } else if (path === '/dashboard/search') {
      dispatch(setView('search'));
    } else if (path === '/dashboard/settings') {
      dispatch(setView('settings'));
    } else if (path === '/dashboard/profile') {
      dispatch(setView('profile'));
    }
  }, [dispatch]);

  if (!isAuthenticated && typeof window !== 'undefined') {
    return null;
  }

  const renderView = () => {
    if (activeView === 'dashboard' || !activeView) {
      return <DashboardView />;
    }
    return VIEW_COMPONENTS[activeView] || <DashboardView />;
  };

  return (
    <div className="drawer lg:drawer-open h-screen w-screen bg-base-100 overflow-hidden text-base-content">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        <header className="navbar bg-base-200 border-b border-neutral px-6 min-h-[56px] shrink-0 justify-between items-center gap-4 z-30">
          <div className="flex items-center gap-2">
            <label htmlFor="sidebar-drawer" className="btn btn-ghost btn-circle lg:hidden">
              <Menu className="h-5 w-5" />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral-content capitalize bg-base-300 px-2 py-1 rounded">
                Plan: {user?.plan || '—'}
              </span>
            </div>
          </div>

<div className="flex items-center gap-3">
              <NotificationBell />
              <div 
                onClick={() => dispatch(setView('profile'))}
                className="avatar placeholder cursor-pointer hover:opacity-80 transition-opacity"
                title="Profile Settings"
              >
                <div className="bg-primary text-primary-content rounded-full w-8 h-8 font-bold text-xs uppercase flex items-center justify-center">
                  {user?.name?.slice(0, 2) || '??'}
                </div>
              </div>
            </div>
        </header>

        <main id="dashboard-main" className="flex-1 overflow-y-auto relative scrollbar-thin">
          {renderView()}
        </main>
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="sidebar-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="w-[240px] h-full bg-base-200 border-r border-neutral">
          <Sidebar />
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
        toastClassName="bg-base-300 text-base-content"
      />
    </div>
  );
}