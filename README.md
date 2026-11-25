# STFB poc

A web app (PWA) for iPhone, iPad and Mac. Users sign in with Google once, add the app to the Home Screen, and their documents sync across devices. Documents are also kept on the device, so they open offline.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | Screens and layout (sidebar on iPad and Mac, stacked list on iPhone) |
| `app.js` | Sign-in, document list, editor, autosave, status messages |
| `store-firestore.js` | Firestore storage with the offline cache |
| `config.js` | Your Firebase config. Demo mode runs while it still says `REPLACE` |
| `sw.js`, `manifest.json`, `icons/` | Home Screen install and offline app launch |
| `firestore.rules` | Each user can read and write only their own documents |
| `firebase.json` | Hosting and rules deployment settings |

## Step 1: try it in demo mode (no cloud setup)

Demo mode stores documents only in the browser. It shows the whole UI and autosave behaviour.

1. From this folder, run `python3 -m http.server 8000`.
2. Open `http://localhost:8000` in Chrome or Safari on the Mac.

A service worker needs `localhost` or HTTPS, so iPhone and iPad testing needs Step 2 first.

## Step 2: connect to Firebase (developer, once)

1. In the Firebase console, create a project and add a Web app. Copy the config values into `config.js`.
2. Build > Firestore Database > Create database (Native mode).
3. Build > Authentication > Get started > Sign-in method > enable Google.
4. Install the CLI once (`npm install -g firebase-tools`), then run `firebase login`.
5. Set the project in this folder: `firebase use <your-project-id>`.
6. Deploy: `firebase deploy`. This uploads the rules and the hosting files.
7. In Authentication > Settings > Authorized domains, check that the Hosting domain (`<project>.web.app`) is listed. Firebase usually adds it automatically.
8. Set `authDomain` in `config.js` to the same domain (`<project>.web.app` or `<project>.firebaseapp.com`). Safari blocks sign-in redirects across domains, so this matters.

Any later change: edit the files, bump `CACHE` in `sw.js`, and run `firebase deploy` again.

## Step 3: test on each device

The app must be opened from the HTTPS address in Step 2 for iPhone, iPad and Mac testing.

**iPhone (Safari)**
1. Open the app address. Sign in with Google. Confirm the document list and editor load.
2. Share > Add to Home Screen. Open it from the Home Screen icon. Confirm you are still signed in and the document is there.
3. Turn on Airplane Mode. Force-quit and reopen from the Home Screen. Confirm the document opens and shows the last saved text.
4. Edit the text offline, then reconnect. Check that the change appears on another device.

**iPad (Safari)**
1. Same steps 1 to 4 as iPhone. The sidebar should show alongside the editor.
2. Rotate the screen. The layout should adapt.

**Mac**
1. Chrome: open the app, sign in, then use the install icon in the address bar (or the menu) to install it.
2. Safari: open the app, sign in, and confirm it works. Note that a Safari-only user who does not open the app for about a week may lose offline data. Use the Chrome or Edge install for the Mac, or open the app at least weekly.
3. Edit a document on the Mac, then open it on the iPhone or iPad and confirm the change appears.

## Known limits of this prototype

- No delete, rename, folder or search features.
- Last save wins if the same document is edited on two devices while offline.
- Documents are limited to about 900 KB of text. Images and audio are not supported.
- The Google sign-in button is the only sign-in method.
- Icons are placeholders. Replace `icons/*.png` with real artwork before wider testing.
