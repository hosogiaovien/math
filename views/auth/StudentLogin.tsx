
import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { StudentAccount } from '../../types';
import { ArrowLeft, UserCircle2 } from 'lucide-react';

interface StudentLoginProps {
  onSuccess: (student: StudentAccount) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Query 'students' collection where username matches
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Tên đăng nhập không tồn tại.');
        setIsLoading(false);
        return;
      }

      // Check password (simple check since it's plain text as requested)
      // Note: In a real production app with sensitive data, passwords should be hashed.
      let foundStudent: StudentAccount | null = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as StudentAccount;
        if (data.password === password) {
            foundStudent = { ...data, id: doc.id };
        }
      });

      if (foundStudent) {
        onSuccess(foundStudent);
      } else {
        setError('Mật khẩu không chính xác.');
      }

    } catch (err: any) {
      console.error(err);
      setError('Lỗi kết nối server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100 mt-10">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full mr-2">
            <ArrowLeft className="w-5 h-5 text-gray-600"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Học sinh Đăng nhập</h2>
      </div>

      <div className="flex justify-center mb-6">
        <UserCircle2 className="w-20 h-20 text-brand-200" />
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập (User)</label>
            <input 
            type="text" 
            placeholder="Nhập user được cấp..." 
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
            type="password" 
            placeholder="••••••" 
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required
            />
        </div>
        
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
        
        <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-600 text-white p-3 rounded-lg font-bold hover:bg-brand-700 transition shadow-md disabled:opacity-70"
        >
            {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
};
