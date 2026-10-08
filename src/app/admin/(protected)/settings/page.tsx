import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import { AmbientForm, DonationForm, EventForm } from "@/components/admin/settings-forms";
import { getAmbientSettings, getDonationSettings, getEventSettings } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
    const [event, donation, ambient] = await Promise.all([
        getEventSettings(),
        getDonationSettings(),
        getAmbientSettings(),
    ]);
    return (
        <>
            <AdminTitle title="Settings" />
            <div className="grid max-w-3xl gap-8">
                <AdminCard title="Event">
                    <EventForm event={event} />
                </AdminCard>
                <AdminCard title="Background music">
                    <AmbientForm ambient={ambient} />
                </AdminCard>
                <AdminCard title="Donations">
                    <DonationForm donation={donation} />
                </AdminCard>
            </div>
        </>
    );
}
