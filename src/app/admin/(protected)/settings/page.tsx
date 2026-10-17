import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import {
    AmbientForm,
    DonationForm,
    EventForm,
    WhatsappForm,
} from "@/components/admin/settings-forms";
import {
    getAmbientSettings,
    getDonationSettings,
    getEventSettings,
    getWhatsappSettings,
} from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
    const target = { area: "settings" } as const;
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const [event, donation, ambient, whatsapp] = await Promise.all([
        getEventSettings(),
        getDonationSettings(),
        getAmbientSettings(),
        getWhatsappSettings(),
    ]);
    return (
        <AdminPermissions flags={can}>
            <AdminTitle title="Settings" />
            <div className="grid max-w-3xl grid-cols-1 gap-8">
                <AdminCard title={`Event (${event.year})`}>
                    <fieldset disabled={!can.update} className="min-w-0">
                        <EventForm event={event} />
                    </fieldset>
                </AdminCard>
                <AdminCard title="Background music">
                    <fieldset disabled={!can.update} className="min-w-0">
                        <AmbientForm ambient={ambient} />
                    </fieldset>
                </AdminCard>
                <AdminCard title="WhatsApp community">
                    <fieldset disabled={!can.update} className="min-w-0">
                        <WhatsappForm whatsapp={whatsapp} />
                    </fieldset>
                </AdminCard>
                <AdminCard title="Donations">
                    <fieldset disabled={!can.update} className="min-w-0">
                        <DonationForm donation={donation} />
                    </fieldset>
                </AdminCard>
            </div>
        </AdminPermissions>
    );
}
