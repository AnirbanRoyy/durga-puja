import { notFound } from "next/navigation";
import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { BrainGamesConsole } from "@/components/admin/brain-games-console";
import { getProgrammeById, getQuizAdmin, quizLeaderboard } from "@/lib/queries";

export const metadata = { title: "Brain games" };

export default async function BrainGamesAdminPage(
    props: PageProps<"/admin/programmes/[id]/brain-games">,
) {
    const { id } = await props.params;
    const target = { programmeId: id };
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const programme = await getProgrammeById(id);
    if (!programme || programme.type !== "quiz") {
        notFound();
    }

    const { rounds, questions, teams } = await getQuizAdmin(id);

    return (
        <AdminPermissions flags={can}>
            <AdminTitle
                title="Brain games"
                description="Set up rounds and questions, then ask them live. The answer reaches everyone's screen when you press Correct, Wrong or Reveal."
            />
            <BrainGamesConsole
                programmeId={id}
                rounds={rounds}
                questions={questions}
                teams={teams}
                leaderboard={quizLeaderboard(teams, questions)}
            />
        </AdminPermissions>
    );
}
