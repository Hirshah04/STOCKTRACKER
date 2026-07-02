// ================= FIREBASE CLOUD DATABASE CONFIGURATION =================
// Copy and paste your Firebase Web App configuration credentials below.
// If you leave these values empty, the app will automatically run in 
// "Local Browser Storage (LocalStorage)" mode without cloud syncing.
// 
// Setup Guide:
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Create a free project.
// 3. Click the Web icon (</>) to register a Web App.
// 4. Copy the values from the displayed configuration and paste them here.
// 5. In Firebase sidebar, click "Realtime Database" -> "Create Database".
// 6. Under "Rules", set both ".read" and ".write" to true (or define custom auth).

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
