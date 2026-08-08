import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import harisPhoto from "@/assets/haris-falas-coach.png";
import { PageHeader } from "@/components/PageHeader";

const URL = "https://smartyworkout.com/haris-falas";
const TITLE =
  "Haris Falas — Sports Scientist & Strength Coach | Smarty Workout";
const DESCRIPTION =
  "Haris Falas: BSc Sport Science, EXOS Performance Specialist, 20+ years in strength & conditioning and elite football. The training philosophy behind Smarty Coach.";

export const Route = createFileRoute("/haris-falas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: CoachProfilePage,
});

const QUALIFICATIONS = [
  "Sports Scientist specialised in Football Performance",
  "Strength and Conditioning Coach",
  "MBA in Marketing",
  "EXOS Performance and Rehab Specialist",
  "FMS Specialist",
  "ACE Medical Exercise Specialist",
  "NSCA CSCS",
];

const PROJECTS: { name: string; href: string; desc: string }[] = [
  {
    name: "SmartyMove",
    href: "https://smarty-motion-pro.lovable.app",
    desc: "Posture and movement screening",
  },
  {
    name: "SmartyDiet",
    href: "https://smarty-meals-hub.lovable.app",
    desc: "Personalized nutrition planning",
  },
  {
    name: "SmartyGym",
    href: "https://smartygym.com",
    desc: "Workouts and training programs",
  },
];


function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
          <span className="mt-1 shrink-0 text-primary">•</span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CoachProfilePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-primary sm:h-40 sm:w-40">
          <img
            src={harisPhoto}
            alt="Haris Falas — Sports Scientist and Strength & Conditioning Coach"
            className="h-full w-full object-cover object-center"
            width={320}
            height={320}
            loading="eager"
            decoding="async"
          />
        </div>
        <PageHeader
          className="mb-0 mt-4"
          title={
            <>
              Haris <span className="text-primary">Falas</span>
            </>
          }
          subtitle="Sports Scientist and Strength & Conditioning Coach"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary sm:text-2xl">
              Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bullets items={QUALIFICATIONS} />
          </CardContent>
        </Card>

        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary sm:text-2xl">
              Professional Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bullets
              items={[
                "Strength and Conditioning Coach in elite football",
                "Worked with top-level football teams",
                "Designed performance programs and injury-prevention systems",
                <>
                  Founder and Head Coach of{" "}
                  <a
                    href="https://hfsc.eu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    HFSC
                  </a>
                </>,
                <>
                  Founder of the Smarty ecosystem:{" "}
                  {PROJECTS.map((p, i) => (
                    <span key={p.name}>
                      {i > 0 ? ", " : ""}
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        {p.name}
                      </a>
                    </span>
                  ))}
                </>,
              ]}
            />
          </CardContent>
        </Card>
      </div>


      <div className="mt-10 flex flex-col items-center gap-3">
        <Button asChild size="lg" className="font-extrabold uppercase">
          <Link to="/coach">Create your workout</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Train with confidence under expert guidance
        </p>
      </div>
    </main>
  );
}
