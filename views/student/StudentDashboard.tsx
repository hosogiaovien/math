
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { StudentAccount, Quiz, QuizResult } from '../../types';
import { ClipboardList, History, Trophy, Clock, GraduationCap, CheckCircle, Lock, KeyRound, AlertCircle, Eye } from 'lucide-react';
import { StudentTakeQuiz } from './StudentTakeQuiz'; // Needed for type checking if we were rendering directly, but here we trigger callback

interface StudentDashboardProps {
  student: StudentAccount;
  onLogout: () => void;
  // UPDATE: Callback now accepts an optional Review Result
  onTakeQuiz: (q: Quiz, reviewResult?: QuizResult) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout, onTakeQuiz }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [activeTab, setActiveTab] = useState<'assigned' | 'history'>('assigned');
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('...');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Password Modal
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(''); // State lưu lỗi hiển thị
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    // CẬP NHẬT: Check thời gian mỗi 1 giây (1000ms) để nút tự mở ngay lập tức
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [student]);

  const fetchData = async () => {
    setLoading(true);
    try {
        // 1. Fetch Class Name (Fix hiển thị tên lớp)
        if (student.classId) {
            try {
                const classSnap = await getDoc(doc(db, "classes", student.classId));
                if (classSnap.exists()) {
                    setClassName(classSnap.data().name);
                } else {
                    setClassName("Lớp không tồn tại");
                }
            } catch (e) {
                console.error("Lỗi lấy tên lớp", e);
            }
        }

        // 2. Fetch Quizzes assigned to this student's class
        const quizzesRef = collection(db, "quizzes");
        const qQuiz = query(quizzesRef, where("assignedClassIds", "array-contains", student.classId));
        const quizSnap = await getDocs(qQuiz);
        const quizList: Quiz[] = [];
        quizSnap.forEach(d => quizList.push({ id: d.id, ...d.data() } as Quiz));
        // Sắp xếp bài tập mới nhất lên đầu
        quizList.sort((a, b) => b.createdAt - a.createdAt);
        setQuizzes(quizList);

        // 3. Fetch History Results (Fix lỗi không hiện lịch sử)
        // Lưu ý: Bỏ orderBy ở query Firestore để tránh lỗi thiếu Index. Sort ở client.
        const resultsRef = collection(db, "quiz_results");
        const qResults = query(
            resultsRef, 
            where("studentId", "==", student.id)
        );
        const resSnap = await getDocs(qResults);
        const resList: QuizResult[] = [];
        resSnap.forEach(d => resList.push({ id: d.id, ...d.data() } as QuizResult));
        
        // Sắp xếp client-side: Mới nhất lên đầu
        resList.sort((a, b) => b.timestamp - a.timestamp);
        
        setResults(resList);

    } catch (e) {
        console.error("Lỗi tải dữ liệu:", e);
    } finally {
        setLoading(false);
    }
  };

  const getBestScore = (quizId: string) => {
    const quizResults = results.filter(r => r.quizId === quizId);
    if (quizResults.length === 0) return null;
    return Math.max(...quizResults.map(r => r.score));
  }

  const getAttempts = (quizId: string) => {
    return results.filter(r => r.quizId === quizId).length;
  }

  const getScheduleStatus = (q: Quiz) => {
      if (!q.classSchedules || !q.classSchedules[student.classId]) return { isLocked: false, msg: '' };
      
      const startTime = q.classSchedules[student.classId];
      if (currentTime < startTime) {
          const d = new Date(startTime);
          const timeStr = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
          const dateStr = d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
          return { isLocked: true, msg: `Mở lúc: ${timeStr} ${dateStr}` };
      }
      return { isLocked: false, msg: '' };
  }

  const handleReview = async (result: QuizResult) => {
      // 1. Check if we already have the quiz loaded in 'quizzes' list
      let quiz = quizzes.find(q => q.id === result.quizId);
      
      // 2. If not found (e.g., deleted assignment but result exists, or unassigned), fetch it
      if (!quiz) {
          try {
              const quizSnap = await getDoc(doc(db, "quizzes", result.quizId));
              if (quizSnap.exists()) {
                  quiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
              } else {
                  alert("Đề thi này đã bị xóa bởi giáo viên, không thể xem lại.");
                  return;
              }
          } catch(e) {
              alert("Lỗi tải đề thi.");
              return;
          }
      }

      // 3. Trigger Review Mode
      onTakeQuiz(quiz, result);
  }

  const handleChangePassword = async () => {
      setPassError(''); // Reset lỗi trước khi kiểm tra

      if (!newPass || !confirmPass) {
          setPassError("Vui lòng nhập đầy đủ thông tin");
          return;
      }
      if (newPass !== confirmPass) {
          setPassError("Mật khẩu xác nhận không khớp!");
          return;
      }
      if (newPass.length < 6) {
          setPassError("Mật khẩu QUÁ NGẮN! Phải có ít nhất 6 ký tự.");
          return;
      }

      setIsProcessing(true);
      try {
          await updateDoc(doc(db, "students", student.id), { password: newPass });
          alert("Đổi mật khẩu thành công!");
          setShowChangePassModal(false);
          setNewPass(''); setConfirmPass('');
      } catch (e: any) {
          console.error("Change pass error:", e);
          setPassError("Lỗi đổi mật khẩu: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                <GraduationCap className="w-7 h-7" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Xin chào, {student.fullName}</h1>
                <p className="text-gray-500 font-medium">Lớp: <span className="text-brand-600 font-bold">{className}</span></p>
            </div>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0 items-center">
            <div className="flex gap-2">
                 <button 
                    onClick={() => setActiveTab('assigned')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center ${activeTab === 'assigned' ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    <ClipboardList className="w-5 h-5 mr-2"/> Bài tập
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center ${activeTab === 'history' ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    <History className="w-5 h-5 mr-2"/> Lịch sử
                </button>
            </div>
            <button 
                 onClick={() => { setShowChangePassModal(true); setPassError(''); }}
                 className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition" 
                 title="Đổi mật khẩu"
            >
                <KeyRound className="w-6 h-6" />
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
            {activeTab === 'assigned' && (
                <div className="grid gap-4 md:grid-cols-2">
                    {quizzes.length === 0 && (
                        <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2"/>
                            <p className="text-gray-500">Bạn chưa có bài tập nào được giao.</p>
                        </div>
                    )}
                    {quizzes.map(q => {
                        const best = getBestScore(q.id);
                        const attempts = getAttempts(q.id);
                        // Allow retake if: quiz allows it OR no attempts yet
                        const canRetake = (q.allowRetake === undefined || q.allowRetake === true) || attempts === 0;
                        const { isLocked, msg } = getScheduleStatus(q);

                        return (
                            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-200 transition group">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-brand-600 transition">{q.title}</h3>
                                <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
                                    <span className="bg-gray-100 px-2 py-1 rounded flex items-center"><ClipboardList className="w-3 h-3 mr-1"/> {q.questions.length} câu</span>
                                    {q.timeLimit ? (
                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center"><Clock className="w-3 h-3 mr-1"/> {q.timeLimit} phút</span>
                                    ) : (
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Không giới hạn TG</span>
                                    )}
                                </div>
                                
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                    <div className="text-sm">
                                        {best !== null ? (
                                            <div className="text-green-600 font-bold flex items-center">
                                                <Trophy className="w-4 h-4 mr-1"/> Cao nhất: {best.toFixed(2)}/{q.maxScore || 10}
                                            </div>
                                        ) : <span className="text-gray-400 italic">Chưa làm bài</span>}
                                        <div className="text-xs text-gray-400 mt-1">
                                            Đã làm: {attempts} lần 
                                            {!canRetake && <span className="text-red-500 font-bold ml-1">(Chỉ 1 lần)</span>}
                                        </div>
                                    </div>
                                    
                                    {isLocked ? (
                                        <button disabled className="bg-gray-100 text-red-500 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm cursor-not-allowed flex items-center transition-all duration-500">
                                            <Lock className="w-3 h-3 mr-2"/> {msg}
                                        </button>
                                    ) : canRetake ? (
                                        <button 
                                            onClick={() => onTakeQuiz(q)}
                                            className="bg-brand-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-700 shadow-sm transition-all duration-300 transform active:scale-95 animate-[pulse_1s_ease-out]"
                                        >
                                            {best !== null ? 'Làm lại' : 'Làm bài'}
                                        </button>
                                    ) : (
                                        <button disabled className="bg-gray-200 text-gray-500 px-5 py-2 rounded-lg font-bold cursor-not-allowed flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-2"/> Đã xong
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold text-sm border-b border-gray-200">
                            <tr>
                                <th className="p-4">Bài thi</th>
                                <th className="p-4">Thời gian nộp</th>
                                <th className="p-4 text-center">Đúng</th>
                                <th className="p-4 text-right">Điểm số</th>
                                <th className="p-4 w-1/3">Chi tiết chọn</th>
                                <th className="p-4 text-center">Xem lại</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {results.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition group">
                                    <td className="p-4 font-bold text-gray-800">{r.quizTitle}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs md:text-sm">
                                      {new Date(r.timestamp).toLocaleString('vi-VN', { 
                                        hour: '2-digit', minute: '2-digit', 
                                        day: '2-digit', month: '2-digit', year: 'numeric' 
                                      })}
                                    </td>
                                    <td className="p-4 text-center text-gray-600">
                                        <span className="font-bold">{r.correctCount}</span>/{r.totalQuestions}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-bold px-2 py-1 rounded ${r.score >= (r.maxScore/2) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.score.toFixed(2)}/{r.maxScore}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 break-words max-h-20 overflow-y-auto">
                                            {r.answerHistory || <span className="text-gray-400 italic">Không có dữ liệu</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleReview(r)}
                                            className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition"
                                            title="Xem lại bài làm trực quan"
                                        >
                                            <Eye className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {results.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <History className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                                        <p className="text-gray-400">Chưa có lịch sử làm bài.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white p-8 rounded-xl max-w-sm w-full shadow-2xl animate-[bounce_0.2s_ease-out]" style={{backgroundColor: 'white'}}>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center"><KeyRound className="w-5 h-5 mr-2 text-brand-600"/> Đổi Mật Khẩu</h3>
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Mật khẩu mới</label>
                          <input 
                              type="password"
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                              value={newPass}
                              onChange={e => { setNewPass(e.target.value); setPassError(''); }}
                              placeholder="Nhập mật khẩu mới"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Nhập lại mật khẩu</label>
                          <input 
                              type="password"
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                              value={confirmPass}
                              onChange={e => { setConfirmPass(e.target.value); setPassError(''); }}
                              placeholder="Xác nhận mật khẩu"
                          />
                      </div>
                  </div>

                  {/* THÔNG BÁO LỖI NỔI BẬT */}
                  {passError && (
                      <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 animate-pulse">
                          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                          <span className="font-bold text-sm">{passError}</span>
                      </div>
                  )}

                  <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowChangePassModal(false)} 
                        disabled={isProcessing} 
                        className="flex-1 py-2 bg-gray-100 font-bold rounded-lg text-gray-900 hover:bg-gray-200 border border-gray-300"
                      >
                        Hủy
                      </button>
                      <button 
                        type="button"
                        onClick={handleChangePassword} 
                        disabled={isProcessing} 
                        className="flex-1 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700"
                      >
                         {isProcessing ? "Đang lưu..." : "Lưu"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
