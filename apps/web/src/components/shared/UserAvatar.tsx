import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function UserAvatar({
  name,
  size = 'default',
  className,
}: {
  name: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className="bg-primary/10 font-medium text-primary">
        {initials || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
