
import React, { useState } from 'react';
import { GraduationCap, Users, AlertCircle } from 'lucide-react';

interface LandingViewProps {
  onAdminLogin: () => void;
  onTeacherLogin: () => void;
  onStudentGuestEnter: (code: string) => void;
  onStudentLoginClick: () => void;
  guestError?: string;
  onClearGuestError?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ 
  onAdminLogin, 
  onTeacherLogin, 
  onStudentGuestEnter,
  onStudentLoginClick,
  guestError,
  onClearGuestError
}) => {
  const [code, setCode] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code) {
      onStudentGuestEnter(code);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCode(e.target.value);
      if (guestError && onClearGuestError) {
          onClearGuestError();
      }
  }

  return (
    <div className="flex flex-col items-center justify-center pt-6 md:pt-16">
      <div className="w-full max-w-md md:max-w-4xl grid md:grid-cols-2 gap-6">
        
        {/* -- CỘT 1: VÀO THI NGAY (KHÁCH) -- */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Vào thi ngay</h2>
                <p className="text-gray-500 mt-2 text-sm">Dành cho khách hoặc làm bài tự do. Chỉ cần nhập Mã Giáo Viên.</p>
            </div>
            
            <div className="space-y-4 mt-auto">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mã Giáo Viên (VD: GV1234)</label>
                    <input 
                    type="text" 
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition bg-white text-gray-900 ${guestError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Nhập mã..."
                    value={code}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    />
                    {guestError && (
                        <div className="flex items-center mt-2 text-red-600 text-sm animate-pulse">
                            <AlertCircle className="w-4 h-4 mr-1"/> {guestError}
                        </div>
                    )}
                </div>
                <button 
                    onClick={() => code && onStudentGuestEnter(code)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center"
                >
                    Vào Lớp (Free Mode)
                </button>
            </div>
        </div>

        {/* -- CỘT 2: HỌC SINH ĐĂNG NHẬP -- */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Học sinh Đăng nhập</h2>
                <p className="text-gray-500 mt-2 text-sm">Dành cho học sinh đã được cấp tài khoản. Lưu điểm và lịch sử làm bài.</p>
            </div>
            
            <div className="space-y-4 mt-auto">
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 text-center border border-gray-200">
                    Bạn cần Giáo viên cung cấp Tên đăng nhập và Mật khẩu để sử dụng tính năng này.
                </div>
                <button 
                    onClick={onStudentLoginClick}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center"
                >
                    Đăng nhập Tài khoản
                </button>
            </div>
        </div>

      </div>

      <div className="mt-10 flex gap-6 text-sm md:text-base">
          <button onClick={onTeacherLogin} className="text-brand-600 hover:text-brand-800 font-bold px-4 py-2 hover:bg-brand-50 rounded-lg transition">Giáo viên đăng nhập</button>
          <span className="text-gray-300">|</span>
          <button onClick={onAdminLogin} className="text-gray-400 hover:text-gray-600 px-4 py-2 hover:bg-gray-100 rounded-lg transition">Admin</button>
      </div>
      
      <div className="mt-12 text-center text-gray-400 text-sm md:text-base max-w-lg flex flex-col items-center gap-4">
        <p>Hệ thống trắc nghiệm Toán học trực tuyến. Hỗ trợ hiển thị công thức Toán (LaTeX) và chấm điểm tự động. By Quốc Hưng</p>
        
        {/* Hit Counter Code */}
        <a href="https://www.hitwebcounter.com/" target="_blank" rel="noopener noreferrer">
          <img 
            src="https://hitwebcounter.com/counter/counter.php?page=21462924&style=0042&nbdigits=6&type=page&initCount=0" 
            title="Free Tools" 
            alt="Free Tools" 
          />
        </a>
      </div>
    </div>
  );
};
