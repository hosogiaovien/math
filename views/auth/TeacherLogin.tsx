
import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { KeyRound, ArrowLeft, Mail } from 'lucide-react';
import { TeacherProfile } from '../../types';

interface TeacherLoginProps {
  onBack: () => void;
  onLoginSuccess: (profile: TeacherProfile) => void; // New callback for simple auth
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [input, setInput] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // STRATEGY:
    // 1. Try Firebase Auth (Email/Pass)
    // 2. If fail, Try Firestore Simple Query (Username/Pass)

    try {
      // Attempt 1: Firebase Auth
      await signInWithEmailAndPassword(auth, input, password);
      // If success, App.tsx onAuthStateChanged will handle the rest.
      // We don't need to do anything here for Firebase users.
    } catch (firebaseErr: any) {
      // If Firebase fails, check if it might be a Simple Account
      console.log("Firebase Auth failed, trying Simple Auth...", firebaseErr.code);
      
      try {
          const usersRef = collection(db, "users");
          // Query for "simple" teacher account
          const q = query(
              usersRef, 
              where("username", "==", input), 
              where("role", "==", "teacher"),
              where("accountType", "==", "simple")
          );
          const snap = await getDocs(q);

          let foundProfile: TeacherProfile | null = null;
          
          snap.forEach(doc => {
              const data = doc.data() as TeacherProfile;
              // Simple password check (plain text)
              if (data.password === password) {
                  foundProfile = data;
              }
          });

          if (foundProfile) {
              // Success Simple Auth!
              onLoginSuccess(foundProfile);
              return;
          } else {
              // Both failed
              if (firebaseErr.code === 'auth/invalid-email') {
                  setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
              } else {
                  setError('Đăng nhập thất bại. Vui lòng kiểm tra lại.');
              }
          }

      } catch (dbErr) {
          console.error("DB Error", dbErr);
          setError('Lỗi hệ thống. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) {
      setError('Vui lòng nhập Email.');
      return;
    }
    
    setError('');
    setMessage('');
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, input);
      setMessage(`Đã gửi email khôi phục đến: ${input}.`);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi gửi email: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100 mt-10">
      
      {mode === 'login' ? (
        <>
          <h2 className="text-2xl font-bold mb-6 text-brand-700 text-center">Giáo viên Đăng nhập</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email hoặc Tên đăng nhập</label>
              <input 
                type="text" 
                placeholder="teacher@school.com hoặc username" 
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
            
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center"><span className="mr-2">⚠️</span>{error}</div>}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand-600 text-white p-3 rounded-lg font-bold hover:bg-brand-700 transition shadow-md disabled:opacity-70 flex justify-center items-center"
            >
              {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
            </button>
            
            <div className="flex justify-between items-center mt-4">
               <button 
                type="button"
                onClick={() => {
                  setMode('reset'); 
                  setError(''); 
                  setMessage('');
                }} 
                className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="flex items-center mb-6">
            <button onClick={() => {setMode('login'); setError('');}} className="p-2 -ml-2 hover:bg-gray-100 rounded-full mr-2">
              <ArrowLeft className="w-5 h-5 text-gray-600"/>
            </button>
            <h2 className="text-xl font-bold text-gray-800">Khôi phục mật khẩu</h2>
          </div>
          
          <p className="text-gray-600 text-sm mb-6">
            Chỉ áp dụng cho tài khoản dùng Email (Firebase). <br/>
            Nếu dùng tài khoản thường, vui lòng liên hệ Admin.
          </p>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email đã đăng ký</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"/>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  required
                />
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">{message}</div>}

            <button 
              type="submit" 
              disabled={isLoading || !!message}
              className="w-full bg-orange-600 text-white p-3 rounded-lg font-bold hover:bg-orange-700 transition shadow-md disabled:opacity-70 flex justify-center items-center"
            >
              {isLoading ? 'Đang gửi...' : (message ? 'Đã gửi' : 'Gửi link khôi phục')} <KeyRound className="w-4 h-4 ml-2"/>
            </button>
          </form>
        </>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
