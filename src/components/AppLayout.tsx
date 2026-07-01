import {
  BarChart3,
  CalendarClock,
  FileSpreadsheet,
  Download,
  MailQuestion,
  LayoutDashboard,
  LogOut,
  Mail,
  Send,
  Settings,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Array<'admin' | 'manager' | 'user'>;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/brokers', label: 'Brokers', icon: UserRoundCheck, roles: ['admin', 'manager'] },
  { to: '/campaign-a', label: 'Campaign A', icon: Mail },
  { to: '/campaign-b', label: 'Campaign B', icon: Mail },
  { to: '/campaign-c', label: 'Campaign C', icon: Mail },
  { to: '/email-queue', label: 'Email Queue', icon: Send, roles: ['admin', 'manager'] },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarClock },
  { to: '/missing-emails', label: 'Missing Emails', icon: MailQuestion, roles: ['admin', 'manager'] },
  { to: '/import', label: 'Import', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
  { to: '/export', label: 'Export', icon: Download, roles: ['admin', 'manager'] },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { currentUser, logout, role } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-line px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-navy text-white">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-5">Trade Finance OS</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {visibleNavItems.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>

          <div className="border-t border-line p-4">
            <p className="truncate text-xs text-steel">{currentUser?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Trade Finance OS</p>
              <p className="text-xs text-steel">{currentUser?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="grid h-9 w-9 place-items-center rounded border border-line"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'flex shrink-0 items-center gap-2 rounded border px-3 py-2 text-xs font-medium',
                    isActive
                      ? 'border-navy bg-navy text-white'
                      : 'border-line bg-white text-ink',
                  ].join(' ')
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="w-full px-4 py-6 sm:px-5 lg:px-6 xl:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium',
          isActive ? 'bg-navy text-white' : 'text-ink hover:bg-paper',
        ].join(' ')
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}
