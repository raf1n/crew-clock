import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '../api/baseApi';
import { authReducer } from '../features/auth/authSlice';
import { workspaceReducer } from '../features/workspaces/workspaceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

store.subscribe(() => {
  const workspaceId = store.getState().workspace.selectedWorkspaceId;
  if (workspaceId) {
    localStorage.setItem('selectedWorkspaceId', workspaceId);
  } else {
    localStorage.removeItem('selectedWorkspaceId');
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
