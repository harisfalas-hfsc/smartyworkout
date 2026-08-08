import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | SmartyWorkout" },
      {
        name: "description",
        content:
          "How SmartyWorkout collects, uses, and protects your personal data — GDPR-compliant privacy policy for our AI-generated personalized training plans.",
      },
      { property: "og:title", content: "Privacy Policy — SmartyWorkout" },
      {
        property: "og:description",
        content: "How SmartyWorkout protects your personal data and training questionnaire responses.",
      },
      { property: "og:url", content: "https://smartyworkout.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" icon={<Shield className="h-5 w-5" />} lastUpdated="July 2026">
      <p>
        At <strong>SmartyWorkout</strong> (smartyworkout.com) we value your privacy and are committed to
        protecting your personal data. SmartyWorkout is part of the{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>{" "}
        family of brands — a science-based ecosystem for everyday human wellness — alongside our
        sister brands{" "}
        <a href="https://smartygym.com" target="_blank" rel="noopener noreferrer">
          SmartyGym
        </a>{" "}
        (train) and{" "}
        <a href="https://smartymove.com" target="_blank" rel="noopener noreferrer">
          SmartyMove
        </a>{" "}
        (assess), while SmartyWorkout focuses on fuel. This Privacy Policy explains how SmartyWorkout
        collects, uses, stores, and protects your information when you use our AI-generated
        personalized training service. Our practices comply with the General Data Protection
        Regulation (GDPR) (EU) 2016/679, the ePrivacy Directive 2002/58/EC, and applicable data
        protection laws worldwide.
      </p>

      <h2>1. Data We Collect</h2>
      <h3>Account &amp; Profile Data</h3>
      <ul>
        <li>Name, email address, and password (stored hashed) when you create an account.</li>
        <li>Optional profile information: display name, timezone, and notification preferences.</li>
      </ul>

      <h3>Questionnaire &amp; Training Data</h3>
      <ul>
        <li>
          Self-reported information from your training questionnaire: age, gender, height, weight,
          body composition metrics (BMR, BMI, body fat %, muscle mass — all optional), activity and
          training habits, sleep quality, goals, diet-style preferences, meal timing, foods you like
          and dislike, allergies and intolerances, cultural or religious restrictions, alcohol,
          caffeine and water intake.
        </li>
        <li>
          Practical constraints you provide: cooking skill and time, budget level, kitchen equipment,
          eating-out frequency.
        </li>
        <li>
          Health-screening answers: diagnosed medical conditions, medications affecting diet,
          pregnancy or breastfeeding status.
        </li>
        <li>Free-text notes and refinement requests you submit for your plan.</li>
        <li>Your generated workout plans, equipment lists, and plan history.</li>
      </ul>

      <h3>Usage &amp; Technical Data</h3>
      <ul>
        <li>Technical data such as IP address, browser type, device type, and operating system.</li>
        <li>Aggregated usage analytics (which steps you complete, refinements used).</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>Generate your personalized training plan and equipment list.</li>
        <li>Exclude injuries, disliked exercises, and unavailable equipment from your plan.</li>
        <li>Apply your refinement requests using remaining credits.</li>
        <li>Save your plans and history so you can view them at any time.</li>
        <li>
          Send transactional emails (account, security) and, with consent, product updates.
        </li>
        <li>Improve SmartyWorkout through anonymized, aggregated analytics.</li>
        <li>Ensure legal compliance and platform security.</li>
      </ul>
      <p>
        <strong>We will never sell or rent your personal data to third parties.</strong>
      </p>

      <h2>3. Legal Basis for Processing (GDPR Article 6)</h2>
      <ul>
        <li><strong>Consent (Art. 6(1)(a)):</strong> Marketing emails, optional analytics.</li>
        <li>
          <strong>Contractual necessity (Art. 6(1)(b)):</strong> Running the questionnaire, generating
          plans, and saving your plan history.
        </li>
        <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Record keeping, fraud prevention.</li>
        <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> Service security, product improvement.</li>
        <li>
          <strong>Health-related self-reports</strong> (injuries, conditions, medications, pregnancy)
          are processed only with your explicit consent and used solely to make your plan safer and
          more relevant. We do not share them for any other purpose.
        </li>
      </ul>

      <h2>4. Data Sharing &amp; Sub-Processors</h2>
      <ul>
        <li><strong>Lovable Cloud</strong> — database hosting and authentication.</li>
        <li>
          <strong>AI provider(s)</strong> — used only to generate your personalized plan from your
          questionnaire. Prompts are transmitted for the sole purpose of producing your plan; no
          direct identifiers (name, email) are sent to the AI provider unless strictly required.
        </li>
        <li><strong>Email delivery provider</strong> — for transactional and (with consent) marketing emails.</li>
      </ul>
      <p>
        All processors are required to comply with GDPR standards and maintain appropriate technical
        and organizational security measures.
      </p>

      <h2>5. Data Retention</h2>
      <ul>
        <li>
          <strong>Account data:</strong> retained while your account is active and deleted when you
          delete your account, except where short operational backup windows or legal obligations
          apply.
        </li>
        <li>
          <strong>Questionnaire &amp; plan data:</strong> retained while your account is active and
          deleted with your account.
        </li>
        <li><strong>Transaction records:</strong> retained for 7 years as required by tax law.</li>
        <li><strong>Marketing preferences:</strong> retained until you withdraw consent.</li>
        <li>
          <strong>Anonymized analytics:</strong> may be retained beyond account deletion in fully
          anonymized form.
        </li>
      </ul>

      <h2>6. Your Rights Under GDPR</h2>
      <ul>
        <li><strong>Right of Access (Art. 15)</strong></li>
        <li><strong>Right to Rectification (Art. 16)</strong></li>
        <li><strong>Right to Erasure (Art. 17)</strong> — delete your account and data from settings.</li>
        <li><strong>Right to Restrict Processing (Art. 18)</strong></li>
        <li><strong>Right to Data Portability (Art. 20)</strong> — download your data in JSON format.</li>
        <li><strong>Right to Object (Art. 21)</strong></li>
        <li><strong>Right to Withdraw Consent (Art. 7)</strong></li>
        <li><strong>Right to Lodge a Complaint</strong> with your local data protection authority.</li>
      </ul>
      <div className="note">
        To exercise these rights, use the controls in your profile settings or email{" "}
        <a href="mailto:smartyworkout@outlook.com">smartyworkout@outlook.com</a>. We respond within 30 days.
      </div>

      <h2>7. Security Measures</h2>
      <ul>
        <li>Encryption in transit (TLS 1.2+) and at rest (AES-256).</li>
        <li>Hashed passwords and secure session management.</li>
        <li>Row Level Security (RLS) ensuring each user can only access their own data.</li>
        <li>Strict access controls and least-privilege principles.</li>
        <li>Regular dependency, infrastructure, and security reviews.</li>
      </ul>

      <h2>8. Cookies &amp; Local Storage</h2>
      <p>SmartyWorkout uses cookies and local storage for the following purposes:</p>
      <ul>
        <li><strong>Essential:</strong> authentication tokens, session security, fraud prevention.</li>
        <li><strong>Functional:</strong> UI preferences, questionnaire progress.</li>
      </ul>

      <h2>9. Children</h2>
      <p>
        SmartyWorkout is intended for users aged 18 and over. Users between 13 and 18 may only use
        SmartyWorkout with parental or guardian supervision and consent. We do not knowingly collect
        data from children under 13.
      </p>

      <h2>10. International Transfers</h2>
      <p>
        Your data is primarily processed within the EU. Where transfers outside the EU are
        necessary, we rely on Standard Contractual Clauses or other lawful transfer mechanisms
        approved under GDPR.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify users of material
        changes via the app or email.
      </p>

      <h2>12. Contact</h2>
      <p>
        Data Controller: <strong>SmartyWorkout</strong> (smartyworkout.com), part of{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>
        , alongside sister brands{" "}
        <a href="https://smartygym.com" target="_blank" rel="noopener noreferrer">
          SmartyGym
        </a>{" "}
        and{" "}
        <a href="https://smartymove.com" target="_blank" rel="noopener noreferrer">
          SmartyMove
        </a>
        . Contact <a href="mailto:smartyworkout@outlook.com">smartyworkout@outlook.com</a>.
      </p>
    </LegalLayout>
  );
}
