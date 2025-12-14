import React, { useState } from 'react';

interface AdminLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBack }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'Banlong@123') {
      onSuccess();
    } else {
      alert('Thông tin đăng nhập không chính xác');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          type="text" 
          placeholder="Username" 
          className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900" 
          value={user} 
          onChange={e => setUser(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900" 
          value={pass} 
          onChange={e => setPass(e.target.value)} 
        />
        <button type="submit" className="w-full bg-gray-800 text-white p-3 rounded hover:bg-gray-900">Đăng nhập</button>
      </form>
      <button onClick={onBack} className="mt-4 text-center w-full text-sm text-gray-500 hover:underline">Quay lại</button>
    </div>
  );
};