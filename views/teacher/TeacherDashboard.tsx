
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc,
  writeBatch,
  updateDoc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { TeacherProfile, Quiz, Question, ClassRoom, StudentAccount, QuizResult } from '../../types';
import { LogOut, Plus, List, Edit, Trash2, Save, Image as ImageIcon, X, Users, Upload, UserPlus, Download, AlertTriangle, UserX, PenLine, BarChart3, Search, Filter, RotateCcw, CheckSquare, Square, CalendarClock, SortAsc, KeyRound, CheckCircle2, UserCog, Settings, Lock, Unlock, Shuffle, Eye, Gamepad2 } from 'lucide-react';
import { StudentTakeQuiz } from '../student/StudentTakeQuiz';
import { GameCenter } from './games/GameCenter';

interface TeacherDashboardProps {
  profile: TeacherProfile;
  onLogout: () => void;
  onPreviewQuiz: (q: Quiz) => void;
  onProfileUpdate?: (p: TeacherProfile) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ profile, onLogout, onPreviewQuiz, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'classes' | 'grades' | 'games'>('quizzes');
  
  // --- STATE: QUIZZES ---
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  
  // Advanced Quiz Config
  const [newTimeLimit, setNewTimeLimit] = useState<number>(0);
  const [newMaxScore, setNewMaxScore] = useState<number>(10);
  const [newIsPublic, setNewIsPublic] = useState<boolean>(true);
  const [newAccessCode, setNewAccessCode] = useState(''); 
  const [newAssignedClasses, setNewAssignedClasses] = useState<string[]>([]);
  const [newAllowRetake, setNewAllowRetake] = useState<boolean>(true);
  const [newShuffle, setNewShuffle] = useState<boolean>(false); // NEW: Shuffle State
  const [newClassSchedules, setNewClassSchedules] = useState<Record<string, string>>({});

  // --- STATE: CLASSES & STUDENTS ---
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]); 
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  // Edit Class Name
  const [isEditingClassId, setIsEditingClassId] = useState<string | null>(null);
  const [editClassNameVal, setEditClassNameVal] = useState('');

  // Student Import & Add
  const [isImportingStudents, setIsImportingStudents] = useState(false);
  const [studentImportText, setStudentImportText] = useState(''); 
  const [isCreatingStudent, setIsCreatingStudent] = useState(false); 
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUser, setNewStudentUser] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);

  // Class Results (Old view inside Class tab)
  const [classResults, setClassResults] = useState<QuizResult[]>([]);
  const [viewingResults, setViewingResults] = useState(false);

  // --- STATE: GRADEBOOK (NEW TAB) ---
  const [gradeClassFilter, setGradeClassFilter] = useState<string>('all');
  const [gradeQuizFilter, setGradeQuizFilter] = useState<string>('all');
  const [gradeResults, setGradeResults] = useState<QuizResult[]>([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  // Stats
  const [statsTotalStudents, setStatsTotalStudents] = useState(0);

  // --- STATE: TEACHER REVIEW MODE ---
  const [reviewingResult, setReviewingResult] = useState<QuizResult | null>(null);
  const [reviewingQuiz, setReviewingQuiz] = useState<Quiz | null>(null);

  // --- STATE: UTILS & CONFIG ---
  const [importMode, setImportMode] = useState<'manual' | 'bulk'>('manual');
  const [bulkContent, setBulkContent] = useState('');
  const [bulkAnswers, setBulkAnswers] = useState('');
  
  // Profile Config State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newCode, setNewCode] = useState(profile.teacherCode);
  const [newSchool, setNewSchool] = useState(profile.school || '');
  const [newName, setNewName] = useState(profile.name || '');
  
  // Change Password State
  const [changePassVal, setChangePassVal] = useState('');
  const [msg, setMsg] = useState('');
  // NEW: Dedicated state for password feedback
  const [passFeedback, setPassFeedback] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // --- MODAL STATES (DELETE/RESET) ---
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<{id: string, name: string} | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);
  const [showDeleteAllStudentsModal, setShowDeleteAllStudentsModal] = useState(false);
  
  // NEW MODAL: Reset Class Results
  const [showResetClassModal, setShowResetClassModal] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<QuizResult | null>(null); // For resetting single student

  const [pastingForIndex, setPastingForIndex] = useState<number | null>(null);
  const pasteInputRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false); // Global loading

  // --- GAME STATE ---
  const [gameSelectedClassId, setGameSelectedClassId] = useState<string>('');

  useEffect(() => {
    fetchQuizzes();
    fetchClasses();
  }, [profile.uid]);

  // Fetch Logic
  const fetchQuizzes = async () => {
    const q = query(collection(db, "quizzes"), where("teacherId", "==", profile.uid));
    const snap = await getDocs(q);
    const list: Quiz[] = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Quiz));
    setQuizzes(list);
  };

  const fetchClasses = async () => {
    const q = query(collection(db, "classes"), where("teacherId", "==", profile.uid));
    const snap = await getDocs(q);
    const list: ClassRoom[] = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as ClassRoom));
    setClasses(list);
  };

  const fetchStudents = async (classId: string) => {
    const q = query(collection(db, "students"), where("classId", "==", classId));
    const snap = await getDocs(q);
    const list: StudentAccount[] = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as StudentAccount));
    // Sort by Order (STT) if available, otherwise by name
    list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.fullName.localeCompare(b.fullName));
    setStudents(list);
  };

  const fetchClassResults = async (classId: string) => {
      const q = query(collection(db, "quiz_results"), where("classId", "==", classId));
      const snap = await getDocs(q);
      const list: QuizResult[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as QuizResult));
      setClassResults(list);
  }

  // --- GRADEBOOK HANDLER ---
  const fetchGradebookData = async () => {
      setGradeLoading(true);
      setGradeResults([]);
      setStatsTotalStudents(0); // Reset stats

      try {
          // If class is selected, fetch student count for stats
          if (gradeClassFilter !== 'all') {
              const studentsQ = query(collection(db, "students"), where("classId", "==", gradeClassFilter));
              const sSnap = await getDocs(studentsQ);
              setStatsTotalStudents(sSnap.size);
          }

          let q;
          if (gradeClassFilter !== 'all') {
              q = query(collection(db, "quiz_results"), where("classId", "==", gradeClassFilter));
          } else if (gradeQuizFilter !== 'all') {
              q = query(collection(db, "quiz_results"), where("quizId", "==", gradeQuizFilter));
          } else {
              setGradeLoading(false);
              return;
          }

          const snap = await getDocs(q);
          let list: QuizResult[] = [];
          snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) } as QuizResult));

          if (gradeClassFilter !== 'all' && gradeQuizFilter !== 'all') {
              list = list.filter(r => r.quizId === gradeQuizFilter);
          }
          
          list.sort((a, b) => a.studentName.localeCompare(b.studentName) || b.timestamp - a.timestamp);

          setGradeResults(list);
      } catch (e) {
          console.error("Grade fetch error:", e);
      } finally {
          setGradeLoading(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'grades') {
          fetchGradebookData();
      }
  }, [gradeClassFilter, gradeQuizFilter, activeTab]);

  // --- TEACHER REVIEW LOGIC ---
  const handleTeacherReview = async (result: QuizResult) => {
      // Find the quiz data
      // First check if it's already in the local state 'quizzes'
      let foundQuiz = quizzes.find(q => q.id === result.quizId);
      
      // If not (e.g. maybe pagination or filtering logic change later), try fetching
      if (!foundQuiz) {
          try {
              const qSnap = await getDoc(doc(db, "quizzes", result.quizId));
              if (qSnap.exists()) {
                  foundQuiz = { id: qSnap.id, ...qSnap.data() } as Quiz;
              }
          } catch(e) {
              alert("Lỗi: Không tìm thấy đề thi gốc.");
              return;
          }
      }

      if (foundQuiz) {
          setReviewingQuiz(foundQuiz);
          setReviewingResult(result);
      } else {
          alert("Không tìm thấy đề thi.");
      }
  }

  // --- RESET/DELETE RESULT LOGIC ---
  const handleDeleteResult = async () => {
      if(!resultToDelete) return;
      setIsProcessing(true);
      try {
          await deleteDoc(doc(db, "quiz_results", resultToDelete.id));
          setGradeResults(prev => prev.filter(r => r.id !== resultToDelete.id));
          setResultToDelete(null);
      } catch(e: any) {
          alert("Lỗi: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  }

  const handleResetClass = async () => {
      if (gradeClassFilter === 'all' || gradeQuizFilter === 'all') return;
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          // Delete all displayed results
          gradeResults.forEach(r => {
              batch.delete(doc(db, "quiz_results", r.id));
          });
          await batch.commit();
          setGradeResults([]);
          setShowResetClassModal(false);
          alert("Đã xóa toàn bộ bài làm của lớp. Học sinh có thể làm lại.");
      } catch(e: any) {
           alert("Lỗi reset lớp: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  }

  // --- EXPORT FUNCTION ---
  const exportGradebookToCSV = async () => {
      if (gradeClassFilter === 'all' || gradeQuizFilter === 'all') {
          alert("Vui lòng chọn 1 Lớp Cụ Thể và 1 Đề Thi Cụ Thể để xuất báo cáo chi tiết.");
          return;
      }

      setIsProcessing(true);
      try {
          // 1. Fetch Class Info (Students)
          const studentsQ = query(collection(db, "students"), where("classId", "==", gradeClassFilter));
          const studentsSnap = await getDocs(studentsQ);
          const classStudents: StudentAccount[] = [];
          studentsSnap.forEach(d => classStudents.push({ id: d.id, ...d.data() } as StudentAccount));
          // Sort by Order (STT)
          classStudents.sort((a, b) => (a.order || 9999) - (b.order || 9999) || a.fullName.localeCompare(b.fullName));

          // 2. Fetch Quiz Info (Questions for analysis)
          const quizRef = doc(db, "quizzes", gradeQuizFilter);
          const quizSnap = await getDoc(quizRef);
          if (!quizSnap.exists()) throw new Error("Không tìm thấy đề thi.");
          const quizData = quizSnap.data() as Quiz;

          // 3. Map Results
          const resultByStudentId: Record<string, QuizResult> = {};
          gradeResults.forEach(r => {
              if (r.quizId === gradeQuizFilter) {
                  resultByStudentId[r.studentId] = r;
              }
          });

          // 4. Generate Rows
          const headers = [
              "STT", 
              "Họ và Tên", 
              "User ID", 
              "Điểm số", 
              "Mã Đề", // New column for shuffled code
              "Trạng thái", 
              "Thời gian nộp", 
              "Số câu đúng", 
              "Các câu ĐÚNG", 
              "Các câu SAI", 
              "Các câu CHƯA LÀM"
          ];

          const rows = classStudents.map((st, index) => {
              const res = resultByStudentId[st.id];
              const stt = st.order || (index + 1);
              
              if (!res) {
                  return [`"${stt}"`, `"${st.fullName}"`, `"${st.username}"`, "", "", "Chưa làm bài", "", "", "", "", ""];
              }

              const timestampStr = new Date(res.timestamp).toLocaleString('vi-VN'); 
              const variantCode = res.quizVariant || "Gốc"; 

              let correctStr = "";
              let wrongStr = "";
              let skippedStr = "";

              // --- LOGIC TÍNH TOÁN CHI TIẾT (1.A, 2.C...) ---
              // Ưu tiên 1: Dùng userAnswers + questionOrder (Dữ liệu mới nhất)
              if (res.userAnswers) {
                  const correctArr: string[] = [];
                  const wrongArr: string[] = [];
                  const skippedArr: string[] = [];

                  // Nếu có questionOrder (đã lưu thứ tự xáo trộn), dùng nó. Nếu không, dùng thứ tự gốc của quiz.
                  const order = res.questionOrder || quizData.questions.map(q => q.id);

                  order.forEach((qId, idx) => {
                      const qNum = idx + 1; // Số thứ tự câu hiển thị với HS (1, 2, 3...)
                      
                      // Tìm câu hỏi gốc để biết đáp án đúng
                      const questionDef = quizData.questions.find(q => q.id === qId);
                      if (!questionDef) return;

                      // Lấy index đáp án HS chọn (0, 1, 2...)
                      const userIdx = res.userAnswers ? res.userAnswers[qId] : undefined;

                      if (userIdx === undefined) {
                          skippedArr.push(`${qNum}`); // Bỏ trống chỉ hiện số câu
                      } else {
                          const char = String.fromCharCode(65 + userIdx); // Chuyển 0->A, 1->B
                          const displayStr = `${qNum}.${char}`; // VD: 1.A

                          if (userIdx === questionDef.correctIndex) {
                              correctArr.push(displayStr);
                          } else {
                              wrongArr.push(displayStr);
                          }
                      }
                  });

                  correctStr = correctArr.join(', ');
                  wrongStr = wrongArr.join(', ');
                  skippedStr = skippedArr.join(', ');

              } else if (res.answerHistory) {
                  // Ưu tiên 2: Fallback cho dữ liệu cũ (Dựa vào chuỗi answerHistory "1.A, 2.B, 3._")
                  // Lưu ý: Cách này có thể không chính xác 100% nếu đề bị trộn mà không có questionOrder lưu lại.
                  const cList: string[] = [];
                  const wList: string[] = [];
                  const sList: string[] = [];
                  
                  const parts = res.answerHistory.split(',').map(s => s.trim());
                  parts.forEach(p => {
                      const [qIdxStr, ansChar] = p.split('.');
                      const qIdx = parseInt(qIdxStr); // 1-based index
                      
                      if (!isNaN(qIdx) && qIdx > 0 && qIdx <= quizData.questions.length) {
                          if (ansChar === '_') {
                              sList.push(qIdxStr);
                          } else {
                              // Logic cũ: Giả định thứ tự câu hỏi khớp với quiz gốc
                              const ansCode = ansChar.charCodeAt(0) - 65;
                              const correctCode = quizData.questions[qIdx - 1].correctIndex;
                              const displayStr = `${qIdxStr}.${ansChar}`;

                              if (ansCode === correctCode) {
                                  cList.push(displayStr);
                              } else {
                                  wList.push(displayStr);
                              }
                          }
                      }
                  });
                  correctStr = cList.join(', ');
                  wrongStr = wList.join(', ');
                  skippedStr = sList.join(', ');
              }

              return [
                  `"${stt}"`,
                  `"${st.fullName}"`,
                  `"${st.username}"`,
                  `"${res.score}"`,
                  `"${variantCode}"`,
                  "Đã làm",
                  `"${timestampStr}"`, 
                  `"'${res.correctCount}/${res.totalQuestions}"`, 
                  `"${correctStr}"`,
                  `"${wrongStr}"`,
                  `"${skippedStr}"`
              ];
          });
          
          const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const cleanTitle = quizData.title.replace(/[^a-z0-9]/gi, '_');
          link.setAttribute("download", `BaoCao_${cleanTitle}_${new Date().toISOString().slice(0,10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

      } catch (e: any) {
          alert("Lỗi xuất file: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  }

  // --- CLASS & STUDENT MANAGEMENT HANDLERS ---
  const createClass = async () => {
      if(!newClassName) return;
      try {
          const newClass: Omit<ClassRoom, 'id'> = { teacherId: profile.uid, name: newClassName, createdAt: Date.now() };
          await addDoc(collection(db, "classes"), newClass);
          setNewClassName(''); setIsCreatingClass(false); fetchClasses();
      } catch(e) { alert("Lỗi tạo lớp"); }
  };

  const updateClass = async () => {
      if (!isEditingClassId || !editClassNameVal.trim()) return;
      try {
          await updateDoc(doc(db, "classes", isEditingClassId), { name: editClassNameVal.trim() });
          setClasses(prev => prev.map(c => c.id === isEditingClassId ? {...c, name: editClassNameVal.trim()} : c));
          if (selectedClass?.id === isEditingClassId) { setSelectedClass(prev => prev ? {...prev, name: editClassNameVal.trim()} : null); }
          setIsEditingClassId(null); setEditClassNameVal('');
      } catch (e: any) { alert("Lỗi cập nhật tên lớp: " + e.message); }
  }

  const requestDeleteClass = (e: React.MouseEvent, c: ClassRoom) => { e.stopPropagation(); setClassToDelete({ id: c.id, name: c.name }); }

  const executeDeleteClass = async () => {
      if (!classToDelete) return; setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          const studentsQ = query(collection(db, "students"), where("classId", "==", classToDelete.id));
          const studentsSnap = await getDocs(studentsQ);
          studentsSnap.forEach((doc) => batch.delete(doc.ref));
          batch.delete(doc(db, "classes", classToDelete.id));
          await batch.commit();
          if(selectedClass?.id === classToDelete.id) { setSelectedClass(null); setStudents([]); }
          fetchClasses(); setClassToDelete(null);
      } catch(e: any) { alert("Lỗi xóa lớp: " + e.message); } finally { setIsProcessing(false); }
  }

  const generateStudentUsername = (rawUser: string, className: string) => { return `${profile.teacherCode}${className.replace(/\s+/g, '')}${rawUser.trim()}`; }
  
  const checkUsernameExists = async (username: string) => {
      try {
        const q = query(collection(db, "students"), where("username", "==", username));
        const snap = await getDocs(q); return !snap.empty;
      } catch (e) { return false; }
  }

  const handleManualAddStudent = async () => {
      if (!selectedClass || !newStudentName || !newStudentUser || !newStudentPass) { alert("Vui lòng nhập đủ thông tin."); return; }
      setIsProcessing(true);
      const finalUsername = generateStudentUsername(newStudentUser, selectedClass.name);
      if (await checkUsernameExists(finalUsername)) { alert(`⚠️ User "${finalUsername}" đã tồn tại.`); setIsProcessing(false); return; }
      
      try {
          // Calculate new order: max current order + 1
          const maxOrder = students.length > 0 ? Math.max(...students.map(s => s.order || 0)) : 0;
          const newOrder = maxOrder + 1;

          await addDoc(collection(db, "students"), { 
              teacherId: profile.uid, 
              classId: selectedClass.id, 
              fullName: newStudentName, 
              username: finalUsername, 
              password: newStudentPass,
              order: newOrder // NEW
          });
          alert(`✅ Thêm thành công: ${newStudentName}`);
          setNewStudentName(''); setNewStudentUser(''); setNewStudentPass(''); fetchStudents(selectedClass.id);
      } catch(e) { alert("Lỗi khi lưu."); } finally { setIsProcessing(false); }
  }

  const handleImportStudents = async () => {
      if(!selectedClass || !studentImportText) return;
      setIsProcessing(true);
      const lines = studentImportText.split('\n'); const batch = writeBatch(db);
      let countSuccess = 0; let skippedList: string[] = []; let processedUsernames = new Set<string>();
      
      // Calculate starting order
      let currentMaxOrder = students.length > 0 ? Math.max(...students.map(s => s.order || 0)) : 0;

      for (const line of lines) {
          if(!line.trim()) continue;
          const parts = line.split(/[\t,;|]|\s{2,}/).map(s => s.trim()).filter(Boolean);
          if(parts.length >= 3) {
              const name = parts[0]; const rawUser = parts[1]; const pass = parts[2];
              const finalUsername = generateStudentUsername(rawUser, selectedClass.name);
              if (processedUsernames.has(finalUsername) || await checkUsernameExists(finalUsername)) { skippedList.push(name); continue; }
              
              currentMaxOrder++; // Increment order
              
              const newRef = doc(collection(db, "students"));
              batch.set(newRef, { 
                  teacherId: profile.uid, 
                  classId: selectedClass.id, 
                  fullName: name, 
                  username: finalUsername, 
                  password: pass,
                  order: currentMaxOrder // NEW
              });
              processedUsernames.add(finalUsername); countSuccess++;
          }
      }
      try {
          if(countSuccess > 0) await batch.commit();
          alert(`Thêm ${countSuccess} HS. Bỏ qua ${skippedList.length} do trùng.`);
          if(countSuccess > 0) { setStudentImportText(''); setIsImportingStudents(false); fetchStudents(selectedClass.id); }
      } catch (e: any) { alert("Lỗi import: " + e.message); } finally { setIsProcessing(false); }
  }

  const handleUpdateStudent = async () => {
      if (!editingStudent) return;
      try {
          // IMPORTANT: Only update password if teacher entered something new
          const updateData: any = { fullName: editingStudent.fullName };
          if (editingStudent.password && editingStudent.password.trim() !== '') {
              updateData.password = editingStudent.password;
          }
          
          await updateDoc(doc(db, "students", editingStudent.id), updateData);
          alert("Cập nhật thành công!"); setEditingStudent(null); if (selectedClass) fetchStudents(selectedClass.id);
      } catch(e: any) { alert("Lỗi: " + e.message); }
  }

  const requestDeleteStudent = (e: React.MouseEvent, s: StudentAccount) => { e.stopPropagation(); setStudentToDelete({ id: s.id, name: s.fullName }); }

  const executeDeleteStudent = async () => {
      if (!studentToDelete) return; setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          batch.delete(doc(db, "students", studentToDelete.id));
          const resultsQ = query(collection(db, "quiz_results"), where("studentId", "==", studentToDelete.id));
          const resultsSnap = await getDocs(resultsQ); resultsSnap.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          setStudents(prev => prev.filter(s => s.id !== studentToDelete.id)); setStudentToDelete(null);
      } catch (e: any) { alert("Lỗi xóa HS: " + e.message); } finally { setIsProcessing(false); }
  }

  const requestDeleteAllStudents = () => { if (!selectedClass || students.length === 0) return; setShowDeleteAllStudentsModal(true); }

  const executeDeleteAllStudents = async () => {
      if (!selectedClass) return; setIsProcessing(true);
      try {
          const q = query(collection(db, "students"), where("classId", "==", selectedClass.id));
          const snap = await getDocs(q); const batch = writeBatch(db);
          snap.forEach((doc) => batch.delete(doc.ref)); await batch.commit();
          setStudents([]); setShowDeleteAllStudentsModal(false);
      } catch (e: any) { alert("Lỗi xóa hết: " + e.message); } finally { setIsProcessing(false); }
  }

  const exportClassToCSV = () => {
      if (!students || students.length === 0) return;
      // SHOW PASSWORD IN EXPORT (User Requested)
      const headers = ["STT", "Họ và tên", "Tên đăng nhập", "Mật khẩu"];
      const rows = students.map((s, idx) => [`"${s.order || idx + 1}"`, `"${s.fullName}"`, `"${s.username}"`, `"${s.password}"`]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.setAttribute("download", `Lop_${selectedClass?.name}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  // --- QUIZ HANDLERS ---
  const saveQuiz = async () => {
    if (!newQuizTitle || newQuestions.length === 0) return alert("Cần nhập tên và ít nhất 1 câu hỏi");
    try {
      // Process Schedules: Convert local ISO string to Timestamp
      const finalSchedules: Record<string, number> = {};
      Object.keys(newClassSchedules).forEach(classId => {
          if (newClassSchedules[classId]) {
              finalSchedules[classId] = new Date(newClassSchedules[classId]).getTime();
          }
      });
      
      const quizData = {
        teacherId: profile.uid, title: newQuizTitle, questions: newQuestions, createdAt: Date.now(),
        timeLimit: newTimeLimit, maxScore: newMaxScore, isPublic: newIsPublic, assignedClassIds: newAssignedClasses,
        allowRetake: newAllowRetake,
        shuffleQuestions: newShuffle, // SAVE SHUFFLE SETTING
        classSchedules: finalSchedules,
        accessCode: newAccessCode ? newAccessCode.trim().toUpperCase() : '' // Save access code
      };
      
      if (editingQuizId) { await setDoc(doc(db, "quizzes", editingQuizId), quizData, { merge: true }); alert("Cập nhật thành công!"); } 
      else { await addDoc(collection(db, "quizzes"), quizData); alert("Tạo mới thành công!"); }
      resetQuizForm(); fetchQuizzes();
    } catch (e) { alert("Lỗi lưu đề thi"); }
  };

  const handleEditQuiz = (e: React.MouseEvent, q: Quiz) => {
    e.stopPropagation();
    setEditingQuizId(q.id); setNewQuizTitle(q.title); setNewQuestions(q.questions);
    setNewTimeLimit(q.timeLimit || 0); setNewMaxScore(q.maxScore || 10);
    setNewIsPublic(q.isPublic !== undefined ? q.isPublic : true); setNewAssignedClasses(q.assignedClassIds || []);
    setNewAllowRetake(q.allowRetake !== undefined ? q.allowRetake : true);
    setNewShuffle(q.shuffleQuestions || false); // LOAD SHUFFLE
    setNewAccessCode(q.accessCode || ''); // Set Access Code
    
    // Parse timestamps back to ISO strings for input
    const scheduleState: Record<string, string> = {};
    if (q.classSchedules) {
        Object.entries(q.classSchedules).forEach(([cId, time]) => {
            // Convert timestamp to "YYYY-MM-DDTHH:mm"
            // Note: This needs to handle local timezone offset
            const d = new Date(time);
            const offset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
            scheduleState[cId] = localISOTime;
        });
    }
    setNewClassSchedules(scheduleState);

    setIsCreatingQuiz(true);
  };

  const resetQuizForm = () => {
    setIsCreatingQuiz(false); setEditingQuizId(null); setNewQuizTitle(''); setNewQuestions([]);
    setNewTimeLimit(0); setNewMaxScore(10); setNewIsPublic(true); setNewAssignedClasses([]);
    setNewAllowRetake(true); setBulkContent(''); setBulkAnswers(''); setNewClassSchedules({});
    setNewAccessCode(''); setNewShuffle(false);
  };

  const toggleClassAssignment = (classId: string) => {
      setNewAssignedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }

  const handleScheduleChange = (classId: string, val: string) => {
      setNewClassSchedules(prev => ({...prev, [classId]: val}));
  }

  const processPastedImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height; const MAX_WIDTH = 800;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            }; img.src = readerEvent.target?.result as string;
        }; reader.readAsDataURL(file);
    });
  };

  const handlePasteEvent = async (e: React.ClipboardEvent) => {
     const items = e.clipboardData.items;
     for (let i = 0; i < items.length; i++) {
         if (items[i].type.indexOf('image') !== -1) {
             e.preventDefault(); const blob = items[i].getAsFile();
             if (blob && pastingForIndex !== null) {
                 const base64 = await processPastedImage(blob);
                 const updated = [...newQuestions]; updated[pastingForIndex].image = base64;
                 setNewQuestions(updated); setPastingForIndex(null);
             } return;
         }
     }
  };

  const handleBulkParse = () => {
    if (!bulkContent.trim()) { alert("Vui lòng nhập nội dung."); return; }
    try {
      const answerMap: Record<number, number> = {};
      if (bulkAnswers.trim()) {
        const answerRegex = /(\d+)[\.\s\t:\-\)]+([A-D])/gi;
        let match; while ((match = answerRegex.exec(bulkAnswers)) !== null) { answerMap[parseInt(match[1])] = ['A', 'B', 'C', 'D'].indexOf(match[2].toUpperCase()); }
      }
      const rawBlocks = bulkContent.split(/(?:^|\n)(?:Câu|Bài)?\s*\d+[\.\:\)]\s*/i).filter(b => b.trim());
      const parsedQuestions: Question[] = [];
      rawBlocks.forEach((block, idx) => {
        const idxA = block.search(/(?:^|\n|\s)A[\.\)\:]\s/);
        if (idxA !== -1) {
            let qText = block.substring(0, idxA).trim(); let optionsPart = block.substring(idxA);
            const optRegex = /A[\.\)\:]\s([\s\S]*?)(?:(?:^|\n|\s)B[\.\)\:]\s)([\s\S]*?)(?:(?:^|\n|\s)C[\.\)\:]\s)([\s\S]*?)(?:(?:^|\n|\s)D[\.\)\:]\s)([\s\S]*)$/i;
            const match = optionsPart.match(optRegex);
            if (match) {
                const cleanD = match[4].replace(new RegExp(`(?:\\n|\\s)(?:Lời giải|Đáp án|Giải thích)[\\:\\.].*`, 'si'), '').trim();
                parsedQuestions.push({ id: Date.now().toString() + Math.random(), text: qText.trim(), options: [match[1].trim(), match[2].trim(), match[3].trim(), cleanD], correctIndex: answerMap[idx + 1] !== undefined ? answerMap[idx + 1] : 0 });
            }
        }
      });
      if (parsedQuestions.length === 0) { alert("Không nhận diện được."); return; }
      setNewQuestions([...newQuestions, ...parsedQuestions]); setImportMode('manual'); setBulkContent(''); setBulkAnswers('');
      alert(`Đã thêm ${parsedQuestions.length} câu.`);
    } catch (e) { alert("Lỗi phân tích."); }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...newQuestions]; updated[index] = { ...updated[index], [field]: value }; setNewQuestions(updated);
  };

  const saveConfig = async () => {
      // Basic config update
      try {
        await updateDoc(doc(db, "users", profile.uid), { 
            teacherCode: newCode, 
            school: newSchool, 
            name: newName 
        });
        
        // --- NEW: UPDATE PARENT STATE IMMEDIATELY ---
        const updatedProfile = { ...profile, teacherCode: newCode, school: newSchool, name: newName };
        if (onProfileUpdate) {
            onProfileUpdate(updatedProfile);
        }

        setMsg('Đã lưu thông tin!');
        // Hide message after 3 seconds
        setTimeout(() => setMsg(''), 3000);
      } catch (e: any) {
          alert("Lỗi lưu: " + e.message);
      }
  };

  const handleChangePassword = async () => {
      setPassFeedback(null); // Reset feedback
      if(profile.accountType !== 'simple') return;
      
      if(!changePassVal || changePassVal.trim().length < 6) {
          setPassFeedback({ text: "Mật khẩu quá ngắn (tối thiểu 6 ký tự)!", type: 'error' });
          return;
      }
      
      setIsProcessing(true);
      try {
          await updateDoc(doc(db, "users", profile.uid), { password: changePassVal });
          setPassFeedback({ text: "Cập nhật mật khẩu thành công!", type: 'success' });
          setChangePassVal('');
      } catch (e: any) {
          setPassFeedback({ text: "Lỗi: " + e.message, type: 'error' });
      } finally {
          setIsProcessing(false);
      }
  }

  // --- RENDER ---
  // A. Review Overlay (Conditional Render)
  if (reviewingQuiz && reviewingResult) {
      return (
          <div className="min-h-screen bg-gray-100 flex flex-col">
              <div className="bg-orange-600 text-white p-3 px-6 text-sm font-bold shadow-md flex justify-between items-center sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5"/>
                      <span>GIÁO VIÊN: Đang xem lại bài làm của HS <u>{reviewingResult.studentName}</u></span>
                  </div>
                  <button 
                    onClick={() => { setReviewingResult(null); setReviewingQuiz(null); }} 
                    className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition shadow"
                  >
                      Đóng (Quay lại)
                  </button>
              </div>
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  <StudentTakeQuiz 
                      quiz={reviewingQuiz}
                      student={null} // Pass null so no new data is saved
                      reviewResult={reviewingResult}
                      onBack={() => { setReviewingResult(null); setReviewingQuiz(null); }}
                  />
              </div>
          </div>
      )
  }

  // B. Main Dashboard Render
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-brand-100 text-brand-700 p-2 rounded-lg"><UserCog className="w-8 h-8"/></span>
            <div className="flex flex-col">
                <span>GV: {profile.name || profile.email}</span>
                <span className="text-sm font-normal text-gray-500">{profile.school}</span>
            </div>
        </h1>
        <div className="flex gap-3">
            <button 
                onClick={() => setShowProfileModal(true)} 
                className="flex items-center text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
            >
                <Settings className="w-5 h-5 mr-2" /> Thông tin cá nhân
            </button>
            <button onClick={onLogout} className="flex items-center text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg hover:bg-red-100 transition font-bold">
                <LogOut className="w-5 h-5 mr-2" /> Thoát
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 min-h-[500px]">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button onClick={() => setActiveTab('quizzes')} className={`flex-1 p-4 font-medium transition whitespace-nowrap ${activeTab === 'quizzes' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            Quản lý Đề Thi
          </button>
          <button onClick={() => setActiveTab('classes')} className={`flex-1 p-4 font-medium transition whitespace-nowrap ${activeTab === 'classes' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            Quản lý Lớp Học
          </button>
          <button onClick={() => setActiveTab('grades')} className={`flex-1 p-4 font-medium transition whitespace-nowrap flex items-center justify-center ${activeTab === 'grades' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <BarChart3 className="w-4 h-4 mr-2"/> Quản lý Điểm
          </button>
          <button onClick={() => setActiveTab('games')} className={`flex-1 p-4 font-medium transition whitespace-nowrap flex items-center justify-center ${activeTab === 'games' ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Gamepad2 className="w-4 h-4 mr-2"/> Trò Chơi (Gọi tên)
          </button>
        </div>

        <div className="p-6">
          {/* TAB: GAMES */}
          {activeTab === 'games' && (
              <div className="h-full">
                  <div className="mb-6 flex flex-col md:flex-row items-center gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <div className="flex-1 w-full">
                          <label className="block text-sm font-bold text-purple-800 mb-2">Chọn Lớp để Tổ chức Trò chơi:</label>
                          <select 
                            value={gameSelectedClassId} 
                            onChange={(e) => {
                                setGameSelectedClassId(e.target.value);
                                if(e.target.value) fetchStudents(e.target.value); // Load students immediately
                            }}
                            className="w-full p-3 border border-purple-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                          >
                              <option value="">-- Vui lòng chọn lớp --</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div className="text-sm text-purple-600 italic">
                          Hệ thống sẽ lấy danh sách học sinh của lớp đã chọn để tạo vòng quay hoặc cuộc đua.
                      </div>
                  </div>

                  {gameSelectedClassId ? (
                      <GameCenter 
                        students={students} 
                        className={classes.find(c => c.id === gameSelectedClassId)?.name || '...'}
                      />
                  ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                          <Gamepad2 className="w-24 h-24 text-gray-300 mb-4"/>
                          <h3 className="text-xl font-bold text-gray-500">Chưa chọn lớp học</h3>
                          <p className="text-gray-400">Vui lòng chọn một lớp ở trên để bắt đầu trò chơi.</p>
                      </div>
                  )}
              </div>
          )}

          {/* TAB: GRADES */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
               <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Filter className="w-5 h-5 mr-2 text-brand-600"/> Bộ lọc & Thao tác</h3>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-sm font-semibold text-gray-600 mb-1">Chọn Lớp</label>
                          <select value={gradeClassFilter} onChange={e => setGradeClassFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
                              <option value="all">-- Tất cả lớp --</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div className="flex-1 w-full">
                          <label className="block text-sm font-semibold text-gray-600 mb-1">Chọn Đề thi</label>
                          <select value={gradeQuizFilter} onChange={e => setGradeQuizFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
                              <option value="all">-- Tất cả đề thi --</option>
                              {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                          </select>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setShowResetClassModal(true)} disabled={gradeClassFilter === 'all' || gradeQuizFilter === 'all' || gradeResults.length === 0} className="px-4 py-2.5 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-200 disabled:opacity-50 flex items-center">
                              <RotateCcw className="w-4 h-4 mr-2"/> Reset Lớp
                          </button>
                          <button onClick={exportGradebookToCSV} className="px-4 py-2.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center shadow-sm">
                              <Download className="w-4 h-4 mr-2"/> Xuất Chi Tiết
                          </button>
                      </div>
                  </div>
               </div>

               {/* Stats Overview */}
               {gradeClassFilter !== 'all' && gradeQuizFilter !== 'all' && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm text-center">
                           <div className="text-gray-500 text-xs uppercase font-bold">Sĩ số lớp</div>
                           <div className="text-2xl font-bold text-gray-800">{statsTotalStudents}</div>
                       </div>
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm text-center">
                           <div className="text-gray-500 text-xs uppercase font-bold">Đã nộp bài</div>
                           <div className="text-2xl font-bold text-green-600">{gradeResults.length}</div>
                       </div>
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm text-center">
                           <div className="text-gray-500 text-xs uppercase font-bold">Chưa nộp</div>
                           <div className="text-2xl font-bold text-red-500">{Math.max(0, statsTotalStudents - gradeResults.length)}</div>
                       </div>
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm text-center">
                           <div className="text-gray-500 text-xs uppercase font-bold">Điểm TB</div>
                           <div className="text-2xl font-bold text-brand-600">
                               {gradeResults.length > 0 
                                ? (gradeResults.reduce((sum, r) => sum + r.score, 0) / gradeResults.length).toFixed(2)
                                : '0.00'}
                           </div>
                       </div>
                   </div>
               )}

               <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                   <table className="w-full text-sm">
                       <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                           <tr>
                               <th className="p-3 text-left">Học sinh</th>
                               <th className="p-3 text-left">Lớp</th>
                               <th className="p-3 text-left">Bài thi</th>
                               <th className="p-3 text-center">Điểm số</th>
                               <th className="p-3 text-right">Ngày nộp</th>
                               <th className="p-3 w-1/4">Chi tiết</th>
                               <th className="p-3 text-center">Thao tác</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {gradeLoading ? (
                               <tr><td colSpan={7} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                           ) : gradeResults.length > 0 ? (
                               gradeResults.map(r => {
                                   const className = classes.find(c => c.id === r.classId)?.name || "...";
                                   return (
                                     <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-900">{r.studentName}</td>
                                        <td className="p-3 text-gray-600">{className}</td>
                                        <td className="p-3 text-gray-800">{r.quizTitle}</td>
                                        <td className="p-3 text-center"><span className={`px-2 py-1 rounded font-bold ${r.score >= (r.maxScore/2) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.score.toFixed(2)}</span></td>
                                        <td className="p-3 text-right font-mono text-gray-500">{new Date(r.timestamp).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</td>
                                        <td className="p-3"><div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 break-words max-h-20 overflow-y-auto">{r.answerHistory || "-"}</div></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleTeacherReview(r)} 
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full" 
                                                    title="Xem lại bài làm (Chấm chi tiết)"
                                                >
                                                    <Eye className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => setResultToDelete(r)} 
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full" 
                                                    title="Xóa bài này để HS làm lại"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                     </tr>
                                   )
                               })
                           ) : (
                               <tr><td colSpan={7} className="p-12 text-center text-gray-400">{gradeClassFilter === 'all' && gradeQuizFilter === 'all' ? "Vui lòng chọn Lớp hoặc Đề thi để xem điểm." : "Không tìm thấy dữ liệu nào."}</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
            </div>
          )}

          {/* TAB: CLASSES (Keep existing code) */}
          {activeTab === 'classes' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
                {/* Left: Class List */}
                <div className="w-full md:w-1/3 border-r border-gray-100 pr-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Danh sách Lớp</h3>
                        <button onClick={() => setIsCreatingClass(true)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Plus className="w-4 h-4"/></button>
                    </div>
                    
                    {isCreatingClass && (
                        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                            <input className="w-full mb-2 p-2 border border-gray-300 rounded bg-white text-gray-900" placeholder="Tên lớp (VD: 12A1)" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreatingClass(false)} className="text-sm text-gray-500">Hủy</button>
                                <button onClick={createClass} className="text-sm bg-brand-600 text-white px-3 py-1 rounded">Lưu</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {classes.map(c => (
                            <div key={c.id} className={`flex items-center justify-between p-1 rounded-lg border transition-all ${selectedClass?.id === c.id ? 'bg-brand-50 border-brand-200 shadow-sm' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                                <div onClick={() => { setSelectedClass(c); fetchStudents(c.id); setViewingResults(false); setIsCreatingStudent(false); setIsImportingStudents(false); }} className="flex-1 p-3 cursor-pointer font-bold text-gray-700 hover:text-brand-700">{c.name}</div>
                                <div className="flex items-center gap-1 pr-1 shrink-0 relative z-10">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingClassId(c.id); setEditClassNameVal(c.name); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><PenLine className="w-4 h-4"/></button>
                                    <button type="button" onClick={(e) => requestDeleteClass(e, c)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Class Detail */}
                <div className="flex-1 pl-2">
                    {selectedClass ? (
                        <>
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-brand-700">Lớp {selectedClass.name}</h2>
                                    <p className="text-xs text-gray-400 mt-1">Mã User tự động: <span className="font-mono bg-gray-100 px-1">{profile.teacherCode}{selectedClass.name.replace(/\s+/g, '')}[User]</span></p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setViewingResults(!viewingResults); if(!viewingResults) fetchClassResults(selectedClass.id); }} className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                                        {viewingResults ? <Users className="w-4 h-4 mr-2"/> : <List className="w-4 h-4 mr-2"/>} {viewingResults ? "Xem DS Học sinh" : "Xem Bảng Điểm"}
                                    </button>
                                    {!viewingResults && (
                                        <>
                                            <button onClick={exportClassToCSV} className="flex items-center px-3 py-2 bg-teal-100 text-teal-700 rounded hover:bg-teal-200"><Download className="w-4 h-4 mr-2"/> Xuất Excel</button>
                                            <button onClick={() => {setIsCreatingStudent(true); setIsImportingStudents(false);}} className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><UserPlus className="w-4 h-4 mr-2"/> Thêm 1 HS</button>
                                            <button onClick={() => {setIsImportingStudents(true); setIsCreatingStudent(false);}} className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Upload className="w-4 h-4 mr-2"/> Import (Excel)</button>
                                            <button type="button" onClick={requestDeleteAllStudents} className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200 shadow-sm"><UserX className="w-4 h-4 mr-2"/> Xóa Hết HS</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {viewingResults ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-700 font-bold">
                                            <tr>
                                                <th className="p-3 text-left">Học sinh</th>
                                                <th className="p-3 text-left">Đề thi</th>
                                                <th className="p-3 text-center">Điểm</th>
                                                <th className="p-3 text-right">Ngày giờ nộp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classResults.map(r => (
                                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">{r.studentName}</td>
                                                    <td className="p-3">{r.quizTitle}</td>
                                                    <td className="p-3 text-center font-bold text-brand-600">{r.score.toFixed(2)}/{r.maxScore}</td>
                                                    <td className="p-3 text-right font-mono text-gray-600">{new Date(r.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div>
                                    {isCreatingStudent && (
                                        <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200 text-gray-900">
                                            <h4 className="font-bold mb-3 text-green-800">Thêm học sinh mới</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                                <input className="p-2 border rounded text-sm bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Họ và Tên" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                                                <div className="relative">
                                                     <div className="absolute left-0 top-0 bottom-0 bg-gray-100 px-2 flex items-center text-xs text-gray-500 border-r border-t border-b rounded-l border-gray-300">{profile.teacherCode}{selectedClass.name.replace(/\s+/g, '')}</div>
                                                     <input className="w-full p-2 pl-[calc(100%-60%)] border rounded text-sm bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" style={{paddingLeft: `${(profile.teacherCode.length + selectedClass.name.replace(/\s+/g, '').length) * 9 + 10}px`}} placeholder="username" value={newStudentUser} onChange={e => setNewStudentUser(e.target.value)} />
                                                </div>
                                                <input className="p-2 border rounded text-sm bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Mật khẩu" value={newStudentPass} onChange={e => setNewStudentPass(e.target.value)} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleManualAddStudent} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold shadow hover:bg-green-700">{isProcessing ? 'Đang check...' : 'Lưu HS'}</button>
                                                <button onClick={() => setIsCreatingStudent(false)} className="text-gray-600 bg-white border border-gray-300 px-4 py-2 text-sm rounded hover:bg-gray-100">Hủy</button>
                                            </div>
                                        </div>
                                    )}
                                    {isImportingStudents && (
                                        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                                            <h4 className="font-bold mb-2 text-blue-800">Nhập nhanh danh sách (Copy từ Excel)</h4>
                                            <p className="text-xs text-gray-600 mb-2">Định dạng 3 cột: <b>Họ và Tên | Username | Password</b></p>
                                            <p className="text-xs text-blue-600 mb-2 italic">Hệ thống sẽ tự động thêm tiền tố <b>{profile.teacherCode}{selectedClass.name.replace(/\s+/g, '')}</b> vào Username. <br/>Số thứ tự (STT) sẽ được tự động đánh theo thứ tự nhập.</p>
                                            <textarea className="w-full h-40 p-2 border border-gray-300 rounded mb-2 text-sm font-mono bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`Nguyen Van A  aa  123\nTran Thi B  bb  456`} value={studentImportText} onChange={e => setStudentImportText(e.target.value)} />
                                            <div className="flex gap-2">
                                                <button onClick={handleImportStudents} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-700 shadow">{isProcessing ? 'Đang xử lý...' : 'Thêm danh sách'}</button>
                                                <button onClick={() => setIsImportingStudents(false)} className="text-gray-600 bg-white border border-gray-300 px-4 py-2 text-sm rounded hover:bg-gray-100">Hủy</button>
                                            </div>
                                        </div>
                                    )}
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-100 text-gray-500 text-xs uppercase">
                                            <tr>
                                                <th className="p-3 w-16">STT</th>
                                                <th className="p-3">Họ và tên</th>
                                                <th className="p-3">Tài khoản (Đăng nhập)</th>
                                                <th className="p-3">Mật khẩu</th>
                                                <th className="p-3 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {students.map((s, idx) => (
                                                <tr key={s.id} className="hover:bg-gray-50 group">
                                                    <td className="p-3 text-gray-400 font-mono text-xs">{s.order || idx + 1}</td>
                                                    <td className="p-3 font-medium text-gray-900">{s.fullName}</td>
                                                    <td className="p-3 font-mono text-blue-600 font-bold">{s.username}</td>
                                                    <td className="p-3 font-mono text-gray-500">******</td>
                                                    <td className="p-3 text-right flex justify-end gap-2">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingStudent({...s, password: ''}); }} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"><Edit className="w-4 h-4"/></button>
                                                        <button type="button" onClick={(e) => requestDeleteStudent(e, s)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Chưa có học sinh.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : <div className="h-full flex items-center justify-center text-gray-400">Chọn một lớp để xem chi tiết</div>}
                </div>
            </div>
          )}

          {/* TAB: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div>
              {!isCreatingQuiz ? (
                <div>
                   <button onClick={() => setIsCreatingQuiz(true)} className="mb-6 bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-green-700 flex items-center"><Plus className="w-5 h-5 mr-2"/> Soạn Đề Mới</button>
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                       {quizzes.map(q => (
                           <div key={q.id} className="border p-5 rounded-xl hover:shadow-lg transition bg-white relative">
                               <h3 className="font-bold text-lg mb-2">{q.title}</h3>
                               <div className="text-sm text-gray-500 mb-4 space-y-1">
                                   <p>{q.questions.length} câu • {q.timeLimit ? q.timeLimit + ' phút' : 'Không giới hạn'}</p>
                                   <div className="flex items-center gap-2">
                                       {q.isPublic ? (
                                           q.accessCode ? 
                                           <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded flex items-center"><Lock className="w-3 h-3 mr-1"/> Mã: {profile.teacherCode}{q.accessCode}</span>
                                           : <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded flex items-center"><Unlock className="w-3 h-3 mr-1"/> Mã: {profile.teacherCode}</span>
                                       ) : (
                                           <span className="text-gray-400 font-bold text-xs">✗ Khóa (Chỉ Lớp)</span>
                                       )}
                                       {/* Shuffle indicator */}
                                       {q.shuffleQuestions && (
                                           <span className="text-purple-600 font-bold text-xs bg-purple-50 px-2 py-0.5 rounded flex items-center"><Shuffle className="w-3 h-3 mr-1"/> Trộn đề</span>
                                       )}
                                   </div>
                                   <p className="text-xs">{q.allowRetake ? <span className="text-blue-600 font-bold">✓ Cho phép làm lại</span> : <span className="text-red-500 font-bold">✗ Chỉ 1 lần</span>}</p>
                                   <p className="text-xs">Giao cho: {q.assignedClassIds && q.assignedClassIds.length > 0 ? classes.filter(c => q.assignedClassIds?.includes(c.id)).map(c => c.name).join(', ') : 'Chưa giao lớp nào'}</p>
                               </div>
                               <div className="flex gap-2 pt-3 border-t">
                                   <button onClick={(e) => handleEditQuiz(e, q)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-bold">Sửa</button>
                                   <button onClick={() => onPreviewQuiz(q)} className="flex-1 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm font-bold">Xem</button>
                                   <button onClick={() => setQuizToDelete(q.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                               </div>
                           </div>
                       ))}
                   </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">{editingQuizId ? 'Sửa Đề Thi' : 'Tạo Đề Mới'}</h2>
                        <button onClick={resetQuizForm} className="text-gray-500 hover:bg-gray-100 px-4 py-2 rounded">Hủy</button>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 grid md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">Tên Đề Thi</label>
                            <input className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="VD: Kiểm tra 15 phút" value={newQuizTitle} onChange={e => setNewQuizTitle(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Thời gian (phút)</label>
                            <input type="number" className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0 = Không giới hạn" value={newTimeLimit} onChange={e => setNewTimeLimit(Number(e.target.value))}/>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Thang điểm</label>
                            <input type="number" className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900" value={newMaxScore} onChange={e => setNewMaxScore(Number(e.target.value))}/>
                        </div>
                        
                        <div className="col-span-2 border-t pt-4 grid md:grid-cols-2 gap-4">
                            <div className="p-3 border rounded-lg bg-white hover:border-brand-500 transition">
                                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer mb-2">
                                    <input type="checkbox" checked={newIsPublic} onChange={e => setNewIsPublic(e.target.checked)} className="w-5 h-5 accent-brand-600"/>
                                    <span>Cho phép truy cập bằng Mã Giáo Viên (Free Mode)</span>
                                </label>
                                {newIsPublic && (
                                    <div className="ml-7 animate-[fadeIn_0.3s_ease-out]">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Mã phụ (Tùy chọn - Để trống nếu muốn công khai)</label>
                                        <div className="flex items-center">
                                            <span className="bg-gray-100 px-2 py-2 border border-r-0 border-gray-300 rounded-l text-gray-500 font-mono text-sm">{profile.teacherCode}</span>
                                            <input 
                                                className="flex-1 p-2 border border-gray-300 rounded-r bg-white text-gray-900 font-mono text-sm uppercase placeholder-gray-300 outline-none focus:ring-1 focus:ring-brand-500" 
                                                placeholder="VD: TEST01" 
                                                value={newAccessCode} 
                                                onChange={e => setNewAccessCode(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-xs text-brand-600 mt-1">
                                            {newAccessCode ? 
                                                <>HS sẽ nhập mã: <b>{profile.teacherCode}{newAccessCode.toUpperCase()}</b></> 
                                                : 
                                                <>HS chỉ cần nhập mã: <b>{profile.teacherCode}</b></>
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer p-3 border rounded-lg bg-white hover:border-brand-500 transition">
                                    <input type="checkbox" checked={newAllowRetake} onChange={e => setNewAllowRetake(e.target.checked)} className="w-5 h-5 accent-brand-600"/>
                                    <span>Cho phép làm lại nhiều lần?</span>
                                </label>

                                <label className="flex items-center gap-2 font-bold text-purple-800 cursor-pointer p-3 border border-purple-200 rounded-lg bg-purple-50 hover:border-purple-500 transition">
                                    <input type="checkbox" checked={newShuffle} onChange={e => setNewShuffle(e.target.checked)} className="w-5 h-5 accent-purple-600"/>
                                    <div className="flex items-center">
                                        <Shuffle className="w-4 h-4 mr-2"/> 
                                        <span>Trộn đề (Shuffle Mode)</span>
                                    </div>
                                    <span className="text-xs font-normal text-purple-600 ml-auto block">Đảo câu hỏi & đáp án mỗi lần thi</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="col-span-2">
                            <label className="block font-bold text-gray-700 mb-2">Giao cho lớp (Lưu điểm) & Hẹn giờ:</label>
                            {classes.length === 0 && <p className="text-gray-400 text-sm">Chưa có lớp nào. Hãy tạo lớp trước.</p>}
                            <div className="space-y-2">
                                {classes.map(c => {
                                    const isChecked = newAssignedClasses.includes(c.id);
                                    return (
                                        <div key={c.id} className={`flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-lg transition ${isChecked ? 'bg-brand-50 border-brand-500' : 'bg-white border-gray-200'}`}>
                                            <label className="flex items-center cursor-pointer min-w-[150px]">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 accent-brand-600 mr-2" 
                                                    checked={isChecked} 
                                                    onChange={() => toggleClassAssignment(c.id)}
                                                />
                                                <span className={`font-bold ${isChecked ? 'text-brand-700' : 'text-gray-600'}`}>{c.name}</span>
                                            </label>
                                            
                                            {isChecked && (
                                                <div className="flex-1 flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
                                                    <CalendarClock className="w-5 h-5 text-gray-500"/>
                                                    <span className="text-sm text-gray-600 whitespace-nowrap">Mở đề lúc:</span>
                                                    <input 
                                                        type="datetime-local" 
                                                        className="p-2 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-1 focus:ring-brand-500 outline-none"
                                                        value={newClassSchedules[c.id] || ''}
                                                        onChange={(e) => handleScheduleChange(c.id, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-sm font-bold ${importMode === 'manual' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>Thủ công</button>
                        <button onClick={() => setImportMode('bulk')} className={`px-4 py-2 rounded text-sm font-bold ${importMode === 'bulk' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>Nhập nhanh (Text)</button>
                    </div>

                    {importMode === 'bulk' ? (
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                             <textarea className="w-full h-64 p-3 border border-gray-300 rounded mb-4 bg-white text-gray-900" placeholder="Câu 1: ... A. ... B. ..." value={bulkContent} onChange={e => setBulkContent(e.target.value)}/>
                             <textarea className="w-full h-20 p-3 border border-gray-300 rounded mb-4 bg-white text-gray-900" placeholder="Đáp án: 1.A 2.B..." value={bulkAnswers} onChange={e => setBulkAnswers(e.target.value)}/>
                             <button onClick={handleBulkParse} className="w-full bg-brand-600 text-white font-bold py-3 rounded">Phân tích & Thêm</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {newQuestions.map((q, idx) => (
                                <div key={q.id} className="border p-6 rounded-xl bg-white shadow-sm relative group">
                                    <div className="flex justify-between mb-4">
                                        <span className="font-bold bg-gray-100 px-2 py-1 rounded">Câu {idx+1}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPastingForIndex(idx)} className="p-2 text-purple-600 bg-purple-50 rounded"><ImageIcon className="w-4 h-4"/></button>
                                            <button onClick={() => { const n = [...newQuestions]; n.splice(idx,1); setNewQuestions(n);}} className="p-2 text-red-600 bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mb-4">
                                        <textarea className="flex-1 p-3 border border-gray-300 rounded bg-white text-gray-900" rows={3} value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} placeholder="Nội dung câu hỏi..."/>
                                        {q.image && <div className="w-32 h-32 border rounded relative"><img src={q.image} className="w-full h-full object-contain"/><button onClick={() => updateQuestion(idx, 'image', '')} className="absolute top-1 right-1 bg-white rounded-full text-red-600"><X className="w-4 h-4"/></button></div>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center border border-gray-300 p-2 rounded focus-within:ring-1 ring-brand-500 bg-white">
                                                <input type="radio" checked={q.correctIndex === oIdx} onChange={() => updateQuestion(idx, 'correctIndex', oIdx)} className="mr-2"/>
                                                <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65+oIdx)}.</span>
                                                <input className="flex-1 outline-none bg-transparent text-gray-900" value={opt} onChange={e => { const updated = [...newQuestions]; updated[idx].options[oIdx] = e.target.value; setNewQuestions(updated); }}/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setNewQuestions([...newQuestions, {id: Date.now().toString(), text:'', options:['','','',''], correctIndex:0}])} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl font-bold text-gray-500 hover:border-brand-500 hover:text-brand-600">+ Thêm câu hỏi</button>
                        </div>
                    )}
                    
                    <div className="sticky bottom-0 bg-white p-4 border-t mt-8 shadow-lg z-10 flex justify-end">
                        <button onClick={saveQuiz} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg flex items-center"><Save className="w-5 h-5 mr-2"/> Lưu Đề Thi</button>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL RESET CLASS RESULTS --- */}
      {showResetClassModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <RotateCcw className="w-12 h-12 text-orange-500 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-gray-800">Reset bài làm của cả lớp?</h3>
                 <p className="text-gray-600 mb-6 text-sm">
                    Thao tác này sẽ xóa vĩnh viễn kết quả bài thi này của tất cả học sinh đang hiển thị trong danh sách. Học sinh sẽ phải làm lại từ đầu.
                 </p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowResetClassModal(false)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy</button>
                     <button onClick={handleResetClass} disabled={isProcessing} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700">
                        {isProcessing ? "Đang xử lý..." : "Reset Ngay"}
                     </button>
                 </div>
             </div>
          </div>
      )}

       {/* --- MODAL RESET 1 RESULT --- */}
      {resultToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <RotateCcw className="w-12 h-12 text-orange-500 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-gray-800">Cho HS này làm lại?</h3>
                 <p className="text-gray-800 font-bold text-lg mb-1">{resultToDelete.studentName}</p>
                 <p className="text-gray-600 mb-6 text-xs">
                    Xóa kết quả hiện tại ({resultToDelete.score} điểm) để học sinh có thể làm lại bài.
                 </p>
                 <div className="flex gap-3">
                     <button onClick={() => setResultToDelete(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy</button>
                     <button onClick={handleDeleteResult} disabled={isProcessing} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700">
                        {isProcessing ? "Đang xử lý..." : "Đồng ý Reset"}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Sửa thông tin Học sinh</h3>
                  <div className="mb-4 text-sm text-gray-500 bg-gray-50 p-2 rounded">User: <b>{editingStudent.username}</b></div>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label><input className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900" value={editingStudent.fullName} onChange={e => setEditingStudent({...editingStudent, fullName: e.target.value})}/></div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu mới</label>
                          <input 
                            className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900" 
                            value={editingStudent.password} 
                            onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
                            placeholder="Nhập mật khẩu mới (Bỏ trống nếu giữ nguyên)"
                          />
                      </div>
                      <div className="flex gap-3 justify-end mt-4"><button onClick={() => setEditingStudent(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded">Hủy</button><button onClick={handleUpdateStudent} className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Lưu</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT CLASS NAME MODAL */}
      {isEditingClassId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
                  <h3 className="text-xl font-bold mb-4">Đổi Tên Lớp</h3>
                  <input className="w-full border border-gray-300 rounded p-3 bg-white text-gray-900 mb-4" value={editClassNameVal} onChange={e => setEditClassNameVal(e.target.value)}/>
                  <div className="flex gap-3 justify-end"><button onClick={() => { setIsEditingClassId(null); setEditClassNameVal(''); }} className="px-4 py-2 text-gray-600 bg-gray-100 rounded">Hủy</button><button onClick={updateClass} className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Lưu</button></div>
              </div>
          </div>
      )}

      {/* PASTE MODAL */}
      {pastingForIndex !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-xl max-w-lg w-full text-center">
                  <h3 className="text-xl font-bold mb-4">Dán ảnh (Ctrl+V)</h3>
                  <div ref={pasteInputRef} onPaste={handlePasteEvent} tabIndex={0} className="h-32 border-2 border-dashed border-purple-300 bg-purple-50 rounded flex items-center justify-center mb-4 focus:bg-purple-100 outline-none">Click vào đây rồi nhấn Ctrl+V</div>
                  <button onClick={() => setPastingForIndex(null)} className="text-gray-500">Hủy</button>
              </div>
          </div>
      )}

      {/* --- MODAL XÓA ĐỀ THI --- */}
      {quizToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-red-600">Xóa đề thi?</h3>
                 <p className="text-gray-500 mb-6 text-sm">Hành động này không thể hoàn tác.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setQuizToDelete(null)} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy</button>
                     <button onClick={async () => { 
                         await deleteDoc(doc(db, "quizzes", quizToDelete)); 
                         setQuizzes(quizzes.filter(q => q.id !== quizToDelete)); 
                         setQuizToDelete(null); 
                     }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Xóa Ngay</button>
                 </div>
             </div>
          </div>
      )}

      {/* --- MODAL XÓA LỚP --- */}
      {classToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-red-600">Xóa lớp {classToDelete.name}?</h3>
                 <p className="text-gray-600 mb-6 text-sm font-medium">CẢNH BÁO: Toàn bộ học sinh trong lớp cũng sẽ bị xóa vĩnh viễn.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setClassToDelete(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy</button>
                     <button onClick={executeDeleteClass} disabled={isProcessing} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">
                        {isProcessing ? "Đang xóa..." : "Xóa Lớp"}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* --- MODAL XÓA 1 HỌC SINH --- */}
      {studentToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <UserX className="w-12 h-12 text-orange-500 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-gray-800">Xóa học sinh này?</h3>
                 <p className="text-gray-500 mb-2 font-bold text-lg">{studentToDelete.name}</p>
                 <p className="text-gray-400 mb-6 text-xs">Dữ liệu kết quả thi của HS này vẫn được giữ lại (nếu có).</p>
                 <div className="flex gap-3">
                     <button onClick={() => setStudentToDelete(null)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy</button>
                     <button onClick={executeDeleteStudent} disabled={isProcessing} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700">
                        {isProcessing ? "..." : "Xóa HS"}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* --- MODAL XÓA TẤT CẢ HỌC SINH --- */}
      {showDeleteAllStudentsModal && selectedClass && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out] border-2 border-red-100">
                 <AlertTriangle className="w-14 h-14 text-red-600 mx-auto mb-4"/>
                 <h3 className="font-bold text-xl mb-2 text-red-700 uppercase">Báo động đỏ!</h3>
                 <p className="text-gray-700 mb-6 font-medium">
                    Bạn sắp xóa sạch <b>{students.length}</b> học sinh của lớp <b>{selectedClass.name}</b>.
                    <br/><br/>
                    <span className="text-red-500 text-sm">Hành động này KHÔNG THỂ hoàn tác!</span>
                 </p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowDeleteAllStudentsModal(false)} disabled={isProcessing} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-700">Hủy bỏ</button>
                     <button onClick={executeDeleteAllStudents} disabled={isProcessing} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg">
                        {isProcessing ? "Đang xóa..." : "XÓA SẠCH"}
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* --- NEW MODAL: PERSONAL INFO (Cấu hình) --- */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-brand-600"/> Thông tin cá nhân
                    </h3>
                    <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-5">
                    <div>
                        <label className="font-bold block mb-1 text-sm text-gray-700">Tên hiển thị</label>
                        <input className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)}/>
                    </div>
                    <div>
                        <label className="font-bold block mb-1 text-sm text-gray-700">Mã Giáo Viên <span className="text-gray-400 font-normal">(Cố định)</span></label>
                        <input className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed font-mono" value={newCode} readOnly/>
                    </div>
                    <div>
                        <label className="font-bold block mb-1 text-sm text-gray-700">Trường học</label>
                        <input className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none" value={newSchool} onChange={e => setNewSchool(e.target.value)}/>
                    </div>
                    
                    <button onClick={saveConfig} className="w-full bg-brand-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center shadow-sm">
                        <Save className="w-4 h-4 mr-2"/> Lưu Thông Tin
                    </button>
                    {msg && <p className="text-green-600 font-bold text-center text-sm animate-pulse">{msg}</p>}

                    {/* CHANGE PASSWORD SECTION */}
                    {profile.accountType === 'simple' && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center"><KeyRound className="w-4 h-4 mr-2 text-yellow-600"/> Đổi Mật Khẩu Đăng Nhập</h4>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu mới</label>
                                <input 
                                    type="password"
                                    className="w-full border border-yellow-300 p-2 rounded bg-white text-gray-900 mb-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none" 
                                    value={changePassVal} 
                                    onChange={e => { setChangePassVal(e.target.value); setPassFeedback(null); }}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                />
                                <button 
                                    onClick={handleChangePassword} 
                                    disabled={isProcessing}
                                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded font-bold hover:bg-yellow-700 disabled:opacity-50 text-sm shadow-sm"
                                >
                                    {isProcessing ? "Đang xử lý..." : "Cập nhật Mật khẩu"}
                                </button>
                                
                                {/* ALERT MESSAGE UI */}
                                {passFeedback && (
                                    <div className={`mt-3 p-2.5 rounded text-xs font-bold flex items-center animate-[fadeIn_0.3s_ease-out] ${passFeedback.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                        {passFeedback.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 mr-2 flex-shrink-0"/> : <CheckSquare className="w-3.5 h-3.5 mr-2 flex-shrink-0"/>}
                                        {passFeedback.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
