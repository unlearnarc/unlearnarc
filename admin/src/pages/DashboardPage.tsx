import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Layers, BookOpen, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { domainAPI, skillAPI, courseAPI, topicAPI } from '../api/endpoints';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  to: string;
  color: string;
}> = ({ icon, label, value, to, color }) => (
  <Link
    to={to}
    className="group bg-surface/60 border border-white/8 rounded-2xl p-6 flex items-center gap-4 hover:border-white/20 transition"
  >
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div className="flex-1">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-0.5">
        {value ?? <span className="text-slate-600 text-lg">—</span>}
      </p>
    </div>
    <ArrowRight
      size={16}
      className="text-slate-600 group-hover:text-slate-300 transition"
    />
  </Link>
);

export const DashboardPage: React.FC = () => {
  const domains = useQuery({ queryKey: ['domains'], queryFn: domainAPI.getAll });
  const skills = useQuery({ queryKey: ['skills'], queryFn: skillAPI.getAll });
  const courses = useQuery({ queryKey: ['courses'], queryFn: courseAPI.getAll });
  const topics = useQuery({ queryKey: ['topics-all'], queryFn: topicAPI.getAll });

  const domainCount = domains.data?.data?.data?.length;
  const skillCount = skills.data?.data?.data?.length;
  const courseCount = courses.data?.data?.data?.length;
  const topicCount = topics.data?.data?.data?.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Overview of your UnlearnArc content
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={<Globe size={22} className="text-violet-400" />}
          label="Domains"
          value={domainCount}
          to="/domains"
          color="bg-violet-500/15"
        />
        <StatCard
          icon={<Layers size={22} className="text-blue-400" />}
          label="Skills"
          value={skillCount}
          to="/skills"
          color="bg-blue-500/15"
        />
        <StatCard
          icon={<BookOpen size={22} className="text-emerald-400" />}
          label="Courses"
          value={courseCount}
          to="/courses"
          color="bg-emerald-500/15"
        />
        <StatCard
          icon={<FileText size={22} className="text-amber-400" />}
          label="Topics"
          value={topicCount}
          to="/courses"
          color="bg-amber-500/15"
        />
      </div>

      {/* Quick-access cards */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/domains', label: 'Manage Domains & Skills', desc: 'Create domains, attach skills' },
            { to: '/courses', label: 'Manage Courses', desc: 'Courses → Topics → Materials' },
            { to: '/skills', label: 'Skills Library', desc: 'Reusable skills across domains' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group p-4 rounded-xl border border-white/8 hover:border-violet-500/40 hover:bg-violet-500/5 transition"
            >
              <p className="text-sm font-medium text-white group-hover:text-violet-300 transition">
                {item.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
