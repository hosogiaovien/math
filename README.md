# MathMaster Quiz App

## Deploy to Vercel

1. **GitHub Setup:**
   - Create a new repository on GitHub.
   - Push all these files to the repository.

2. **Vercel Setup:**
   - Go to [Vercel](https://vercel.com) and sign up/login.
   - Click "Add New..." -> "Project".
   - Select your GitHub repository.

3. **Build Configuration:**
   - Framework Preset: **Create React App** (Vercel usually detects this automatically).
   - Build Command: `npm run build` (or `react-scripts build`).
   - Output Directory: `build`.
   - Install Command: `npm install`.

4. **Environment Variables:**
   - Since this is a client-side app using Firebase, ensure you updated `firebase.ts` with your actual Firebase config keys before pushing, or you can use Environment Variables in Vercel settings if you refactor the code to use `process.env`. 
   - *Note: For this specific code structure, just editing `firebase.ts` directly is the simplest way for a quick deploy.*

5. **Deploy:**
   - Click "Deploy". Vercel will build your React app and provide a live URL.

## Firebase Rules (Important)

In your Firebase Console -> Firestore Database -> Rules, ensure you allow access. For production, secure this further, but for testing:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
*(Warning: 'if true' allows anyone to edit data. Ideally, restrict 'write' access to authenticated users for the `quizzes` collection).*
