import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface WorkspaceState {
  selectedWorkspaceId: string | null;
}

const initialState: WorkspaceState = {
  selectedWorkspaceId: localStorage.getItem('selectedWorkspaceId'),
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setSelectedWorkspace(state, action: PayloadAction<string | null>) {
      state.selectedWorkspaceId = action.payload;
    },
  },
});

export const { setSelectedWorkspace } = workspaceSlice.actions;
export const workspaceReducer = workspaceSlice.reducer;
