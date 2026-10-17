import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, Layers, BookOpen, LogOut, ClipboardList, Workflow, MessageSquareText, Trophy, Briefcase, Clapperboard, NotebookPen, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ai-authoring', icon: Sparkles, label: 'AI Content Assistant' },
  { to: '/domains', icon: Globe, label: 'Domains & Skills' },
  { to: '/skills', icon: Layers, label: 'Skills Library' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/notes', icon: NotebookPen, label: 'Course Notes' },
  { to: '/roles', icon: Briefcase, label: 'Roles & Roadmaps' },
  { to: '/question-pools', icon: ClipboardList, label: 'Question Pools' },
  { to: '/contests', icon: Trophy, label: 'Contests' },
  { to: '/interview-experiences', icon: MessageSquareText, label: 'Interview Experiences' },
  { to: '/algorithms', icon: Workflow, label: 'Algorithm Visualizer' },
  { to: '/animations', icon: Clapperboard, label: 'Canvas Animations' },
];

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-sidebar border-r border-white/8 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          UnlearnArc
        </span>
        <p className="text-xs text-slate-500 mt-0.5">Admin Console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin badge + logout */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div>
            <p className="text-xs font-medium text-white">Admin</p>
            <p className="text-[10px] text-slate-500">unlearnarc@gmail.com</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
};
