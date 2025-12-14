import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// =========================================================================
// HƯỚNG DẪN CẤU HÌNH FIREBASE:
// 1. Truy cập https://console.firebase.google.com/
// 2. Tạo một project mới.
// 3. Trong Project Overview, chọn icon Web (</>) để thêm ứng dụng web.
// 4. Copy nội dung object 'firebaseConfig' và dán vào bên dưới.
// 5. Vào Firestore Database -> Create Database -> Start in Test Mode (cho phép đọc/ghi).
// 6. Vào Authentication -> Sign-in method -> Bật Email/Password.
// =========================================================================

const firebaseConfig = {
  // Thay thế toàn bộ phần này bằng config từ Firebase Console của bạn
  apiKey: "AIzaSyAdWlz3fIRSlRZraXEk7-60YqIkg6V90Rs",
  authDomain: "ts10-88222.firebaseapp.com",
  projectId: "ts10-88222",
  storageBucket: "ts10-88222.firebasestorage.app",
  messagingSenderId: "398748796464",
  appId: "1:398748796464:web:4918856807d86afdbe8ff5",
  measurementId: "G-2HY79GJZ9L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);