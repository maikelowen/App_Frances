'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';

const TABS = [
  { href: '/', label: 'Hoy', icon: 'today' },
  { href: '/frasebook', label: 'Frasebook', icon: 'book' },
  { href: '/conversar', label: 'Conversar', icon: 'chat' },
  { href: '/pasaporte', label: 'Pasaporte', icon: 'passport' },
];

// Pantallas a pantalla completa (sesión y conversación) no muestran la barra.
const FULLSCREEN = [/^\/sesion/, /^\/conversar\/\d+/];

export default function TabBar() {
  const pathname = usePathname();
  if (FULLSCREEN.some((r) => r.test(pathname))) return null;

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}>
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 pt-2.5 pb-1 text-[0.78rem] ${active ? 'font-bold text-ink' : 'text-muted'}`}>
                <Icon name={t.icon} size={22} strokeWidth={active ? 2.4 : 1.8} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
