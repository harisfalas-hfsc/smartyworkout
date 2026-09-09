import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer & Release of Liability | SmartyWorkout" },
      {
        name: "description",
        content:
          "SmartyWorkout disclaimer and release of liability for our AI-generated personalized workouts.",
      },
      { property: "og:title", content: "Disclaimer — SmartyWorkout" },
      {
        property: "og:description",
        content: "Important safety, health, and liability information for SmartyWorkout users.",
      },
      { property: "og:url", content: "https://smartyworkout.com/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/disclaimer" }],
  }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <LegalLayout
      title="Disclaimer & Release of Liability"
      icon={<AlertTriangle className="h-5 w-5" />}
      lastUpdated="July 2026"
    >
      <div className="callout">
        <strong>⚠️ Not medical or training advice.</strong> Smarty Workout generates general
        fitness workouts using AI based on the information you provide. It is not a doctor,
        physical therapist, or personal trainer. Before starting any workout, and especially if
        you have any medical condition, are pregnant, or have an injury history, consult a
        qualified professional.
      </div>

      <p>
        The information provided by <strong>Smarty Workout</strong> (smartyworkout.com) is
        intended solely for <strong>general educational and fitness purposes</strong>. Smarty
        Workout does not provide medical, physiotherapy, or personal training advice, diagnosis,
        or treatment.
      </p>

      <h2>1. Not Medical or Training Advice</h2>
      <ul>
        <li>The workouts, exercise library, tools, and educational content in Smarty Workout are <strong>for general fitness purposes only</strong>.</li>
        <li>Always <strong>consult a qualified medical or training professional</strong> before starting any new exercise program — especially if you have heart, joint, or respiratory conditions, an injury history, or other health concerns; or are pregnant.</li>
        <li>Do not disregard or delay professional advice because of information provided by Smarty Workout.</li>
        <li>If you experience any pain, dizziness, or adverse reaction while following a Smarty Workout session, <strong>stop immediately and seek medical attention</strong>.</li>
      </ul>

      <h2>2. Fitness Screening &amp; Truthful Disclosure</h2>
      <p>
        Before starting, you may be asked a short set of readiness questions covering things like
        chest pain, dizziness, joint problems, medications, pregnancy, and other conditions that
        affect safe exercise (similar to a standard physical-activity readiness questionnaire). If
        you answer "yes" to any such question, or are unsure about your ability to exercise
        safely, you should consult a doctor before using Smarty Workout.
      </p>
      <ul>
        <li>You are responsible for providing accurate and complete information about your fitness level, injuries, and health conditions.</li>
        <li>Inaccurate answers may result in a workout that is unsafe or unsuitable for you.</li>
        <li>You must update your profile and generate a new workout whenever your health status changes.</li>
      </ul>

      <h2>3. AI-Generated Content</h2>
      <ul>
        <li>Workouts are generated with the assistance of AI and may contain errors, omissions, or inappropriate suggestions.</li>
        <li>You are responsible for reviewing every workout carefully before performing it, and for adjusting or skipping any exercise that could interact with your health or physical limitations.</li>
        <li>Intensity and calorie-burn estimates shown in workouts are approximate and may differ from actual values.</li>
      </ul>

      <h2>4. Assumption of Risk</h2>
      <ul>
        <li>By using Smarty Workout, you <strong>voluntarily assume all risks</strong> associated with physical exercise, including any injury, muscle strain, cardiovascular event, or aggravation of a pre-existing condition.</li>
        <li>Smarty Workout, its operator, affiliates, and contributors <strong>accept no responsibility</strong> for any illness, injury, or health-related issue that may occur during or after your use of Smarty Workout.</li>
      </ul>

      <h2>5. Individual Responsibility</h2>
      <ul>
        <li>You are responsible for exercising within your <strong>personal limits and abilities</strong> and for skipping or adjusting any exercise that does not feel safe for you.</li>
        <li>Minors (under 18) must use Smarty Workout only with supervision and prior medical clearance from a qualified healthcare professional.</li>
      </ul>

      <h2>6. No Guarantee of Results</h2>
      <ul>
        <li>Results vary by individual based on age, health status, genetics, lifestyle, consistency, and adherence to the workout program.</li>
        <li>Smarty Workout <strong>does not guarantee</strong> any specific weight change, body-composition change, performance improvement, or health outcome.</li>
      </ul>

      <h2>7. Release of Liability &amp; Waiver of Claims</h2>
      <p>To the fullest extent permitted by law in the European Union and internationally:</p>
      <ul>
        <li>
          <strong>Complete release:</strong> By using Smarty Workout, you voluntarily and knowingly
          assume all risks associated with physical exercise and hereby <strong>RELEASE, WAIVE,
          DISCHARGE, AND COVENANT NOT TO SUE</strong> Smarty Workout and its respective operators,
          owners, contributors, employees, contractors, affiliates, and agents from any and all
          liability arising from your use of Smarty Workout.
        </li>
        <li>
          <strong>No liability:</strong> Smarty Workout and its representatives <strong>shall not
          be held liable</strong> for any direct, indirect, incidental, consequential, special,
          punitive, or exemplary damages arising from participation in any workout generated by
          Smarty Workout, including but not limited to:
          <ul>
            <li>Personal illness, injury, or disability</li>
            <li>Aggravation of pre-existing medical conditions</li>
            <li>Medical expenses or costs</li>
            <li>Lost wages or income</li>
            <li>Pain and suffering</li>
            <li>Emotional distress</li>
          </ul>
        </li>
        <li>
          <strong>Waiver of right to sue:</strong> You expressly waive any right to bring legal
          action against Smarty Workout for injuries, illnesses, or damages sustained during or
          after use of any workout.
        </li>
        <li>
          <strong>Indemnification:</strong> You agree to indemnify and hold harmless Smarty
          Workout from any claims, damages, or expenses (including legal fees) arising from your
          use of Smarty Workout or breach of this Disclaimer.
        </li>
      </ul>
      <p>
        Nothing in this Disclaimer excludes or limits liability that cannot be excluded or limited
        under applicable law, including your statutory rights as a consumer under EU
        consumer-protection directives.
      </p>

      <h2>8. Jurisdiction &amp; Governing Law</h2>
      <p>
        This Disclaimer is governed by applicable law and EU regulations. Any disputes shall be
        subject to the jurisdiction of the competent courts, while preserving any mandatory
        consumer protection rights you have in your country of residence.
      </p>

      <div className="callout">
        <strong>⚠️ Acceptance and acknowledgment.</strong> By accessing and using Smarty Workout,
        you acknowledge and confirm that you have:
        <ul>
          <li><strong>Read and understood</strong> this entire Disclaimer and Release of Liability.</li>
          <li><strong>Provided truthful answers</strong> about your fitness level, injuries, and health conditions.</li>
          <li><strong>Obtained medical clearance</strong> if your health status requires it.</li>
          <li><strong>Voluntarily assumed all risks</strong> associated with physical exercise.</li>
          <li><strong>Released Smarty Workout from all liability</strong> for any illness, injury, or damages arising from your use of the app.</li>
          <li><strong>Agreed to use Smarty Workout at your own risk.</strong></li>
        </ul>
        <p style={{ marginTop: 8, fontWeight: 700 }}>
          If you do not agree with any part of this Disclaimer, do not use Smarty Workout.
        </p>
      </div>
    </LegalLayout>
  );
}
