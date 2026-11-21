import { Suspense } from "react";
import LoginForm from "./LoginForm";

// force-dynamic: without it this route is statically prerendered and Next
// serves it WITHOUT running proxy.ts — so a signed-in user visiting /login
// would see the sign-in form instead of being redirected to the app.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
