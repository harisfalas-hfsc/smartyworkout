/**
 * Content source for the public /training topic pages.
 *
 * These pages exist to make the real capabilities of SmartyWorkout
 * discoverable by search engines and answer engines. Every claim below must
 * describe something the application actually does.
 */

export interface TopicSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface TopicFaq {
  q: string;
  a: string;
}

export interface TopicLink {
  to: string;
  label: string;
}

export interface TrainingTopic {
  slug: string;
  eyebrow: string;
  /** Visible H1 */
  h1: string;
  /** <title> */
  title: string;
  metaDescription: string;
  /** Short intro paragraph shown under the H1 */
  intro: string;
  sections: TopicSection[];
  faq: TopicFaq[];
  related: TopicLink[];
  /** Links into the real application functionality */
  appLinks: TopicLink[];
}

const START_LINKS: TopicLink[] = [
  { to: "/coach", label: "Create a personalized workout with Smarty Coach" },
  { to: "/wod", label: "Follow today's Workout of the Day" },
  { to: "/exercise-library", label: "Browse the exercise library" },
];

export const TRAINING_TOPICS: TrainingTopic[] = [
  {
    slug: "personalized-workouts",
    eyebrow: "Personalized training",
    h1: "Personalized Workouts Built Around You",
    title: "Personalized Workouts — Online Training Built Around You",
    metaDescription:
      "SmartyWorkout builds personalized workouts from your training profile: experience, goals, available time, equipment and limitations. Full sessions with sets, reps, tempo and rest.",
    intro:
      "A personalized workout is not a template with your name on it. On SmartyWorkout, every session is assembled from your own training profile and from how your last sessions actually went, then written out as a complete workout you can follow from the first warm-up drill to the last cool-down stretch.",
    sections: [
      {
        heading: "What personalization actually means here",
        body: "Before your first workout you complete a Training Profile once: biometrics, training experience, goals, weekly availability, the equipment you can reach, and any injuries or limitations. Smarty Coach treats that profile as a hard constraint, not a suggestion.",
        bullets: [
          "Exercises you cannot perform with your equipment are never selected",
          "Movements that conflict with a declared limitation are excluded",
          "Volume and intensity follow your stated experience level",
          "Session length is matched to the time you say you have",
        ],
      },
      {
        heading: "How a session is put together",
        body: "Each generated workout contains a warm-up, an activation block, the main work, a finisher where appropriate, and a cool-down. Every exercise carries sets, reps or work time, tempo, rest, and a demonstration so you never have to guess what the movement looks like.",
      },
      {
        heading: "The workout adapts because you log it",
        body: "After training you record what you actually did and answer a short session debrief covering effort, feeling and enjoyment. That feedback feeds the next generation, so the programme moves with you instead of repeating the same session forever.",
      },
      {
        heading: "Who it is for",
        body: "Beginners who want structure without hiring a coach, returning trainees managing an old injury, and experienced lifters who want session planning taken off their hands. The difficulty ladder runs from first-week beginner to advanced.",
      },
    ],
    faq: [
      {
        q: "Do I need to fill in the profile again for every workout?",
        a: "No. The Training Profile is completed once and can be edited whenever something changes. Before each session you answer a short questionnaire about today only — time, mood, focus and location.",
      },
      {
        q: "Can I train with no equipment at all?",
        a: "Yes. Select bodyweight only and the workout is built from movements that need nothing but floor space.",
      },
    ],
    related: [
      { to: "/training/strength-training", label: "Strength training workouts" },
      { to: "/training/home-workouts", label: "Home workouts" },
      { to: "/training/workout-programs", label: "Workout programs" },
    ],
    appLinks: START_LINKS,
  },
  {
    slug: "strength-training",
    eyebrow: "Strength",
    h1: "Strength Training Workouts",
    title: "Strength Training Workouts — Personalized Online Strength Plans",
    metaDescription:
      "Personalized strength training workouts from SmartyWorkout: compound-led sessions with prescribed sets, reps, tempo and rest, scaled to your experience and your available equipment.",
    intro:
      "Strength training is the work that makes you able to produce more force: heavier lifts, sturdier joints, better posture and a body that holds up under load. SmartyWorkout builds strength sessions around the equipment you actually own, from a full rack to a single pair of dumbbells.",
    sections: [
      {
        heading: "How strength sessions are structured",
        body: "A strength session leads with the movements that deserve your freshest effort — squat, hinge, press and pull patterns — and supports them with accessory work for the muscles those patterns depend on.",
        bullets: [
          "Lower rep ranges and longer rest on the primary lifts",
          "Accessory work programmed for the supporting muscle groups",
          "Tempo prescribed so each rep is trained, not just completed",
          "Progressive overload driven by what you logged last time",
        ],
      },
      {
        heading: "Equipment is respected, not assumed",
        body: "Barbell, dumbbells, kettlebells, machines, bands, or nothing at all — the generator only draws from movements you can perform with what you selected in your profile.",
      },
      {
        heading: "Tracking the numbers that matter",
        body: "Log your sets, reps and loads in the workout player. The logbook keeps every attempt, so repeating the same session shows you a direct comparison instead of a vague feeling of progress. The 1RM calculator estimates a one-rep max from a tested set.",
      },
    ],
    faq: [
      {
        q: "Is strength training suitable for beginners?",
        a: "Yes. Beginner sessions use manageable loads, simpler variations and higher rest, and the demonstrations show exactly how each movement should look.",
      },
      {
        q: "How often should I strength train?",
        a: "Most people do well with two to four strength sessions a week. Your profile's weekly availability shapes how the sessions are distributed.",
      },
    ],
    related: [
      { to: "/training/metabolic-conditioning", label: "Metabolic conditioning" },
      { to: "/training/mobility-and-stability", label: "Mobility and stability" },
      { to: "/training/workout-programs", label: "Workout programs" },
    ],
    appLinks: [
      ...START_LINKS,
      { to: "/tools/1rm-calculator", label: "Estimate your one-rep max" },
    ],
  },
  {
    slug: "cardio-workouts",
    eyebrow: "Cardio",
    h1: "Cardio Workouts and Aerobic Training",
    title: "Cardio Workouts — Personalized Online Aerobic Training",
    metaDescription:
      "Personalized cardio workouts from SmartyWorkout: steady aerobic work, intervals and machine-free options, with prescribed work and rest and a built-in interval timer.",
    intro:
      "Cardio training develops the engine underneath everything else — how long you can work, how hard you can push, and how quickly you recover between efforts. SmartyWorkout programmes cardio with the same precision as strength: defined work, defined rest, defined intent.",
    sections: [
      {
        heading: "Steady work and interval work",
        body: "Longer continuous efforts build the aerobic base that makes recovery between hard sets faster. Interval work raises your ceiling. Both are prescribed with explicit durations and rest so you know exactly when to push and when to back off.",
      },
      {
        heading: "With or without a machine",
        body: "If you have a bike, rower or treadmill, sessions use them. If you don't, cardio is built from locomotion and bodyweight circuits that need only floor space.",
        bullets: [
          "Machine intervals when equipment is available",
          "Bodyweight conditioning circuits when it is not",
          "Low-impact options when your profile declares joint limitations",
        ],
      },
      {
        heading: "Pace it properly",
        body: "The free workout timer runs the intervals for you, and the rounds tracker keeps count when a session is scored by rounds completed.",
      },
    ],
    faq: [
      {
        q: "Can I combine cardio with strength in one session?",
        a: "Yes. Sessions frequently end with a conditioning finisher after the main strength work, and you can ask for a mixed session in the pre-workout questionnaire.",
      },
      {
        q: "What if I have limited space?",
        a: "Declare it and the workout uses low-impact, small-footprint movements instead of running or jumping.",
      },
    ],
    related: [
      { to: "/training/metabolic-conditioning", label: "Metabolic conditioning" },
      { to: "/training/bodyweight-workouts", label: "Bodyweight workouts" },
      { to: "/training/home-workouts", label: "Home workouts" },
    ],
    appLinks: [
      ...START_LINKS,
      { to: "/tools/workout-timer", label: "Run intervals with the workout timer" },
    ],
  },
  {
    slug: "metabolic-conditioning",
    eyebrow: "Conditioning",
    h1: "Metabolic Conditioning Workouts",
    title: "Metabolic Workouts — Personalized Conditioning and Circuit Training",
    metaDescription:
      "Metabolic conditioning workouts from SmartyWorkout: AMRAP, EMOM and circuit formats built from your available equipment, with clear work-to-rest prescriptions and a rounds tracker.",
    intro:
      "Metabolic conditioning is high-density work: several movements strung together with controlled rest so the session keeps your output high from start to finish. It is where strength and cardio meet, and it is the fastest way to get a lot of quality work into a short window.",
    sections: [
      {
        heading: "Formats you will see",
        body: "Conditioning blocks are written in recognised formats so the intent is unambiguous.",
        bullets: [
          "AMRAP — as many rounds as possible in a fixed window",
          "EMOM — a prescribed piece of work at the top of every minute",
          "Circuits — fixed stations with defined work and rest",
          "For time — a set amount of work completed as fast as form allows",
        ],
      },
      {
        heading: "Density without chaos",
        body: "Movement selection avoids stacking two demanding patterns back to back, so fatigue does not turn the session into sloppy repetitions. Difficulty scales with your profile rather than assuming everyone can hold the same pace.",
      },
      {
        heading: "Short on time",
        body: "Tell the questionnaire you have twenty minutes and the session is built to be finished in twenty minutes — conditioning is where short sessions still deliver.",
      },
    ],
    faq: [
      {
        q: "Is metabolic conditioning the same as HIIT?",
        a: "HIIT is one kind of metabolic conditioning: very short, very hard intervals. Conditioning also covers moderate circuits and longer AMRAP work that you can sustain.",
      },
      {
        q: "Do I need a gym for this?",
        a: "No. Conditioning works with dumbbells, kettlebells, bands or bodyweight alone.",
      },
    ],
    related: [
      { to: "/training/cardio-workouts", label: "Cardio workouts" },
      { to: "/training/strength-training", label: "Strength training" },
      { to: "/training/bodyweight-workouts", label: "Bodyweight workouts" },
    ],
    appLinks: [
      ...START_LINKS,
      { to: "/tools/rounds-tracker", label: "Count rounds with the rounds tracker" },
    ],
  },
  {
    slug: "mobility-and-stability",
    eyebrow: "Mobility",
    h1: "Mobility and Stability Training",
    title: "Mobility and Stability Workouts — Move Better, Train Longer",
    metaDescription:
      "Mobility and stability work from SmartyWorkout: warm-ups, activation drills and cool-downs built into every session, plus movement work that respects your declared limitations.",
    intro:
      "Mobility is the range you can control; stability is your ability to hold position while producing force. Together they decide whether hard training makes you durable or sore. On SmartyWorkout this work is not an optional extra — it is written into every generated session.",
    sections: [
      {
        heading: "Built into every workout",
        body: "Each session opens with a warm-up and an activation block chosen for the patterns you are about to train, and closes with a cool-down that brings you back down and restores range.",
        bullets: [
          "Warm-up drills matched to the day's movement patterns",
          "Activation work for the muscles the main lifts depend on",
          "Cool-down and range work at the end of the session",
        ],
      },
      {
        heading: "Training around a limitation",
        body: "Declare a shoulder, knee, hip or back issue in your Training Profile and the generator avoids the movements that aggravate it while still training the surrounding area. A readiness screen runs before your first workout, and any flagged answer requires explicit acknowledgement before a session is produced.",
      },
      {
        heading: "Standalone mobility sessions",
        body: "Ask for a mobility-focused session in the questionnaire when you need a lighter day — recovery, travel, or the day after something heavy.",
      },
    ],
    faq: [
      {
        q: "Can mobility work replace a rest day?",
        a: "A low-intensity mobility session is a common way to stay consistent without adding fatigue, but genuine rest still matters.",
      },
      {
        q: "Is this physiotherapy?",
        a: "No. SmartyWorkout is a training platform, not a medical service, and it does not replace professional medical advice.",
      },
    ],
    related: [
      { to: "/training/bodyweight-workouts", label: "Bodyweight workouts" },
      { to: "/training/personalized-workouts", label: "Personalized workouts" },
      { to: "/training/strength-training", label: "Strength training" },
    ],
    appLinks: START_LINKS,
  },
  {
    slug: "bodyweight-workouts",
    eyebrow: "Bodyweight",
    h1: "Bodyweight Workouts With No Equipment",
    title: "Bodyweight Workouts — No Equipment Training Anywhere",
    metaDescription:
      "No-equipment bodyweight workouts from SmartyWorkout: full sessions using only your own body, scaled to your level, with demonstrations for every movement.",
    intro:
      "A bodyweight workout needs nothing but floor space, which makes it the most reliable training you own — it survives travel, closed gyms and busy evenings. SmartyWorkout treats bodyweight training as a full method, not a fallback.",
    sections: [
      {
        heading: "Scaling without equipment",
        body: "Without external load, difficulty comes from leverage, range, tempo and density. The generator uses all four, so the same movement can serve a first-week beginner and an advanced trainee at different variations.",
        bullets: [
          "Harder or easier variations of the same pattern",
          "Slower tempo and longer time under tension",
          "Shorter rest to raise the demand of a familiar circuit",
          "Unilateral versions when the bilateral one is too easy",
        ],
      },
      {
        heading: "The daily bodyweight option",
        body: "Workout of the Day is published in two variants every day — one using equipment and one bodyweight only — so the daily session is always available wherever you are.",
      },
      {
        heading: "Every movement is demonstrated",
        body: "The exercise library holds over 1,300 movements with animated demonstrations, filterable by muscle group, equipment and movement pattern.",
      },
    ],
    faq: [
      {
        q: "Can I build strength with only bodyweight training?",
        a: "Yes, particularly at beginner and intermediate levels, by progressing to harder variations and controlling tempo. Adding external load eventually becomes the simpler route for maximal strength.",
      },
      {
        q: "How long is a bodyweight session?",
        a: "Whatever you ask for. Sessions are built to the time you enter in the questionnaire.",
      },
    ],
    related: [
      { to: "/training/home-workouts", label: "Home workouts" },
      { to: "/training/metabolic-conditioning", label: "Metabolic conditioning" },
      { to: "/training/mobility-and-stability", label: "Mobility and stability" },
    ],
    appLinks: START_LINKS,
  },
  {
    slug: "home-workouts",
    eyebrow: "Home training",
    h1: "Home Workouts For Any Space and Any Kit",
    title: "Home Workouts — Personalized Training For Your Space and Kit",
    metaDescription:
      "Home workouts from SmartyWorkout, built around the equipment you actually own — dumbbells, kettlebells, bands or nothing at all — and the space and time you have today.",
    intro:
      "Most home training fails for one reason: the plan assumes equipment or space you do not have. SmartyWorkout starts from the opposite direction — you declare what is in the room, and the session is built from that.",
    sections: [
      {
        heading: "Your kit defines the session",
        body: "Tick the equipment you own once in your Training Profile, and adjust it per session if you are training somewhere else today.",
        bullets: [
          "Dumbbells, kettlebells, barbell, bands, suspension trainer, bench",
          "Cardio machines when you have them",
          "Bodyweight only when you have nothing",
        ],
      },
      {
        heading: "Short sessions still count",
        body: "Enter the time you genuinely have. A focused twenty-minute session that happens beats a sixty-minute session that does not.",
      },
      {
        heading: "Train offline",
        body: "SmartyWorkout works offline. Your workouts, logbook and the exercise library are downloaded quietly while you are online, so a weak signal in the garage does not stop the session.",
      },
    ],
    faq: [
      {
        q: "What if I only have one pair of dumbbells?",
        a: "That is enough. The generator selects movements and rep schemes that work with a single fixed load.",
      },
      {
        q: "Will neighbours hear me?",
        a: "Declare limited space or a shared building preference and jumping and high-impact movements are avoided.",
      },
    ],
    related: [
      { to: "/training/bodyweight-workouts", label: "Bodyweight workouts" },
      { to: "/training/online-training", label: "Online training" },
      { to: "/training/cardio-workouts", label: "Cardio workouts" },
    ],
    appLinks: START_LINKS,
  },
  {
    slug: "workout-programs",
    eyebrow: "Programs",
    h1: "Workout Programs and Daily Training Structure",
    title: "Workout Programs — Daily Structured Training Online",
    metaDescription:
      "Workout programs on SmartyWorkout: a periodized Workout of the Day calendar plus on-demand personalized sessions, with a logbook, scheduling and progress tracking.",
    intro:
      "A programme is what turns scattered workouts into progress: the right stimulus, in the right order, repeated long enough to matter. SmartyWorkout offers two routes — a shared daily calendar, or sessions generated on demand around your own week.",
    sections: [
      {
        heading: "Workout of the Day",
        body: "A fixed, periodized calendar published daily and identical for every subscriber, delivered in a bodyweight variant and an equipment variant, then adapted to your training profile. You do not answer a questionnaire — you open it and train.",
      },
      {
        heading: "On-demand personalized sessions",
        body: "When you want to steer the week yourself, Smarty Coach builds a session from today's answers: goal, focus, time, location and equipment.",
      },
      {
        heading: "Plan the week, keep the record",
        body: "Schedule sessions in the calendar, mark them done, reschedule what slipped, and review every past workout in the logbook.",
        bullets: [
          "Calendar scheduling with completed, upcoming and missed states",
          "Full history of every generated session",
          "Progress tracking and training load from what you logged",
          "PDF export of any workout",
        ],
      },
    ],
    faq: [
      {
        q: "Should I follow the daily programme or generate my own?",
        a: "Follow the Workout of the Day when you want the decision made for you and the same progression as everyone else. Generate your own when your time, equipment or focus changes day to day.",
      },
      {
        q: "Is the Workout of the Day the same for everyone?",
        a: "The daily session is the same for every subscriber; the exercise selection is then adapted to your equipment and limitations.",
      },
    ],
    related: [
      { to: "/training/personalized-workouts", label: "Personalized workouts" },
      { to: "/training/strength-training", label: "Strength training" },
      { to: "/training/online-training", label: "Online training" },
    ],
    appLinks: START_LINKS,
  },
  {
    slug: "online-training",
    eyebrow: "Online fitness",
    h1: "Online Training and Online Fitness With SmartyWorkout",
    title: "Online Training — Online Fitness and Personalized Workouts",
    metaDescription:
      "Online fitness with SmartyWorkout: personalized online training built by Smarty Coach from your profile, with 1,300+ demonstrated exercises, a guided player, logbook and progress tracking.",
    intro:
      "Online training only works when the plan knows something about you. SmartyWorkout is an online fitness platform that generates a complete, personalized workout in seconds from your training profile and a short pre-workout questionnaire, using only exercises from a curated library of demonstrated movements.",
    sections: [
      {
        heading: "What you get",
        body: "Everything needed to train properly without a coach standing next to you.",
        bullets: [
          "Personalized workouts with warm-up, main work, finisher and cool-down",
          "A daily Workout of the Day in bodyweight and equipment variants",
          "An exercise library of 1,300+ demonstrated movements",
          "A guided player with rest timers that keeps the screen awake",
          "Logbook, calendar scheduling and progress tracking",
          "Free workout timer, rounds tracker and 1RM calculator",
        ],
      },
      {
        heading: "What makes it different",
        body: "The programming methodology comes from sports scientist Haris Falas, and the generator can only choose from the curated exercise library — it cannot invent a movement, and it cannot prescribe something your equipment or limitations rule out.",
      },
      {
        heading: "How to start",
        body: "Create an account, complete the Training Profile once, then either open the Workout of the Day or ask Smarty Coach for a session. A single membership covers everything at €9.99 per month.",
      },
    ],
    faq: [
      {
        q: "Do I need a gym membership?",
        a: "No. Sessions are built from whatever equipment you declare, including none.",
      },
      {
        q: "Is there a diet or meal plan?",
        a: "No. SmartyWorkout generates workouts, not diets.",
      },
    ],
    related: [
      { to: "/training/personalized-workouts", label: "Personalized workouts" },
      { to: "/training/workout-programs", label: "Workout programs" },
      { to: "/training/home-workouts", label: "Home workouts" },
    ],
    appLinks: [
      ...START_LINKS,
      { to: "/how-it-works", label: "See how a workout is built, step by step" },
      { to: "/pricing", label: "See membership pricing" },
    ],
  },
];

export const TOPIC_BY_SLUG: Record<string, TrainingTopic> = Object.fromEntries(
  TRAINING_TOPICS.map((t) => [t.slug, t]),
);

export const TRAINING_TOPIC_SLUGS = TRAINING_TOPICS.map((t) => t.slug);
