import { Wind } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_ROUTES } from '@/config/routes';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
            <Wind className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Welcome to BreatheWise AI</CardTitle>
          <CardDescription>
            Your family profile stays private and is used only to personalize clean-air guidance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600">
            Firebase Authentication (Email/Password + Google Sign-In) is wired in Phase 2 against
            project <code className="font-semibold">agentora-ai-v2</code>.
          </p>
          <Link to={APP_ROUTES.HOME} className="block">
            <Button className="w-full">Continue to Dashboard Preview</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
