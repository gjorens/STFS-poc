// Paste your Firebase web app config here (Firebase console > Project settings > Your apps).
// While the projectId still starts with "REPLACE", the app runs in demo mode:
// documents are kept only in this browser, so the UI can be tested with no cloud setup.
//
// authDomain should be the same domain the app is served from (for example your
// Firebase Hosting domain). Safari blocks sign-in redirects that use a different domain.
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const isDemo = firebaseConfig.projectId.startsWith("REPLACE");
