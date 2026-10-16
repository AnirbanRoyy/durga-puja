"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Trash button that asks first. */
export function ConfirmDeleteButton({
    title,
    description,
    disabled,
    disabledReason,
    onConfirm,
}: Readonly<{
    title: string;
    description: string;
    disabled?: boolean;
    /** Shown as the button's tooltip when it's disabled. */
    disabledReason?: string;
    onConfirm: () => void;
}>) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={disabled}
                    title={disabled ? disabledReason : "Delete"}
                >
                    <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                    <span className="sr-only">{title}</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onConfirm}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
