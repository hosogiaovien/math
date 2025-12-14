
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, StudentAccount, Question, QuizResult } from '../../types';
import { MathRenderer } from '../../components/MathRenderer';
import { ChevronLeft, CheckCircle2, XCircle, Clock, Trophy, RotateCcw, Home, AlertTriangle, Shuffle, Eye, HelpCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface StudentTakeQuizProps {
  quiz: Quiz;
  student?: StudentAccount | null; // Optional, if logged in
  onBack: () => void;
  reviewResult?: QuizResult | null; // NEW: Pass this to enable Review Mode
}

// Helper: Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export const StudentTakeQuiz: React.FC<StudentTakeQuizProps> = ({ quiz, student, onBack, reviewResult }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({}); 
  const [feedback, setFeedback] = useState<Record<string, boolean>>({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false); // Modal Kết quả
  
  // Modal Confirm Submit
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);

  // SHUFFLE STATE
  const [questionsToRender, setQuestionsToRender] = useState<Question[]>([]);
  const [quizVariantCode, setQuizVariantCode] = useState<string>(''); // For UI display

  const isReviewMode = !!reviewResult;

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.timeLimit && quiz.timeLimit > 0 ? quiz.timeLimit * 60 : null
  );

  const maxScore = quiz.maxScore || 10;
  
  // Tính điểm "sống" cho chế độ Free hoặc Review
  const liveCorrectCount = Object.values(feedback).filter(Boolean).length;
  const liveScore = (liveCorrectCount / quiz.questions.length) * maxScore;

  // --- INITIALIZE ---
  useEffect(() => {
    // 1. Reset State
    setAnswers({});
    setFeedback({});
    setIsSubmitted(false);
    setShowSubmitConfirm(false);
    setShowResultModal(false);
    
    // --- REVIEW MODE LOGIC ---
    if (isReviewMode && reviewResult) {
        setIsSubmitted(true); // Always submitted in review
        setTimeLeft(null); // No timer in review

        // A. RECONSTRUCT QUESTION ORDER
        let finalQuestions: Question[] = [];
        
        if (reviewResult.questionOrder && reviewResult.questionOrder.length > 0) {
            // New Data: We have the exact order saved
            finalQuestions = reviewResult.questionOrder.map(qId => {
                const found = quiz.questions.find(q => q.id === qId);
                return found || quiz.questions[0]; // Fallback if not found (shouldn't happen)
            });
        } else {
            // Old Data: Fallback to original order (might be wrong if it was shuffled, but best effort)
            finalQuestions = quiz.questions; 
        }

        // B. INJECT ANSWERS & FEEDBACK
        setQuestionsToRender(finalQuestions);
        
        if (reviewResult.userAnswers) {
            setAnswers(reviewResult.userAnswers);
            
            // Re-calculate feedback for UI
            const newFeedback: Record<string, boolean> = {};
            finalQuestions.forEach(q => {
                const selected = reviewResult.userAnswers![q.id];
                if (selected !== undefined) {
                    newFeedback[q.id] = selected === q.correctIndex;
                }
            });
            setFeedback(newFeedback);
        } else {
            // Fallback for very old data (try to parse answerHistory if needed, but simple is safer)
            console.warn("Review data missing specific userAnswers map. UI might be incomplete.");
        }

        return; // Stop here, don't run Shuffle logic
    }

    // --- NORMAL TAKE QUIZ LOGIC (SHUFFLE) ---
    if (quiz.shuffleQuestions) {
        // Generate Variant Code (Random 3 digit)
        const randomCode = Math.floor(Math.random() * 900) + 100;
        setQuizVariantCode(randomCode.toString());

        // Shuffle Questions Order
        const shuffledQuestions = shuffleArray(quiz.questions);

        // Shuffle Options within each question
        const fullyShuffled = shuffledQuestions.map((q: Question) => {
            const correctOptionText = q.options[q.correctIndex];
            const shuffledOptions = shuffleArray(q.options);
            const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);
            return {
                ...q,
                options: shuffledOptions,
                correctIndex: newCorrectIndex
            };
        });

        setQuestionsToRender(fullyShuffled);
    } else {
        setQuestionsToRender(quiz.questions);
        setQuizVariantCode('');
    }
  }, [quiz, reviewResult]);

  // Timer Effect (Only run if NOT review mode and NOT submitted)
  useEffect(() => {
    if (isReviewMode || isSubmitted || timeLeft === null) return;
    
    if (timeLeft <= 0) {
        finishQuiz(true); 
        return;
    }

    const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, isReviewMode]);

  const handleSelect = (qId: string, optIdx: number) => {
    if (isSubmitted || isReviewMode) return; 
    
    const currentQ = questionsToRender.find(q => q.id === qId);
    if (!currentQ) return;

    // Logic cho chế độ Free (Không có student)
    if (!student) {
        if (answers[qId] !== undefined) return; // Prevent spam
        const isCorrect = optIdx === currentQ.correctIndex;
        setAnswers(prev => ({ ...prev, [qId]: optIdx }));
        setFeedback(prev => ({ ...prev, [qId]: isCorrect }));
        return;
    }

    // Logic cho chế độ Lớp học
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const finishQuiz = async (forceSubmit = false) => {
    if (isSubmitted || isReviewMode) return;

    // --- LOGIC XÁC NHẬN NỘP BÀI ---
    if (!forceSubmit && student) {
        const missing = questionsToRender
            .map((q, idx) => (answers[q.id] === undefined ? idx + 1 : null))
            .filter((idx): idx is number => idx !== null);

        setUnansweredList(missing);
        setShowSubmitConfirm(true);
        return;
    }

    // --- TÍNH ĐIỂM & CHI TIẾT ---
    let correctCount = 0;
    const feedbackMap: Record<string, boolean> = {};
    const listCorrect: number[] = [];
    const listWrong: number[] = [];
    const listSkipped: number[] = [];
    // Save order of IDs
    const questionOrderIds = questionsToRender.map(q => q.id);

    questionsToRender.forEach((q, idx) => {
        const selected = answers[q.id];
        const qNum = idx + 1; 

        if (student) {
            const isCorrect = selected === q.correctIndex;
            feedbackMap[q.id] = isCorrect;
            
            if (selected === undefined) {
                listSkipped.push(qNum);
            } else if (isCorrect) {
                correctCount++;
                listCorrect.push(qNum);
            } else {
                listWrong.push(qNum);
            }
        }
    });

    if (student) {
        setFeedback(feedbackMap);
    } else {
        correctCount = Object.values(feedback).filter(Boolean).length;
    }
    
    const finalScore = (correctCount / quiz.questions.length) * maxScore;

    setIsSubmitted(true);
    setShowSubmitConfirm(false);

    // --- XỬ LÝ LƯU DB ---
    if (student) {
        const answerHistoryStr = questionsToRender.map((q, idx) => {
            const selected = answers[q.id];
            const char = selected !== undefined ? String.fromCharCode(65 + selected) : '_';
            return `${idx + 1}.${char}`;
        }).join(', ');

        try {
            await addDoc(collection(db, "quiz_results"), {
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentId: student.id,
                studentName: student.fullName,
                classId: student.classId,
                score: finalScore,
                maxScore: maxScore,
                correctCount: correctCount,
                totalQuestions: quiz.questions.length,
                timestamp: Date.now(),
                answerHistory: answerHistoryStr,
                quizVariant: quizVariantCode ? `Mã ${quizVariantCode}` : 'Gốc',
                
                // --- NEW FIELDS FOR REVIEW ---
                detailStats: {
                    correct: listCorrect,
                    wrong: listWrong,
                    skipped: listSkipped
                },
                questionOrder: questionOrderIds, // SAVE ORDER
                userAnswers: answers // SAVE MAP
            });
        } catch (e) {
            console.error("Error saving result", e);
            alert("Không thể lưu kết quả. Vui lòng kiểm tra mạng.");
        }
    }
    
    setTimeout(() => setShowResultModal(true), 100);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const completedCount = Object.keys(answers).length;

  const renderResultModal = () => {
      const finalCorrect = Object.values(feedback).filter(Boolean).length;
      const finalScore = (finalCorrect / quiz.questions.length) * maxScore;
      const percent = finalCorrect / quiz.questions.length;

      let title = "Hoàn thành!";
      let colorClass = "text-blue-600";
      let msg = "Bạn đã cố gắng hết sức!";

      if (percent >= 0.8) {
          title = "Xuất sắc!";
          colorClass = "text-green-600";
          msg = "Kiến thức của bạn rất vững vàng. Tiếp tục phát huy nhé! 🎉";
      } else if (percent >= 0.5) {
          title = "Khá tốt!";
          colorClass = "text-blue-600";
          msg = "Bạn đã nắm được cơ bản, nhưng cần ôn luyện thêm một chút. 💪";
      } else {
          title = "Cần cố gắng!";
          colorClass = "text-orange-600";
          msg = "Đừng nản lòng! Hãy xem lại các câu sai để rút kinh nghiệm nhé. 📚";
      }

      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-[bounce_0.3s_ease-out] border border-gray-200">
                <Trophy className={`w-20 h-20 mx-auto mb-4 ${colorClass}`} />
                <h2 className={`text-3xl font-bold mb-2 ${colorClass}`}>{title}</h2>
                <div className="text-5xl font-bold text-gray-800 my-6">
                    {finalScore.toFixed(2)} <span className="text-xl text-gray-400 font-normal">/ {maxScore}</span>
                </div>
                <p className="text-gray-600 mb-8 text-lg font-medium">{msg}</p>
                <div className="bg-gray-50 rounded-xl p-4 mb-8 flex justify-around border border-gray-100">
                    <div>
                        <div className="text-sm text-gray-500 font-semibold">Số câu đúng</div>
                        <div className="font-bold text-2xl text-green-600">{finalCorrect}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 font-semibold">Tổng số câu</div>
                        <div className="font-bold text-2xl text-gray-800">{quiz.questions.length}</div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
                    >
                        <Home className="w-5 h-5 mr-2"/> Trang chủ
                    </button>
                    <button 
                        onClick={() => setShowResultModal(false)}
                        className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg flex items-center justify-center transition transform hover:scale-105"
                    >
                        <RotateCcw className="w-5 h-5 mr-2"/> Xem lại bài
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (questionsToRender.length === 0 && quiz.questions.length > 0) {
      return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang chuẩn bị đề thi...</div>;
  }

  return (
    <div className="max-w-3xl md:max-w-6xl mx-auto pb-20 px-4 md:px-0">
      
      {/* Sticky Header */}
      <div className={`sticky top-0 bg-white/95 backdrop-blur z-20 py-4 border-b mb-8 flex justify-between items-center px-4 -mx-4 sm:mx-0 sm:rounded-b-lg shadow-sm ${isReviewMode ? 'border-orange-200 bg-orange-50/95' : ''}`}>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-sm md:text-base flex items-center font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition">
           <ChevronLeft className="w-5 h-5 mr-1" /> {student ? "Thoát" : (isReviewMode ? "Đóng" : "Thoát")}
        </button>
        
        {isReviewMode ? (
            <div className="flex items-center text-orange-800 font-bold bg-orange-100 px-4 py-1.5 rounded-full animate-[fadeIn_0.5s] text-xs md:text-sm">
                <Eye className="w-4 h-4 md:w-5 md:h-5 mr-2"/> 
                <span className="hidden md:inline">ĐANG XEM LẠI BÀI LÀM: </span>
                <span className="md:ml-1 uppercase">{reviewResult?.studentName}</span>
            </div>
        ) : (
            <div className="flex items-center gap-2 md:gap-6">
                {quizVariantCode && (
                    <div className="hidden md:flex items-center bg-purple-100 text-purple-700 px-3 py-1.5 rounded border border-purple-200 shadow-sm font-bold text-sm animate-[fadeIn_0.5s]">
                        <Shuffle className="w-4 h-4 mr-2"/> Mã Đề: {quizVariantCode}
                    </div>
                )}

                {/* Điểm số trực tiếp cho Free Mode */}
                {!student && !isSubmitted && (
                    <div className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                        <span className="font-bold text-sm md:text-lg mr-2">{liveCorrectCount}/{quiz.questions.length}</span>
                        <span className="font-bold text-sm md:text-lg text-brand-600 border-l border-green-200 pl-2">
                            {liveScore.toFixed(2)}đ
                        </span>
                    </div>
                )}

                {timeLeft !== null && !isSubmitted && (
                    <div className={`text-lg md:text-xl font-mono font-bold flex items-center ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                        <Clock className="w-5 h-5 mr-1 md:mr-2"/> {formatTime(timeLeft)}
                    </div>
                )}

                {isSubmitted && (
                    <button 
                        onClick={() => setShowResultModal(true)}
                        className="flex flex-col items-end bg-brand-50 px-4 py-1 rounded-lg border border-brand-100 cursor-pointer hover:bg-brand-100 transition animate-pulse"
                    >
                        <span className="text-xs text-brand-500 uppercase tracking-wide font-bold">Kết quả</span>
                        <span className="text-xl font-bold text-brand-700">
                            {((Object.values(feedback).filter(Boolean).length / quiz.questions.length) * maxScore).toFixed(2)}đ
                        </span>
                    </button>
                )}
            </div>
        )}
      </div>

      <div className="text-center mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-brand-800 mb-2">{quiz.title}</h1>
          <div className="flex justify-center items-center gap-3 text-gray-500 text-sm">
              <span>{quiz.timeLimit ? `Thời gian: ${quiz.timeLimit} phút` : 'Không giới hạn thời gian'}</span>
              <span>•</span>
              <span>Thang điểm: {maxScore}</span>
              {quizVariantCode && <span className="md:hidden font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">• Mã: {quizVariantCode}</span>}
          </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {questionsToRender.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const selectedIdx = answers[q.id];
          
          const showResult = isSubmitted || (!student && isAnswered) || isReviewMode;
          const isCorrect = showResult ? feedback[q.id] : undefined;
          const isSkipped = showResult && !isAnswered;

          return (
            <div 
              key={q.id} 
              className={`bg-white p-6 md:p-8 rounded-xl border-2 transition-all shadow-sm ${
                !showResult 
                    ? (isAnswered ? 'border-brand-200' : 'border-gray-100 hover:border-brand-200')
                    : (isSkipped ? 'border-orange-200 bg-orange-50/20' : (isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'))
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="font-bold text-gray-500 text-sm md:text-lg uppercase bg-gray-100 px-3 py-1 rounded">Câu {idx + 1}</div>
                {showResult && (
                  <div>
                    {isSkipped ? (
                        <span className="flex items-center text-orange-600 font-bold text-sm md:text-base bg-orange-100 px-3 py-1.5 rounded-full">
                            <HelpCircle className="w-5 h-5 mr-2"/> HS Bỏ Trống
                        </span>
                    ) : isCorrect ? (
                      <span className="flex items-center text-green-600 font-bold text-sm md:text-base bg-green-100 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-5 h-5 mr-2"/> Đúng</span>
                    ) : (
                      <span className="flex items-center text-red-600 font-bold text-sm md:text-base bg-red-100 px-3 py-1.5 rounded-full"><XCircle className="w-5 h-5 mr-2"/> Sai</span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-lg md:text-2xl text-gray-800 mb-8 leading-relaxed md:leading-loose">
                <MathRenderer content={q.text} />
              </div>
              
              {q.image && (
                <div className="mb-8 flex justify-center">
                  <img 
                    src={q.image} 
                    alt={`Hình minh họa câu ${idx + 1}`} 
                    className="max-h-64 md:max-h-96 rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {q.options.map((opt, oIdx) => {
                  let btnClass = "border border-gray-200 hover:bg-gray-50";
                  let labelClass = "text-gray-400 font-bold";
                  
                  if (showResult) {
                      if (oIdx === q.correctIndex) {
                          // Đáp án đúng luôn hiện màu xanh
                          btnClass = "bg-green-100 border-green-500 text-green-900 font-medium";
                          labelClass = "text-green-700 font-bold";
                      } else if (oIdx === selectedIdx && !isCorrect) {
                          // Chọn sai hiện màu đỏ
                          btnClass = "bg-red-100 border-red-500 text-red-900";
                          labelClass = "text-red-700 font-bold";
                      } else {
                          // Các câu còn lại mờ đi
                          btnClass = "opacity-50 grayscale border-gray-100";
                      }
                  } else {
                      if (oIdx === selectedIdx) {
                        btnClass = "bg-brand-100 border-brand-500 text-brand-900 font-medium shadow-inner";
                        labelClass = "text-brand-700 font-bold";
                      } else {
                        btnClass = "bg-white cursor-pointer hover:border-brand-300 hover:shadow-md";
                      }
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={showResult} // Disable click in review/submitted mode
                      onClick={() => handleSelect(q.id, oIdx)}
                      className={`w-full text-left p-4 md:p-6 rounded-xl transition-all relative flex items-start text-base md:text-xl ${btnClass}`}
                    >
                      <span className={`mr-4 w-8 ${labelClass} text-lg md:text-2xl`}>{String.fromCharCode(65 + oIdx)}.</span>
                      <div className="flex-1 text-inherit pt-0.5">
                        <MathRenderer content={opt} inline />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Nút nộp bài */}
      {!isSubmitted && !isReviewMode && (
         <div className="mt-12 p-8 bg-white rounded-2xl text-center border border-brand-100 shadow-lg sticky bottom-4 z-20">
            <p className="mb-4 text-gray-500">Đã làm {completedCount}/{quiz.questions.length} câu</p>
            <button 
                onClick={() => finishQuiz(false)}
                className="bg-brand-600 text-white px-12 py-4 text-lg rounded-xl font-bold hover:bg-brand-700 shadow-lg transition transform hover:scale-105 active:scale-95"
            >
               {student ? "Nộp Bài" : "Kết Thúc & Xem Điểm"}
            </button>
         </div>
      )}
      
      {/* Nút xem lại kết quả (hiện khi đã nộp nhưng tắt modal) - CHỈ HIỆN KHI VỪA NỘP XONG */}
      {isSubmitted && !showResultModal && !isReviewMode && (
          <div className="mt-12 p-8 bg-green-50 rounded-2xl text-center border border-green-100 shadow-lg sticky bottom-4 z-20">
             <div className="flex justify-center gap-4">
                 <button onClick={() => setShowResultModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow transition flex items-center">
                    <Trophy className="w-5 h-5 mr-2"/> Xem Tổng Kết
                 </button>
                 <button onClick={onBack} className="bg-gray-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-700 shadow transition flex items-center">
                    <Home className="w-5 h-5 mr-2"/> Trang chủ
                 </button>
             </div>
          </div>
      )}

      {/* MODAL CONFIRM SUBMIT */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4"/>
                <h3 className="font-bold text-xl mb-2 text-gray-800">Xác nhận nộp bài?</h3>
                
                {unansweredList.length > 0 ? (
                  <div className="mb-6 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 text-sm font-bold mb-1">Bạn chưa làm {unansweredList.length} câu:</p>
                    <p className="text-gray-600 text-xs break-words leading-relaxed">
                        {unansweredList.join(', ')}
                    </p>
                    <p className="text-red-500 text-xs mt-2 italic">Các câu này sẽ bị tính 0 điểm.</p>
                  </div>
                ) : (
                   <p className="text-gray-500 mb-6">Bạn đã hoàn thành tất cả câu hỏi.</p>
                )}

                <div className="flex gap-3">
                    <button 
                      onClick={() => setShowSubmitConfirm(false)} 
                      className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700 hover:bg-gray-200"
                    >
                      Xem lại
                    </button>
                    <button 
                      onClick={() => finishQuiz(true)} 
                      className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 shadow-lg"
                    >
                      Nộp ngay
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* RESULT MODAL */}
      {showResultModal && renderResultModal()}
    </div>
  );
};
