import { notFound } from "next/navigation";
import { AdminTitle } from "@/components/admin/admin-bits";
import { BackLink } from "@/components/admin/back-link";
import { BrainGamesConsole } from "@/components/admin/brain-games-console";
import { getProgrammeById, getQuizAdmin, quizLeaderboard } from "@/lib/queries";

export const metadata = { title: "Brain games" };

export default async function BrainGamesAdminPage(
    props: PageProps<"/admin/programmes/[id]/brain-games">,
) {
    const { id } = await props.params;
    const programme = await getProgrammeById(id);
    if (!programme || programme.type !== "quiz") notFound();

    const { rounds, questions, teams } = await getQuizAdmin(id);

    return (
        <>
            <BackLink href={`/admin/programmes/${id}`} label={programme.title_en} />
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
        </>
    );
}
