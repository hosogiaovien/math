
export interface Question {
  id: string;
  text: string; // Supports LaTeX wrapped in $...$
  image?: string; // Base64 string of the image (optional)
  options: string[]; // Array of 4 strings, supports LaTeX
  correctIndex: number; // 0-3
}

export interface Quiz {
  id: string;
  teacherId: string;
  title: string;
  createdAt: number;
  questions: Question[];
  
  // New Configs
  timeLimit?: number; // Minutes. 0 or undefined = no limit
  maxScore?: number; // Default 10
  isPublic?: boolean; // True: Allow access via Teacher Code (Free mode)
  accessCode?: string; // NEW: Optional suffix code for specific access (e.g., GVCODE + ACCESSCODE)
  assignedClassIds?: string[]; // List of Class IDs allowed to take this quiz
  allowRetake?: boolean; // True = Unlimited attempts, False = 1 attempt only
  shuffleQuestions?: boolean; // NEW: Shuffle questions and options order for each student
  
  // Mapping: classId -> startTimestamp (mở đề lúc mấy giờ)
  classSchedules?: Record<string, number>; 
}

export interface TeacherProfile {
  uid: string;
  email?: string; // Optional for simple accounts
  username?: string; // Required for simple accounts
  password?: string; // Stored only for simple accounts (plain text as requested)
  name?: string; 
  teacherCode: string;
  school?: string;
  role: 'teacher';
  accountType?: 'firebase' | 'simple'; // New field to distinguish account types
  expirationDate?: number; // Timestamp (milliseconds). If undefined/null => Lifetime access
}

// New Types for Class Management
export interface ClassRoom {
  id: string;
  teacherId: string;
  name: string;
  schoolYear?: string; // e.g., 2023-2024
  createdAt: number;
}

export interface StudentAccount {
  id: string; // Firestore ID
  teacherId: string; // Belongs to which teacher (owner)
  classId: string; // Belongs to which class
  username: string; // Unique login ID (not email)
  password: string; // Simple text password
  fullName: string;
  order?: number; // NEW: Sequence Number (STT) within the class
}

export interface QuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  classId: string;
  score: number; // Final scaled score
  maxScore: number; // The scale used (e.g. 10)
  correctCount: number;
  totalQuestions: number;
  timestamp: number;
  answerHistory?: string; // NEW: Stores "1.A, 2.B, 3._"
  quizVariant?: string; // NEW: Store the randomized code (e.g. "Mã 102") if shuffled
  
  // FOR REVIEW MODE
  // Store the list of Question IDs in the order the student saw them
  questionOrder?: string[]; 
  // Store the specific option index selected for each question ID
  userAnswers?: Record<string, number>; 
}

export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT', // Logged in student
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum AppView {
  LANDING = 'LANDING',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  
  TEACHER_LOGIN = 'TEACHER_LOGIN',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  TEACHER_PREVIEW = 'TEACHER_PREVIEW',
  
  // Student Flows
  STUDENT_LOGIN = 'STUDENT_LOGIN', // New
  STUDENT_DASHBOARD = 'STUDENT_DASHBOARD', // New (Class mode)
  
  STUDENT_QUIZ_LIST = 'STUDENT_QUIZ_LIST', // (Guest/Free mode list)
  STUDENT_TAKE_QUIZ = 'STUDENT_TAKE_QUIZ'
}
