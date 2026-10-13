import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => (
  <div className="flex min-h-screen bg-bg text-white">
    <Sidebar />
    <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
      <Outlet />
    </main>
  </div>
);
