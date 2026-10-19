import { clerkMiddleware } from '@clerk/astro/server';

export const onRequest = clerkMiddleware((auth, context) => {
  const { redirectToSignIn, userId } = auth();

  // Redirect unauthenticated users away from protected routes
  if (!userId && context.url.pathname.startsWith('/dashboard')) {
    return redirectToSignIn();
  }
});
