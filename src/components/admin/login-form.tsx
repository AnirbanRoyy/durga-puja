"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock01Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { login } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/components/admin/use-action-toast";
import { initialActionState } from "@/lib/validators";

export function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(login, initialActionState);
    useActionToast(state);
    return (
        <form action={action} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                />
            </div>
            <Button type="submit" size="lg" disabled={pending} className="h-10">
                {pending ? (
                    <DholSpinner data-icon="inline-start" />
                ) : (
                    <HugeiconsIcon icon={SquareLock01Icon} data-icon="inline-start" />
                )}
                Sign in
            </Button>
        </form>
    );
}
