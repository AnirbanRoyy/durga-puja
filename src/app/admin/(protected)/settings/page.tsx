import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import { DonationForm, EventForm } from "@/components/admin/settings-forms";
import { getDonationSettings, getEventSettings } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
    const [event, donation] = await Promise.all([getEventSettings(), getDonationSettings()]);
    return (
        <>
            <AdminTitle title="Settings" />
            <div className="grid max-w-3xl gap-8">
                <AdminCard title="Event">
                    <EventForm event={event} />
                </AdminCard>
                <AdminCard title="Donations">
                    <DonationForm donation={donation} />
                </AdminCard>
            </div>
        </>
    );
}
