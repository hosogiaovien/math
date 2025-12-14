import React from 'react';
import { TeacherProfile, Quiz } from '../../types';
import { ChevronLeft, School, User as UserIcon } from 'lucide-react';

interface StudentQuizListProps {
  teacher: TeacherProfile | null;
  quizzes: Quiz[];
  onSelectQuiz: (q: Quiz) => void;
  onBack: () => void;
}

export const StudentQuizList: React.FC<StudentQuizListProps> = ({ teacher, quizzes, onSelectQuiz, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-4 flex items-center text-gray-500 hover:text-gray-800">
        <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
      </button>
      
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 rounded-xl shadow-lg mb-8">
        <h1 className="text-2xl font-bold mb-2">Lớp học: {teacher?.teacherCode}</h1>
        {teacher?.name && <p className="text-lg font-medium flex items-center gap-2 mb-1"><UserIcon className="w-4 h-4"/> GV: {teacher.name}</p>}
        <p className="opacity-90 flex items-center gap-2"><School className="w-4 h-4"/> {teacher?.school || "Chưa cập nhật tên trường"}</p>
        <p className="opacity-75 text-sm mt-1">Email: {teacher?.email}</p>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Danh sách bài tập</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map(q => (
          <div 
            key={q.id} 
            onClick={() => onSelectQuiz(q)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 cursor-pointer transition group"
          >
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-brand-600 mb-2">{q.title}</h3>
            <p className="text-gray-500 text-sm flex items-center">
              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold mr-2">{q.questions.length} câu</span>
              <span className="italic text-gray-400 text-xs">ID: {q.id.substring(0,6)}...</span>
            </p>
          </div>
        ))}
        {quizzes.length === 0 && <p className="text-gray-500">Giáo viên chưa có bài tập nào.</p>}
      </div>
    </div>
  );
};