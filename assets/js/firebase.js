// Lazily initialises Firebase ONLY when real config is present.
// If not configured, the app silently uses localStorage instead.
import { firebaseConfig, isFirebaseConfigured } from "../../firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

let _state = null; // { enabled, app, auth, db, authApi, dbApi }

export async function initFirebase() {
  if (_state) return _state;

  if (!isFirebaseConfigured()) {
    _state = { enabled: false };
    return _state;
  }

  try {
    const [appApi, authApi, dbApi] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);

    const app = appApi.initializeApp(firebaseConfig);
    const auth = authApi.getAuth(app);
    const db = dbApi.getFirestore(app);

    _state = { enabled: true, app, auth, db, authApi, dbApi };
  } catch (err) {
    console.error("Firebase failed to initialise — falling back to local storage.", err);
    _state = { enabled: false, error: err };
  }
  return _state;
}
