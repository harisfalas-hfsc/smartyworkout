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
          "SmartyWorkout disclaimer and release of liability for our AI-generated personalized training plans.",
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
        <strong>⚠️ Not medical or training advice.</strong> SmartyWorkout generates general wellness
        training plans using AI based on the answers you provide. It is not a doctor, coach, or
        any other healthcare provider. Before starting any plan, and especially if you have any
        medical condition, take medications, are pregnant or breastfeeding, or have an eating
        disorder history, consult a qualified professional.
      </div>

      <p>
        The information provided by <strong>SmartyWorkout</strong> (smartyworkout.com), part of the{" "}
        <a href="https://smartywellness.com" target="_blank" rel="noopener noreferrer">
          Smarty Wellness
        </a>{" "}
        family of brands (alongside{" "}
        <a href="https://smartygym.com" target="_blank" rel="noopener noreferrer">
          SmartyGym
        </a>{" "}
        and{" "}
        <a href="https://smartymove.com" target="_blank" rel="noopener noreferrer">
          SmartyMove
        </a>
        ), is intended solely for <strong>general educational and wellness purposes</strong>.
        SmartyWorkout does not provide medical, physiotherapy, or dietetic advice, diagnosis, or
        treatment.
      </p>

      <h2>1. Not Medical or Training Advice</h2>
      <ul>
        <li>The plans, equipment lists, macro targets, and educational content in SmartyWorkout are <strong>for general wellness purposes only</strong>.</li>
        <li>Always <strong>consult a qualified medical or training professional</strong> before starting any new diet — especially if you have diabetes, kidney disease, thyroid or heart conditions, an eating-disorder history, food allergies, or other health concerns; take medications that interact with food; or are pregnant or breastfeeding.</li>
        <li>Do not disregard or delay professional advice because of information provided by SmartyWorkout.</li>
        <li>If you experience any adverse reaction while following a SmartyWorkout plan, <strong>stop immediately and seek medical attention</strong>.</li>
      </ul>

      <h2>2. Truthful Disclosure</h2>
      <ul>
        <li>You are responsible for providing accurate and complete information in the questionnaire — especially allergies, intolerances, diagnosed conditions, medications, and pregnancy or breastfeeding status.</li>
        <li>Inaccurate answers may result in a plan that is unsafe or unsuitable for you.</li>
        <li>You must update your questionnaire and generate a new plan whenever your health status changes.</li>
      </ul>

      <h2>3. AI-Generated Content</h2>
      <ul>
        <li>Plans are generated with the assistance of AI and may contain errors, omissions, or inappropriate suggestions.</li>
        <li>You are responsible for reviewing every plan carefully before following it, and for cross-checking allergens, portion sizes, and any ingredient that could interact with your health or medications.</li>
        <li>Calorie and macro estimates shown in plans are approximate and may differ from actual values.</li>
      </ul>

      <h2>4. Assumption of Risk</h2>
      <ul>
        <li>By using SmartyWorkout, you <strong>voluntarily assume all risks</strong> associated with changing your training, including any allergic reaction, intolerance, gastrointestinal issue, weight change, or aggravation of a pre-existing condition.</li>
        <li>SmartyWorkout, its operator, affiliates, and contributors <strong>accept no responsibility</strong> for any illness, injury, or health-related issue that may occur during or after your use of SmartyWorkout.</li>
      </ul>

      <h2>5. Individual Responsibility</h2>
      <ul>
        <li>You are responsible for eating within your <strong>personal limits and needs</strong> and for skipping or adjusting any suggestion that does not feel safe for you.</li>
        <li>Minors (under 18) must use SmartyWorkout only with supervision and prior medical clearance from a qualified healthcare professional.</li>
      </ul>

      <h2>6. No Guarantee of Results</h2>
      <ul>
        <li>Results vary by individual based on age, health status, genetics, lifestyle, consistency, and adherence to the plan.</li>
        <li>SmartyWorkout <strong>does not guarantee</strong> any specific weight change, body-composition change, performance improvement, or health outcome.</li>
      </ul>

      <h2>7. Release of Liability &amp; Waiver of Claims</h2>
      <p>To the fullest extent permitted by law in the European Union and internationally:</p>
      <ul>
        <li>
          <strong>Complete release:</strong> By using SmartyWorkout, you voluntarily and knowingly assume
          all risks associated with changing your training and hereby <strong>RELEASE, WAIVE,
          DISCHARGE, AND COVENANT NOT TO SUE</strong> SmartyWorkout, its parent Smarty Wellness, its
          affiliated brands (SmartyGym and SmartyMove), and their respective operators, owners,
          contributors, employees, contractors, affiliates, and agents from any and all liability
          arising from your use of SmartyWorkout.
        </li>
        <li>
          <strong>No liability:</strong> SmartyWorkout and its representatives <strong>shall not be held
          liable</strong> for any direct, indirect, incidental, consequential, special, punitive, or
          exemplary damages arising from participation in any plan generated by SmartyWorkout, including
          but not limited to:
          <ul>
            <li>Allergic reactions or intolerances</li>
            <li>Personal illness, injury, or disability</li>
            <li>Aggravation of pre-existing medical conditions</li>
            <li>Medical expenses or costs</li>
            <li>Lost wages or income</li>
            <li>Pain and suffering</li>
            <li>Emotional distress</li>
          </ul>
        </li>
        <li>
          <strong>Waiver of right to sue:</strong> You expressly waive any right to bring legal action
          against SmartyWorkout for injuries, illnesses, or damages sustained during or after use of any
          plan.
        </li>
        <li>
          <strong>Indemnification:</strong> You agree to indemnify and hold harmless SmartyWorkout from
          any claims, damages, or expenses (including legal fees) arising from your use of SmartyWorkout
          or breach of this Disclaimer.
        </li>
      </ul>
      <p>
        Nothing in this Disclaimer excludes or limits liability that cannot be excluded or limited
        under applicable law, including your statutory rights as a consumer under EU consumer-protection
        directives.
      </p>

      <h2>8. Jurisdiction &amp; Governing Law</h2>
      <p>
        This Disclaimer is governed by applicable law and EU regulations. Any disputes shall be
        subject to the jurisdiction of the competent courts, while preserving any mandatory consumer
        protection rights you have in your country of residence.
      </p>

      <div className="callout">
        <strong>⚠️ Acceptance and acknowledgment.</strong> By accessing and using SmartyWorkout, you
        acknowledge and confirm that you have:
        <ul>
          <li><strong>Read and understood</strong> this entire Disclaimer and Release of Liability.</li>
          <li><strong>Provided truthful answers</strong> in the questionnaire, including allergies, conditions, and medications.</li>
          <li><strong>Obtained medical clearance</strong> if your health status requires it.</li>
          <li><strong>Voluntarily assumed all risks</strong> associated with changing your training.</li>
          <li><strong>Released SmartyWorkout from all liability</strong> for any illness, injury, or damages arising from your use of the app.</li>
          <li><strong>Agreed to use SmartyWorkout at your own risk.</strong></li>
        </ul>
        <p style={{ marginTop: 8, fontWeight: 700 }}>
          If you do not agree with any part of this Disclaimer, do not use SmartyWorkout.
        </p>
      </div>
    </LegalLayout>
  );
}
