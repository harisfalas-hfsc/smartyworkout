import { sendGenerationFailureAlerts, sendGenerationRecoveryAlerts } from "../lib/workout-generation-alert.server";
const sid = "verify-" + Date.now();
const user = { id: "00000000-0000-0000-0000-000000000000", email: "smartyworkout@outlook.com", name: "Verification" };
console.log("failure:", JSON.stringify(await sendGenerationFailureAlerts({ sessionId: sid, stage: "initial", reason: "VERIFICATION DRILL - simulated AI balance failure", failureKind: "ai_balance", attempt: 1, notifyCustomer: true, paymentState: "active", user })));
console.log("recovery:", JSON.stringify(await sendGenerationRecoveryAlerts({ sessionId: sid, stage: "initial", attempts: 2, workoutId: "test", workoutName: "Verification Session", user })));
