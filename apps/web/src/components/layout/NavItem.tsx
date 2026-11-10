import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function NavItem({
  to,
  label,
  icon: Icon,
  end = false,
  compact = false,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center font-medium transition-colors',
          compact
            ? 'gap-1.5 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap'
            : 'gap-3 rounded-lg px-3 py-2 text-sm',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      <Icon className={compact ? 'size-3.5' : 'size-4'} />
      <span>{label}</span>
    </NavLink>
  );
}
