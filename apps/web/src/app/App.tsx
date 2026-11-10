import { useEffect, useRef, useState } from 'react';

import { RouterProvider } from 'react-router-dom';

import { useRefreshSessionMutation } from '@/api/authApi';
import { router } from '@/app/router';

export function App() {
  const [refreshSession] = useRefreshSessionMutation();
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;

    refreshSession()
      .unwrap()
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [refreshSession]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
