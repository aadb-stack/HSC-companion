// =============================================================================
//  Firebase configuration  (free "Spark" tier — no install, loaded via CDN)
// =============================================================================
//
//  HOW TO FILL THIS IN  (≈5 minutes, all in your web browser — see README.md):
//
//   1. Go to https://console.firebase.google.com  and create a free project.
//   2. Click the </> "Web app" icon to register a web app.
//   3. Firebase shows you a "firebaseConfig" object — copy each value below.
//   4. In the left menu open  Build → Authentication → Get started  and enable
//      "Anonymous" and (optionally) "Google" and "Email/Password" sign-in.
//   5. Open  Build → Firestore Database → Create database  (Start in
//      production mode) and paste the security rules from the README.
//
//  These keys are PUBLIC by design (Firebase secures data with rules, not by
//  hiding the apiKey) so it is safe to commit this file.
//
//  ⚠️  If you leave the placeholder values below, the app STILL WORKS — it
//      automatically falls back to on-device storage (localStorage). Cloud
//      sync across devices simply stays off until you add real values.
// =============================================================================

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Returns true only when the config above has been filled with real values.
export function isFirebaseConfigured() {
  return (
    !!firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("YOUR_") &&
    !!firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith("YOUR_")
  );
}
