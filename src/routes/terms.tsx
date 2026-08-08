import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | SmartyWorkout" },
      {
        name: "description",
        content:
          "Terms and conditions for using SmartyWorkout — an AI-generated personalized training planning app, part of the Smarty family.",
      },
      { property: "og:title", content: "Terms & Conditions — SmartyWorkout" },
      {
        property: "og:description",
        content: "Legal terms for using the SmartyWorkout AI training planning app.",
      },
      { property: "og:url", content: "https://smartyworkout.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" icon={<FileText className="h-5 w-5" />} lastUpdated="July 2026">
      <p>
        Welcome to <strong>Smarty Workout</strong> (smartyworkout.com). By accessing or using our
        AI-generated personalized training service, you agree to comply with and be bound by the
        following Terms &amp; Conditions. Please read them carefully before using Smarty Workout.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Smarty Workout, you confirm that you have read, understood, and agree
        to these Terms &amp; Conditions. If you do not agree, please do not use our website or app.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use Smarty Workout. Users between 13 and 18 may only
        use Smarty Workout with the supervision and explicit consent of a parent or legal guardian.
      </p>

      <h2>3. What Smarty Workout Is</h2>
      <p>
        Smarty Workout is a web app that generates personalized training sessions using AI.
        Specifically, Smarty Workout provides:
      </p>
      <ul>
        <li>Up to two AI-generated workouts per day, tailored to your goals, equipment, and fitness level.</li>
        <li>A searchable exercise library with instructions and technique guidance.</li>
        <li>Training tools to help you plan and track your sessions.</li>
        <li>A workout logbook to record your sets, reps, weights, and progress over time.</li>
        <li>Access to your workout history from your account at any time.</li>
      </ul>
      <p>
        Smarty Workout is intended for <strong>personal educational and fitness purposes only</strong>{" "}
        and is <strong>not a substitute for medical or professional training advice</strong>,
        diagnosis, or treatment.
      </p>

      <h2>4. Account Registration</h2>
      <ul>
        <li>You must provide accurate, complete, and up-to-date information when creating your account.</li>
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You agree not to share your account with others.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
      </ul>

      <h2>5. Membership &amp; Pricing</h2>
      <ul>
        <li>
          Smarty Workout offers a single paid membership priced at <strong>€9.99 per month</strong>,
          which gives you access to up to 2 AI-generated workouts per day, the full exercise
          library, our training tools, and your workout logbook.
        </li>
        <li>
          Your membership renews automatically each month until you cancel. You can cancel at any
          time from your account settings; access continues until the end of the current billing
          period.
        </li>
        <li>Prices may change with prior notice. Continued use after a price change constitutes acceptance of the new price.</li>
      </ul>

      <h2>6. Availability</h2>
      <ul>
        <li>
          The service is provided &quot;as is&quot; and we may change, improve, or discontinue
          individual features at any time, provided this does not materially reduce the value of
          your paid membership without notice.
        </li>
        <li>Your statutory consumer rights under EU and national law remain unaffected.</li>
      </ul>

      <h2>7. Health &amp; Safety Requirements</h2>
      <ul>
        <li>
          <strong>Truthful disclosure:</strong> You must provide accurate answers about your
          fitness level, injuries, medical conditions, and any physical limitations. Inaccurate
          answers may lead to an unsafe workout.
        </li>
        <li>
          <strong>Medical consultation:</strong> Always consult a qualified medical or training
          professional before starting any new exercise program, especially if you have
          pre-existing conditions, are pregnant, or have any concerns about your ability to
          exercise safely.
        </li>
        <li>
          <strong>Stop and seek help:</strong> If you experience pain, dizziness, or any concerning
          symptoms during a workout, stop immediately and seek medical care.
        </li>
        <li>
          Workouts are designed for general fitness purposes and are not a medical diagnosis,
          physical therapy, or treatment.
        </li>
        <li>
          <strong>Assumption of risk:</strong> Participation is entirely at your own risk. See our
          Disclaimer page for the complete release of liability.
        </li>
      </ul>

      <h2>8. AI-Generated Content</h2>
      <ul>
        <li>
          Workouts are generated with the assistance of AI models based on your profile,
          preferences, and equipment availability.
        </li>
        <li>
          AI output may contain errors, omissions, or inappropriate suggestions. You are
          responsible for reviewing every workout before performing it and for stopping if
          anything looks unsafe or incompatible with your fitness level.
        </li>
        <li>
          Estimated calorie burn or intensity values shown in workouts are approximations and may
          differ from actual values.
        </li>
      </ul>

      <h2>9. Third-Party Services</h2>
      <ul>
        <li><strong>Hosting &amp; infrastructure providers:</strong> Host the database, authentication, and payment processing.</li>
        <li><strong>AI provider(s):</strong> Used to generate your personalized workouts.</li>
        <li><strong>Payment processor:</strong> Used to securely process your monthly membership payment.</li>
      </ul>

      <h2>10. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Reverse engineer, decompile, or attempt to extract the source code of Smarty Workout.</li>
        <li>Use Smarty Workout for any unlawful, harmful, or fraudulent purpose.</li>
        <li>Upload malicious content or attempt to interfere with the service.</li>
        <li>Resell, sublicense, or share access to your account or generated workouts.</li>
        <li>Use Smarty Workout to provide medical or training advice to other people.</li>
      </ul>

      <h2>11. Intellectual Property</h2>
      <p>
        All content, branding, methodology, source code, and copy in Smarty Workout are the
        intellectual property of <strong>Smarty Workout</strong> and are protected by copyright,
        trademark, and other intellectual property laws. You receive a limited, personal,
        non-transferable, non-exclusive license to use Smarty Workout for personal, non-commercial
        purposes only.
      </p>

      <h2>12. Account Deletion &amp; Cancellation</h2>
      <ul>
        <li>You can cancel your membership and delete your account at any time from your profile settings.</li>
        <li>Before deletion, you can download a copy of your account data.</li>
        <li>
          Account deletion permanently removes your profile, preferences, generated workouts, and
          logbook history, except where short operational backup windows or legal obligations apply.
        </li>
        <li>Some records (e.g. transaction history) may be retained where required by tax or legal obligations.</li>
      </ul>

      <h2>13. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Smarty Workout shall not be liable for any
        indirect, incidental, consequential, special, punitive, or exemplary damages arising from
        your use of Smarty Workout, including but not limited to injury, loss of data, lost
        profits, or business interruption. Nothing in these Terms excludes liability that cannot be
        excluded under applicable consumer protection law.
      </p>

      <h2>14. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify users of material changes via
        the app or email. Continued use of Smarty Workout after changes take effect constitutes
        acceptance of the updated Terms.
      </p>

      <h2>15. Governing Law &amp; Jurisdiction</h2>
      <p>
        These Terms are governed by applicable law and EU regulations. Any disputes shall be
        subject to the jurisdiction of the competent courts, while preserving any mandatory
        consumer protection rights you have in your country of residence.
      </p>

      <h2>16. Contact</h2>
      <p>
        For questions about these Terms, contact <strong>Smarty Workout</strong> at{" "}
        <a href="mailto:support@smartyworkout.com">support@smartyworkout.com</a>.
      </p>
    </LegalLayout>
  );
}
