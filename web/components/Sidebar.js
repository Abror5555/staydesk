'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/reservations/new', label: 'New reservation' },
  { href: '/rooms', label: 'Rooms' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname === href);

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="px-6 py-5">
        <p className="text-lg font-bold text-slate-900">
          Stay<span className="text-brand-600">Desk</span>
        </p>
        <p className="text-xs text-slate-500">Hotel reservations</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(link.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
