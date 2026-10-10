"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { deleteRegistration } from "@/actions/admin/programmes";
import { adminUpdateRegistration } from "@/actions/admin/registrations";
import { useAdminRun } from "@/components/admin/use-admin-run";
import { RegistrationForm } from "@/components/programmes/registration-form";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { ProgrammeType } from "@/lib/database.types";
import type { TeamSetup } from "@/lib/programme-meta";
import type { RegistrationWithPhone } from "@/lib/queries";

export type RegistrationProgramme = {
    id: string;
    title: string;
    type: ProgrammeType;
    team?: TeamSetup;
};

/** Pencil button that opens the registration in a dialog, with the same form participants use. */
export function EditRegistrationButton({
    registration,
    programme,
}: {
    registration: RegistrationWithPhone;
    programme: RegistrationProgramme;
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" title="Edit">
                    <HugeiconsIcon icon={PencilEdit02Icon} />
                    <span className="sr-only">Edit {registration.name}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit registration</DialogTitle>
                    <DialogDescription>{programme.title}</DialogDescription>
                </DialogHeader>
                <RegistrationForm
                    programmeId={programme.id}
                    programmeType={programme.type}
                    team={programme.team}
                    registrationId={registration.id}
                    action={adminUpdateRegistration}
                    existing={{
                        name: registration.name,
                        phone: registration.phone ?? "",
                        age: registration.age,
                        guardianName: registration.guardian_name,
                        notes: registration.notes,
                        members: registration.members,
                    }}
                    onSaved={() => {
                        toast.success("Registration updated");
                        setOpen(false);
                        router.refresh();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}

/** Trash button with a confirmation dialog; removing frees the person to register again. */
export function DeleteRegistrationButton({
    registration,
    programmeTitle,
}: {
    registration: Pick<RegistrationWithPhone, "id" | "name">;
    programmeTitle: string;
}) {
    const { pending, run } = useAdminRun();
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" title="Delete" disabled={pending}>
                    <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                    <span className="sr-only">Delete {registration.name}</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{registration.name}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This removes their registration for {programmeTitle}. They can register
                        again afterwards.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() =>
                            run(() => deleteRegistration(registration.id), "Registration deleted")
                        }
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
