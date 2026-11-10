import { roleAtLeast } from '@crewclock/shared';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useLogoutMutation } from '@/api/authApi';
import { Logo } from '@/components/shared/Logo';
import { NavItem } from '@/components/layout/NavItem';
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/components/layout/Sidebar';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function MobileHeader() {
  const navigate = useNavigate();
  const { workspace } = useSelectedWorkspace();
  const [logout] = useLogoutMutation();

  const navItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || (workspace ? roleAtLeast(workspace.role, 'manager') : false),
  );

  const handleLogout = async (): Promise<void> => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate('/login');
  };

  return (
    <header className="shrink-0 border-b bg-card lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Logo compact />
        <div className="ml-auto flex items-center gap-2">
          <WorkspaceSwitcher compact />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            className="text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut />
          </Button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} compact />
        ))}
      </nav>
    </header>
  );
}
