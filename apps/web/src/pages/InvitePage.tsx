import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAcceptInviteRegistrationMutation, useLogoutMutation } from '@/api/authApi';
import { useAcceptInvitationMutation, usePreviewInvitationQuery } from '@/api/workspacesApi';
import { AuthTemplate } from '@/components/layout/AuthTemplate';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { FormField } from '@/components/shared/FormField';
import { LoadingState } from '@/components/shared/LoadingState';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setSelectedWorkspace } from '@/features/workspaces/workspaceSlice';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTime, formatLabel } from '@/lib/format';

export function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const currentUser = useAppSelector((state) => state.auth.user);
  const [logout] = useLogoutMutation();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const {
    data: preview,
    isLoading,
    error: previewError,
  } = usePreviewInvitationQuery(token, { skip: !token });
  const [accept, { isLoading: accepting }] = useAcceptInvitationMutation();
  const [signup, { isLoading: signingUp }] = useAcceptInviteRegistrationMutation();

  const next = `/invite/${token}`;

  const handleAccept = async (): Promise<void> => {
    setError(null);
    try {
      const workspace = await accept(token).unwrap();
      dispatch(setSelectedWorkspace(workspace.id));
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleSwitchAccount = async (): Promise<void> => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
  };

  if (isLoading) {
    return (
      <AuthTemplate>
        <LoadingState label="Checking invitation…" />
      </AuthTemplate>
    );
  }

  if (previewError || !preview) {
    return (
      <AuthTemplate>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Invitation unavailable</h1>
          <ErrorAlert
            message={previewError ? apiErrorMessage(previewError) : 'Invitation not found.'}
          />
          <Button asChild className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthTemplate>
    );
  }

  const emailMismatch =
    currentUser !== null && currentUser.email.toLowerCase() !== preview.email.toLowerCase();

  const handleUseInviteeAccount = async (): Promise<void> => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    setError(null);
  };

  const handleSignup = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      await signup({ token, name, password }).unwrap();
      dispatch(setSelectedWorkspace(preview.workspaceId));
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <AuthTemplate>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            Workspace invitation
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Join {preview.workspaceName}</h1>
          <p className="text-sm text-muted-foreground">
            {preview.invitedBy ? `${preview.invitedBy} invited` : 'You were invited'}{' '}
            <span className="font-medium text-foreground">{preview.email}</span> to join as{' '}
            <Badge variant="secondary">{formatLabel(preview.role)}</Badge>.
          </p>
        </div>

        {error ? <ErrorAlert message={error} /> : null}

        {accessToken && emailMismatch ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This invite is for <span className="font-medium">{preview.email}</span>, but you are
              signed in as <span className="font-medium">{currentUser?.email}</span>.
            </div>
            <Button className="w-full" onClick={handleSwitchAccount}>
              Sign in as {preview.email}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleUseInviteeAccount}>
              Create account for {preview.email}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </div>
        ) : accessToken ? (
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting ? 'Joining…' : 'Accept invitation'}
          </Button>
        ) : (
          <div className="space-y-4">
            <form className="space-y-3" onSubmit={handleSignup}>
              <FormField label="Email">
                <Input value={preview.email} readOnly disabled />
              </FormField>
              <FormField label="Your name" htmlFor="invite-name">
                <Input
                  id="invite-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </FormField>
              <FormField
                label="Create a password"
                htmlFor="invite-password"
                hint="At least 8 characters."
              >
                <PasswordInput
                  id="invite-password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </FormField>
              <Button type="submit" className="w-full" disabled={signingUp}>
                {signingUp ? 'Creating account…' : 'Create account & join'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                className="font-medium text-primary hover:underline"
                to={`/login?next=${encodeURIComponent(next)}`}
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This invitation expires {formatDateTime(preview.expiresAt)}.
        </p>
      </div>
    </AuthTemplate>
  );
}
