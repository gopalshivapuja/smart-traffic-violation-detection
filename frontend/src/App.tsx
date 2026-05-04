import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks, Upload, Camera, Settings } from 'lucide-react';
import Dashboard from './components/dashboard/Dashboard';
import ViolationList from './components/violations/ViolationList';
import ViolationDetail from './components/violations/ViolationDetail';
import UploadPage from './components/upload/UploadPage';
import CameraManagement from './components/cameras/CameraManagement';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/violations', label: 'Violations', icon: ListChecks },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/cameras', label: 'Cameras', icon: Camera },
];

export default function App() {
  const location = useLocation();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-bg text-slate-100">
      {/* Sidebar */}
      <aside className="flex w-16 flex-col items-center border-r border-border-subtle bg-bg-elevated py-4">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
          <Camera className="h-5 w-5" />
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                title={l.label}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive(l.to)
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
        <button
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-bg-elevated px-6">
          <h1 className="text-sm font-semibold text-slate-100">
            AI Traffic Enforcement Platform
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/violations" element={<ViolationList />} />
            <Route path="/violations/:id" element={<ViolationDetail />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/cameras" element={<CameraManagement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
