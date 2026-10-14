import AppLayout from '@layouts/AppLayout';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLoginRedirectSearch } from '@utils/authRedirect';
import { authStore } from '@stores/authStore';
import { requirePermission } from '@utils/authUtil';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const { isLogged } = context.authenticated;
    const isLoggedResult = await isLogged();

    if (!isLoggedResult) {
      throw redirect({
        to: '/login',
        search: getLoginRedirectSearch(location.href)
      });
    }

    // Navigation must not overwrite login permissions with a session-check response.
    const user = authStore.state.user;
    requirePermission(user, location.pathname);
    return { user, authenticated: { ...context.authenticated, user } };
  },
  component: RouteComponent
});

function RouteComponent() {
  return (
    <>
      <AppLayout />
    </>
  );
}
