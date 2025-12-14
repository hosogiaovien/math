
import React, { useState, useEffect } from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppView, UserRole, TeacherProfile, Quiz, StudentAccount, QuizResult } from './types';
import { BookOpen, User as UserIcon, LogOut, AlertTriangle, Phone } from 'lucide-react';

// View Components
import { LandingView } from './views/LandingView';
import { AdminLogin } from './views/auth/AdminLogin';
import { TeacherLogin } from './views/auth/TeacherLogin';
import { StudentLogin } from './views/auth/StudentLogin'; // New
import { AdminDashboard } from './views/admin/AdminDashboard';
import { TeacherDashboard } from './views/teacher/TeacherDashboard';
import { StudentQuizList } from './views/student/StudentQuizList';
import { StudentDashboard } from './views/student/StudentDashboard'; // New
import { StudentTakeQuiz } from './views/student/StudentTakeQuiz';

const App: React.FC = () => {
  // Global State
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Firebase Auth User (Teacher/Admin)
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);
  
  // Specific Data State
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentAccount | null>(null); // Custom Auth Student
  
  // Guest Mode Data
  const [studentTargetTeacher, setStudentTargetTeacher] = useState<TeacherProfile | null>(null);
  const [studentQuizzes, setStudentQuizzes] = useState<Quiz[]>([]);
  const [guestLoginError, setGuestLoginError] = useState<string>(''); // Error message for guest login
  
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  // NEW: State to hold review data
  const [selectedReviewResult, setSelectedReviewResult] = useState<QuizResult | undefined>(undefined);

  useEffect(() => {
    // FIREBASE AUTH LISTENER (For Type A Teachers)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // If Firebase Auth is active, try to fetch Teacher Profile
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profile = docSnap.data() as TeacherProfile;
          setTeacherProfile(profile);
          setUserRole(UserRole.TEACHER);
          
          if (
            currentView !== AppView.TEACHER_DASHBOARD && 
            currentView !== AppView.TEACHER_PREVIEW && 
            currentView !== AppView.ADMIN_DASHBOARD
          ) {
            setCurrentView(AppView.TEACHER_DASHBOARD);
          }
        } else {
            // Not a teacher document?
            setTeacherProfile(null);
            setUserRole(UserRole.GUEST); 
        }
      } else {
        // Logged out from Firebase
        // IMPORTANT: Only reset if we are NOT in a custom session (Simple Teacher or Student)
        if (userRole !== UserRole.STUDENT && userRole !== UserRole.TEACHER) {
          setTeacherProfile(null);
          setUserRole(UserRole.GUEST);
        }
      }
    });
    return () => unsubscribe();
  }, [currentView, userRole]); 

  const handleLogout = async () => {
    if (userRole === UserRole.STUDENT) {
      // Logout Student (Custom)
      setStudentProfile(null);
      setUserRole(UserRole.GUEST);
      setCurrentView(AppView.LANDING);
    } 
    else if (userRole === UserRole.TEACHER && teacherProfile?.accountType === 'simple') {
      // Logout Simple Teacher (Custom)
      setTeacherProfile(null);
      setUserRole(UserRole.GUEST);
      setCurrentView(AppView.LANDING);
    }
    else {
      // Logout Teacher/Admin (Firebase)
      await signOut(auth);
      setTeacherProfile(null); // Clear profile
      setCurrentView(AppView.LANDING);
    }
  };

  const handleStudentLoginSuccess = (student: StudentAccount) => {
    setStudentProfile(student);
    setUserRole(UserRole.STUDENT);
    setCurrentView(AppView.STUDENT_DASHBOARD);
  };

  const handleSimpleTeacherLoginSuccess = (profile: TeacherProfile) => {
    setTeacherProfile(profile);
    setUserRole(UserRole.TEACHER);
    setCurrentView(AppView.TEACHER_DASHBOARD);
  }

  // --- GUEST MODE LOGIC (Updated for Access Codes) ---
  const navigateToStudentGuest = async (inputCode: string) => {
    setGuestLoginError(''); // Reset error
    const normalizedInput = inputCode.trim().toUpperCase();
    
    try {
      const usersRef = collection(db, "users");
      let teacherData: TeacherProfile | null = null;
      let accessSuffix = '';

      // Strategy 1: Exact Match (Standard Mode)
      // Check if input matches a teacher code exactly
      const qExact = query(usersRef, where("teacherCode", "==", normalizedInput));
      const exactSnap = await getDocs(qExact);

      if (!exactSnap.empty) {
          teacherData = exactSnap.docs[0].data() as TeacherProfile;
          accessSuffix = ''; // No suffix, load public quizzes without access code
      } else {
          // Strategy 2: Prefix Match (Access Code Mode)
          // Since Firestore doesn't support "startsWith" easily, and assuming teacher list is manageable,
          // we fetch teachers and check prefixes. 
          // Optimization: Only fetch teachers, filter in memory.
          const qAllTeachers = query(usersRef, where("role", "==", "teacher"));
          const allSnap = await getDocs(qAllTeachers);
          
          // Find a teacher whose code is a prefix of the input
          const match = allSnap.docs
              .map(d => d.data() as TeacherProfile)
              .find(t => normalizedInput.startsWith(t.teacherCode));

          if (match) {
              teacherData = match;
              accessSuffix = normalizedInput.substring(match.teacherCode.length);
          }
      }

      if (!teacherData) {
        setGuestLoginError("Không tìm thấy Mã Giáo Viên này. Vui lòng kiểm tra lại!");
        return;
      }

      setStudentTargetTeacher(teacherData);

      // Fetch public quizzes for this teacher
      const quizzesRef = collection(db, "quizzes");
      const qQuiz = query(
        quizzesRef, 
        where("teacherId", "==", teacherData.uid),
        where("isPublic", "==", true)
      );
      const quizSnap = await getDocs(qQuiz);
      
      const loadedQuizzes: Quiz[] = [];
      quizSnap.forEach((doc) => {
        const q = { id: doc.id, ...doc.data() } as Quiz;
        // Filter Logic:
        // 1. If accessSuffix is empty -> Show quizzes where accessCode is empty/null/undefined
        // 2. If accessSuffix exists -> Show quizzes where accessCode matches exactly
        
        const qAccessCode = q.accessCode ? q.accessCode.toUpperCase() : '';
        
        if (accessSuffix === '') {
            if (!qAccessCode) loadedQuizzes.push(q);
        } else {
            if (qAccessCode === accessSuffix) loadedQuizzes.push(q);
        }
      });

      setStudentQuizzes(loadedQuizzes);
      setCurrentView(AppView.STUDENT_QUIZ_LIST);
    } catch (err) {
      console.error(err);
      setGuestLoginError("Đã có lỗi kết nối xảy ra. Vui lòng thử lại.");
    }
  };

  // --- RENDER SWITCHER ---

  const renderContent = () => {
    switch (currentView) {
      case AppView.LANDING:
        return <LandingView 
          onAdminLogin={() => setCurrentView(AppView.ADMIN_LOGIN)} 
          onTeacherLogin={() => setCurrentView(AppView.TEACHER_LOGIN)}
          onStudentGuestEnter={navigateToStudentGuest}
          onStudentLoginClick={() => setCurrentView(AppView.STUDENT_LOGIN)}
          guestError={guestLoginError}
          onClearGuestError={() => setGuestLoginError('')}
        />;
      
      // Auth Views
      case AppView.ADMIN_LOGIN:
        return <AdminLogin onSuccess={() => setCurrentView(AppView.ADMIN_DASHBOARD)} onBack={() => setCurrentView(AppView.LANDING)} />;
      case AppView.TEACHER_LOGIN:
        return <TeacherLogin 
          onBack={() => setCurrentView(AppView.LANDING)} 
          onLoginSuccess={handleSimpleTeacherLoginSuccess} 
        />;
      case AppView.STUDENT_LOGIN:
        return <StudentLogin onSuccess={handleStudentLoginSuccess} onBack={() => setCurrentView(AppView.LANDING)} />;

      // Dashboards
      case AppView.ADMIN_DASHBOARD:
        return <AdminDashboard onLogout={() => { signOut(auth); setCurrentView(AppView.LANDING); }} />;
      
      case AppView.TEACHER_DASHBOARD:
        // --- CHECK EXPIRATION LOGIC ---
        if (teacherProfile && teacherProfile.expirationDate && Date.now() > teacherProfile.expirationDate) {
             return (
                 <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-[fadeIn_0.5s_ease-out]">
                     <div className="bg-white p-8 rounded-2xl shadow-xl border-t-8 border-red-500 max-w-lg w-full text-center">
                         <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-600"/>
                         </div>
                         <h2 className="text-2xl font-bold text-gray-800 mb-4">Tài khoản hết hạn</h2>
                         <p className="text-lg text-gray-600 font-medium leading-relaxed mb-8">
                             Tài khoản của bạn hết hạn hãy liên hệ thầy Quốc Hưng qua zalo: <br/>
                             <span className="text-2xl font-bold text-blue-600 mt-2 block">0985.580.587</span>
                         </p>
                         <a href="https://zalo.me/0985580587" target="_blank" rel="noreferrer" className="block w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition mb-4 shadow-lg">
                             Chat Zalo Ngay
                         </a>
                         <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800 font-bold underline">
                             Đăng xuất
                         </button>
                     </div>
                 </div>
             )
        }
        
        return teacherProfile ? <TeacherDashboard 
          profile={teacherProfile} 
          onLogout={handleLogout} 
          onPreviewQuiz={(q) => {
            setSelectedQuiz(q);
            setSelectedReviewResult(undefined);
            setCurrentView(AppView.TEACHER_PREVIEW);
          }}
          onProfileUpdate={(updated) => setTeacherProfile(updated)}
        /> : <div>Loading...</div>;
      
      case AppView.STUDENT_DASHBOARD:
        return studentProfile ? <StudentDashboard 
          student={studentProfile}
          onLogout={handleLogout}
          onTakeQuiz={(q, reviewResult) => {
            setSelectedQuiz(q);
            setSelectedReviewResult(reviewResult); // Pass result if reviewing
            setCurrentView(AppView.STUDENT_TAKE_QUIZ);
          }}
        /> : <div>Loading Student Data...</div>;

      // Quiz Views
      case AppView.TEACHER_PREVIEW:
        return selectedQuiz ? (
          <div className="bg-orange-50 min-h-screen">
            <div className="bg-orange-600 text-white p-2 text-center text-sm font-bold sticky top-0 z-50 shadow-md">
              CHẾ ĐỘ XEM THỬ (PREVIEW MODE) - Kết quả sẽ không được lưu.
            </div>
            <div className="pt-4">
               <StudentTakeQuiz 
                  // KEY IS CRITICAL: Force remount if quiz ID or Shuffle setting changes.
                  key={`${selectedQuiz.id}-${selectedQuiz.shuffleQuestions}`} 
                  quiz={selectedQuiz} 
                  student={null} // Preview mode has no student
                  onBack={() => setCurrentView(AppView.TEACHER_DASHBOARD)} 
               />
            </div>
          </div>
        ) : <div>Error</div>;
      
      case AppView.STUDENT_QUIZ_LIST: // Guest List
        return <StudentQuizList 
          teacher={studentTargetTeacher} 
          quizzes={studentQuizzes} 
          onSelectQuiz={(q) => {
            setSelectedQuiz(q);
            setSelectedReviewResult(undefined);
            setCurrentView(AppView.STUDENT_TAKE_QUIZ);
          }}
          onBack={() => {
            setCurrentView(AppView.LANDING);
            setGuestLoginError('');
          }}
        />;
      
      case AppView.STUDENT_TAKE_QUIZ:
        return selectedQuiz ? (
          <StudentTakeQuiz 
            // KEY IS CRITICAL: Force remount if quiz ID changes, or if we toggle between Review/Take mode
            key={`${selectedQuiz.id}-${selectedQuiz.shuffleQuestions}-${selectedReviewResult?.id || 'take'}`}
            quiz={selectedQuiz} 
            student={studentProfile}
            reviewResult={selectedReviewResult} // Pass Review Data
            onBack={() => {
              if (userRole === UserRole.STUDENT) {
                setCurrentView(AppView.STUDENT_DASHBOARD);
              } else {
                setCurrentView(AppView.STUDENT_QUIZ_LIST);
              }
            }} 
          />
        ) : <div>Error loading quiz</div>;
        
      default:
        return <div className="p-10 text-center">Page Not Found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer overflow-hidden" onClick={() => {
              if(userRole === UserRole.GUEST) setCurrentView(AppView.LANDING);
            }}>
            <BookOpen className="h-8 w-8 text-brand-600 mr-2 shrink-0" />
            <span className="font-bold text-lg md:text-xl text-brand-700 leading-tight truncate">Hệ thống biên soạn và kiểm tra trắc nghiệm trực tuyến môn Toán</span>
          </div>
          <div className="text-sm text-gray-500 shrink-0 ml-4 flex items-center gap-4">
            {userRole === UserRole.TEACHER && teacherProfile && (
              <span className="flex items-center text-brand-700 font-medium">
                <UserIcon className="w-4 h-4 mr-1"/> {teacherProfile.name || teacherProfile.teacherCode}
              </span>
            )}
            {userRole === UserRole.STUDENT && studentProfile && (
              <div className="flex items-center gap-3">
                 <span className="flex items-center font-bold text-brand-700">
                    <UserIcon className="w-4 h-4 mr-1"/> {studentProfile.fullName}
                 </span>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Đăng xuất">
                    <LogOut className="w-5 h-5"/>
                 </button>
              </div>
            )}
            {currentView === AppView.ADMIN_DASHBOARD && (
              <span className="flex items-center text-red-600 font-bold">
                <UserIcon className="w-4 h-4 mr-1"/> Administrator
              </span>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
