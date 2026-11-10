import { useState, type FormEvent } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useRegisterMutation } from '@/api/authApi';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { FormField } from '@/components/shared/FormField';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/api-error';

export function RegisterForm() {
  const [register, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const [form, setForm] = useState({
    name: '',
    email: searchParams.get('email') ?? '',
    password: '',
    workspaceName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      await register(form).unwrap();
      navigate(target, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Set up your team and start tracking in minutes.
        </p>
      </div>

      {error ? <ErrorAlert message={error} /> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Name" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Workspace name" htmlFor="workspace">
          <Input
            id="workspace"
            value={form.workspaceName}
            onChange={(event) => update('workspaceName', event.target.value)}
            required
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          className="font-medium text-primary hover:underline"
          to={target === '/' ? '/login' : `/login?next=${encodeURIComponent(target)}`}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
