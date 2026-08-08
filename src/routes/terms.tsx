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
        Welcome to <strong>SmartyWorkout</strong> (smartyworkout.com), part of the{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>{" "}
        family of brands, alongside our sister brands{" "}
        <a href="https://smartygym.com" target="_blank" rel="noopener noreferrer">
          SmartyGym
        </a>{" "}
        (train) and{" "}
        <a href="https://smartymove.com" target="_blank" rel="noopener noreferrer">
          SmartyMove
        </a>{" "}
        (assess). By accessing or using our AI-generated personalized training planning service,
        you agree to comply with and be bound by the following Terms &amp; Conditions. Please read
        them carefully before using SmartyWorkout.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using SmartyWorkout, you confirm that you have read, understood, and agree to
        these Terms &amp; Conditions. If you do not agree, please do not use our website or app.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use SmartyWorkout. Users between 13 and 18 may only use
        SmartyWorkout with the supervision and explicit consent of a parent or legal guardian.
      </p>

      <h2>3. What SmartyWorkout Is</h2>
      <p>
        SmartyWorkout is a web app that generates a personalized training plan from your answers to a
        comprehensive questionnaire. Specifically, SmartyWorkout provides:
      </p>
      <ul>
        <li>A multi-step training questionnaire covering your goals, body, activity, preferences, allergies, and constraints.</li>
        <li>An AI-generated personalized plan spanning 1, 2, or 4 weeks based on your selection.</li>
        <li>A consolidated equipment list and a short rationale explaining why the plan fits your goal.</li>
        <li>Up to two refinement requests per plan (e.g. "swap breakfast options", "less dairy").</li>
        <li>PDF export and printable grocery-list view.</li>
        <li>Access to your plan history from your account at any time.</li>
      </ul>
      <p>
        SmartyWorkout is intended for <strong>personal educational and wellness purposes only</strong> and
        is <strong>not a substitute for medical, training, or dietetic advice</strong>, diagnosis,
        or treatment.
      </p>
      <p>
        SmartyWorkout is one of three pillars in the Smarty Wellness ecosystem:{" "}
        <a href="https://smartygym.com" target="_blank" rel="noopener noreferrer">
          SmartyGym
        </a>{" "}
        (train),{" "}
        <a href="https://smartymove.com" target="_blank" rel="noopener noreferrer">
          SmartyMove
        </a>{" "}
        (assess), and SmartyWorkout (fuel). Each brand is a{" "}
        <strong>separate app with a separate account</strong> — your SmartyWorkout account does not
        grant access to SmartyGym or SmartyMove, and vice versa.
      </p>

      <h2>4. Account Registration</h2>
      <ul>
        <li>You must provide accurate, complete, and up-to-date information when creating your account.</li>
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You agree not to share your account with others.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
      </ul>

      <h2>5. Pricing (Free Service)</h2>
      <ul>
        <li>
          SmartyWorkout is <strong>free to use</strong>. There is no subscription, no one-time fee and
          no payment details are collected.
        </li>
        <li>
          Each plan includes <strong>3 AI credits</strong>: 1 initial plan generation plus 2
          refinements. Once all 3 credits have been used, the plan is locked as final and you can
          start a new plan for free.
        </li>
      </ul>

      <h2>6. Availability</h2>
      <ul>
        <li>
          Because the service is free, it is provided &quot;as is&quot; and we may change, limit or
          discontinue features at any time.
        </li>
        <li>Your statutory consumer rights under EU and national law remain unaffected.</li>
      </ul>

      <h2>7. Health &amp; Safety Requirements</h2>
      <ul>
        <li>
          <strong>Truthful disclosure:</strong> You must provide accurate answers, especially for
          allergies, intolerances, medical conditions, medications, and pregnancy or breastfeeding
          status. Inaccurate answers may lead to an unsafe plan.
        </li>
        <li>
          <strong>Medical consultation:</strong> Always consult a qualified medical or training
          professional before starting any new diet, especially if you have pre-existing conditions,
          take medications, are pregnant or breastfeeding, or have any concerns about your ability
          to change your diet safely.
        </li>
        <li>
          <strong>Stop and seek help:</strong> If you experience any adverse reaction, pain, or
          concerning symptoms, stop the plan immediately and seek medical care.
        </li>
        <li>
          Plans are designed for general wellness purposes and are not a medical diagnosis, medical
          training therapy, or treatment.
        </li>
        <li>
          <strong>Assumption of risk:</strong> Participation is entirely at your own risk. See our
          Disclaimer page for the complete release of liability.
        </li>
      </ul>

      <h2>8. AI-Generated Content</h2>
      <ul>
        <li>
          Plans are generated with the assistance of AI models based on your questionnaire responses
          and free-text notes.
        </li>
        <li>
          AI output may contain errors, omissions, or inappropriate suggestions. You are responsible
          for reviewing every plan before following it and for stopping if anything looks unsafe or
          incompatible with your health.
        </li>
        <li>
          Training values (calories, protein, carbs, fat) shown in plans are estimates and may
          differ from actual values.
        </li>
      </ul>

      <h2>9. Third-Party Services</h2>
      <ul>
        <li><strong>Lovable Cloud:</strong> Hosts the database and authentication.</li>
        <li><strong>AI provider(s):</strong> Used to generate your personalized plan.</li>
      </ul>

      <h2>10. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Reverse engineer, decompile, or attempt to extract the source code of SmartyWorkout.</li>
        <li>Use SmartyWorkout for any unlawful, harmful, or fraudulent purpose.</li>
        <li>Upload malicious content or attempt to interfere with the service.</li>
        <li>Resell, sublicense, or share access to your account or generated plans.</li>
        <li>Use SmartyWorkout to provide medical or training advice to other people.</li>
      </ul>

      <h2>11. Intellectual Property</h2>
      <p>
        All content, branding, methodology, source code, and copy in SmartyWorkout are the intellectual
        property of <strong>SmartyWorkout</strong> and its parent,{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>
        , and are protected by copyright, trademark, and other intellectual property laws. You
        receive a limited, personal, non-transferable, non-exclusive license to use SmartyWorkout for
        personal, non-commercial purposes only.
      </p>

      <h2>12. Account Deletion</h2>
      <ul>
        <li>You can delete your account at any time from your profile settings.</li>
        <li>Before deletion, you can download a copy of your account data.</li>
        <li>
          Account deletion permanently removes your profile, questionnaire responses, plans, and
          history, except where short operational backup windows or legal obligations apply.
        </li>
        <li>
          Deleting your account also forfeits any unused AI credits. There are no subscriptions to
          cancel.
        </li>
        <li>Some records (e.g. transaction history) may be retained where required by tax or legal obligations.</li>
      </ul>

      <h2>13. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, SmartyWorkout and its operator shall not be liable for
        any indirect, incidental, consequential, special, punitive, or exemplary damages arising
        from your use of SmartyWorkout, including but not limited to health issues, loss of data, lost
        profits, or business interruption. Nothing in these Terms excludes liability that cannot be
        excluded under applicable consumer protection law.
      </p>

      <h2>14. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify users of material changes via
        the app or email. Continued use of SmartyWorkout after changes take effect constitutes
        acceptance of the updated Terms.
      </p>

      <h2>15. Governing Law &amp; Jurisdiction</h2>
      <p>
        These Terms are governed by applicable law and EU regulations. Any disputes shall be subject
        to the jurisdiction of the competent courts, while preserving any mandatory consumer
        protection rights you have in your country of residence.
      </p>

      <h2>16. Contact</h2>
      <p>
        For questions about these Terms, contact <strong>SmartyWorkout</strong> (part of{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>
        ) at <a href="mailto:smartyworkout@outlook.com">smartyworkout@outlook.com</a>.
      </p>
    </LegalLayout>
  );
}
