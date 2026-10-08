"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { login } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validators";

export function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(login, initialActionState);
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
            {state.code && (
                <p role="alert" className="text-sm text-destructive">
                    {state.code}
                </p>
            )}
            <Button type="submit" size="lg" disabled={pending} className="h-10">
                <HugeiconsIcon
                    icon={pending ? Loading03Icon : SquareLock01Icon}
                    className={pending ? "animate-spin" : undefined}
                    data-icon="inline-start"
                />
                Sign in
            </Button>
        </form>
    );
}
