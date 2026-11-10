import type {
  AddMemberInput,
  CreateInvitationResult,
  InvitationPreview,
  InvitationSummary,
  InviteMemberInput,
  Member,
  MemberWithUser,
  WorkspaceMembership,
} from '@crewclock/shared';

import { baseApi } from './baseApi';

export const workspacesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaces: builder.query<WorkspaceMembership[], void>({
      query: () => '/workspaces',
      providesTags: ['Workspace'],
    }),
    getMembers: builder.query<MemberWithUser[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/members`,
      providesTags: ['Workspace'],
    }),
    addMember: builder.mutation<Member, { workspaceId: string; body: AddMemberInput }>({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Workspace'],
    }),
    createInvitation: builder.mutation<
      CreateInvitationResult,
      { workspaceId: string; body: InviteMemberInput }
    >({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Workspace'],
    }),
    listInvitations: builder.query<InvitationSummary[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/invitations`,
      providesTags: ['Workspace'],
    }),
    cancelInvitation: builder.mutation<void, { workspaceId: string; invitationId: string }>({
      query: ({ workspaceId, invitationId }) => ({
        url: `/workspaces/${workspaceId}/invitations/${invitationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workspace'],
    }),
    previewInvitation: builder.query<InvitationPreview, string>({
      query: (token) => `/invitations/${token}`,
    }),
    acceptInvitation: builder.mutation<WorkspaceMembership, string>({
      query: (token) => ({
        url: `/invitations/${token}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const {
  useGetWorkspacesQuery,
  useGetMembersQuery,
  useAddMemberMutation,
  useCreateInvitationMutation,
  useListInvitationsQuery,
  useCancelInvitationMutation,
  usePreviewInvitationQuery,
  useAcceptInvitationMutation,
} = workspacesApi;
