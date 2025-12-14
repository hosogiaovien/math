
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { TeacherProfile, Quiz } from '../../types';
import { LogOut, Plus, List, Edit, KeyRound, Trash2, X, ShieldCheck, AlertTriangle, LayoutDashboard, Database, CloudLightning, Upload, Eye, Calendar, Clock, UserPlus, FileSpreadsheet, Info, Save, School, User, Infinity as InfinityIcon } from 'lucide-react';

// Import sub-views for impersonation
import { TeacherDashboard } from '../teacher/TeacherDashboard';
import { StudentTakeQuiz } from '../student/StudentTakeQuiz';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  
  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTab, setModalTab] = useState<'single' | 'import'>('single'); 

  // Create Form State
  const [createType, setCreateType] = useState<'firebase' | 'simple'>('firebase'); 
  const [createEmail, setCreateEmail] = useState('');
  const [createUsername, setCreateUsername] = useState(''); 
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createSchool, setCreateSchool] = useState(''); 
  const [createCode, setCreateCode] = useState(''); 
  // Update: DateTime string format
  const [createExpiration, setCreateExpiration] = useState(''); 
  const [createLifetime, setCreateLifetime] = useState(false); // NEW: Checkbox state
  const [createStatus, setCreateStatus] = useState('');

  // Bulk Import State
  const [importType, setImportType] = useState<'firebase' | 'simple'>('simple'); 
  const [teacherImportText, setTeacherImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  // Edit State
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editExpiration, setEditExpiration] = useState(''); 
  const [editLifetime, setEditLifetime] = useState(false); // NEW: Checkbox state
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- IMPERSONATION STATE ---
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [adminPreviewQuiz, setAdminPreviewQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "teacher"));
      const querySnapshot = await getDocs(q);
      const list: TeacherProfile[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as TeacherProfile);
      });
      // Sort by Name
      list.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
      setTeachers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const createTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = createCode.trim().toUpperCase();

    if (!normalizedCode) {
        setCreateStatus('Lỗi: Vui lòng nhập Mã Giáo Viên');
        return;
    }

    // CHECK DUPLICATE CODE
    if (teachers.some(t => t.teacherCode === normalizedCode)) {
        setCreateStatus(`Lỗi: Mã "${normalizedCode}" đã tồn tại.`);
        return;
    }
    
    setCreateStatus('Đang tạo...');
    try {
      const checkCodeQ = query(collection(db, "users"), where("teacherCode", "==", normalizedCode));
      const checkCodeSnap = await getDocs(checkCodeQ);
      if (!checkCodeSnap.empty) {
          throw new Error(`Mã giáo viên "${normalizedCode}" đã tồn tại trên hệ thống.`);
      }

      let uid = '';
      let expirationTimestamp: number | undefined = undefined;
      
      // LOGIC: If Lifetime is unchecked AND date is provided, convert to timestamp
      if (!createLifetime && createExpiration) {
          expirationTimestamp = new Date(createExpiration).getTime();
      }
      // If createLifetime is true, expirationTimestamp remains undefined (Infinite)

      const commonData = {
        name: createName,
        school: createSchool, 
        teacherCode: normalizedCode,
        role: "teacher" as const,
        expirationDate: expirationTimestamp
      };

      if (createType === 'firebase') {
          // TYPE A: FIREBASE
          const userCredential = await createUserWithEmailAndPassword(auth, createEmail, createPassword);
          uid = userCredential.user.uid;
          
          const newTeacher: TeacherProfile = {
            uid: uid,
            email: createEmail,
            accountType: 'firebase',
            ...commonData
          };
          await setDoc(doc(db, "users", uid), newTeacher);
          
          await signOut(auth);
          alert(`Tạo thành công GV Firebase: ${createName}.\nHệ thống sẽ đăng xuất.`);
      } else {
          // TYPE B: SIMPLE
          if(teachers.some(t => t.username === createUsername)) {
             throw new Error(`Tên đăng nhập "${createUsername}" đã tồn tại.`);
          }
          const checkUserQ = query(collection(db, "users"), where("username", "==", createUsername));
          const checkUserSnap = await getDocs(checkUserQ);
          if (!checkUserSnap.empty) throw new Error(`Tên đăng nhập "${createUsername}" đã tồn tại.`);

          const newDocRef = doc(collection(db, "users"));
          uid = newDocRef.id;

          const newTeacher: TeacherProfile = {
            uid: uid,
            username: createUsername,
            password: createPassword, 
            accountType: 'simple',
            ...commonData
          };
          await setDoc(newDocRef, newTeacher);
          
          alert(`Tạo thành công GV Thường: ${createName}.`);
          fetchTeachers(); 
          setShowCreateModal(false); 
      }

      // Reset Form
      setCreateEmail(''); setCreateUsername(''); setCreatePassword('');
      setCreateName(''); setCreateSchool(''); setCreateCode('');
      setCreateExpiration(''); setCreateLifetime(false); setCreateStatus('');
      
    } catch (error: any) {
      setCreateStatus('Lỗi: ' + error.message);
    }
  };

  const handleBulkImportTeachers = async () => {
     if(!teacherImportText.trim()) return;
     setImportStatus('Đang xử lý...');
     
     const lines = teacherImportText.split('\n');
     const batch = writeBatch(db);
     let successCount = 0;
     const skipped: string[] = [];
     
     const existingCodes = new Set(teachers.map(t => t.teacherCode));
     const existingUsers = new Set(teachers.map(t => t.username)); // For Simple
     const existingEmails = new Set(teachers.map(t => t.email).filter(Boolean)); // For Firebase
     
     try {
         for (const line of lines) {
             if(!line.trim()) continue;
             
             // Check import type
             if (importType === 'simple') {
                 // Format: Name | Code | School | Username | Password
                 const parts = line.split(/[\t,;|]/).map(s => s.trim());
                 if (parts.length >= 5) {
                     const [name, code, school, username, password] = parts;
                     const normalizedCode = code.toUpperCase();

                     if (existingCodes.has(normalizedCode)) { skipped.push(`${name} (Trùng mã GV)`); continue; }
                     if (existingUsers.has(username)) { skipped.push(`${name} (Trùng Username)`); continue; }

                     const newDocRef = doc(collection(db, "users"));
                     const newTeacher: TeacherProfile = {
                        uid: newDocRef.id,
                        name, teacherCode: normalizedCode, school, username, password,
                        role: "teacher", accountType: 'simple'
                     };
                     batch.set(newDocRef, newTeacher);
                     existingCodes.add(normalizedCode); existingUsers.add(username); successCount++;
                 }
             } else {
                 // Format: Name | Code | School | Email
                 const parts = line.split(/[\t,;|]/).map(s => s.trim());
                 if (parts.length >= 4) {
                     const [name, code, school, email] = parts;
                     const normalizedCode = code.toUpperCase();
                     
                     if (existingCodes.has(normalizedCode)) { skipped.push(`${name} (Trùng mã GV)`); continue; }
                     if (existingEmails.has(email)) { skipped.push(`${name} (Trùng Email)`); continue; }

                     // Generate ID for Firestore Profile (Note: This is NOT the Auth UID yet)
                     const newDocRef = doc(collection(db, "users"));
                     
                     const newTeacher: TeacherProfile = {
                        uid: newDocRef.id, // Temporary ID. If they register via Firebase later, this might need reconciliation, but for now this creates the profile data.
                        name, teacherCode: normalizedCode, school, email,
                        role: "teacher", accountType: 'firebase'
                     };
                     
                     batch.set(newDocRef, newTeacher);
                     existingCodes.add(normalizedCode); existingEmails.add(email); successCount++;
                 }
             }
         }

         if (successCount > 0) {
             await batch.commit();
             fetchTeachers();
             setTeacherImportText('');
             setShowCreateModal(false);
             alert(`Đã thêm thành công hồ sơ cho ${successCount} giáo viên!\n\nBỏ qua: ${skipped.length}\n${skipped.join('\n')}`);
             setImportStatus('');
         } else {
             setImportStatus(`Không thêm được ai. Lỗi hoặc sai định dạng: \n${skipped.join('\n')}`);
         }

     } catch (e: any) {
         setImportStatus('Lỗi hệ thống: ' + e.message);
     }
  }

  const confirmDelete = (e: React.MouseEvent, t: TeacherProfile) => {
    e.stopPropagation(); e.preventDefault();
    setTeacherToDelete(t);
  };

  const handleReallyDelete = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    const uid = teacherToDelete.uid;
    setTeachers(prev => prev.filter(t => t.uid !== uid));
    setTeacherToDelete(null);

    try {
      const quizzesRef = collection(db, "quizzes");
      const q = query(quizzesRef, where("teacherId", "==", uid));
      const quizSnapshot = await getDocs(q);
      const deletePromises = quizSnapshot.docs.map(document => deleteDoc(document.ref));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, "users", uid));
    } catch (err: any) {
      alert("Lỗi khi xóa trên Server: " + err.message);
      fetchTeachers();
    } finally {
      setIsDeleting(false);
    }
  };

  const resetPassword = async (teacher: TeacherProfile) => {
    if (teacher.accountType === 'simple') {
        alert(`Tài khoản Thường:\nUsername: ${teacher.username}\nMật khẩu hiện tại: ${teacher.password}`);
    } else {
        if (teacher.email && window.confirm(`Gửi email đặt lại mật khẩu cho ${teacher.email}?`)) {
            try {
                await sendPasswordResetEmail(auth, teacher.email);
                alert(`Đã gửi email đến: ${teacher.email}.`);
            } catch (e: any) {
                alert("Lỗi gửi mail: " + e.message);
            }
        }
    }
  }

  const startEditing = (t: TeacherProfile) => {
      setEditingTeacher({ ...t }); // Clone object to avoid direct mutation
      
      if (t.expirationDate) {
          // Has expiration date -> Not lifetime
          setEditLifetime(false);
          // Convert Timestamp to Local ISO String (YYYY-MM-DDTHH:mm) for input
          const d = new Date(t.expirationDate);
          const offset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
          setEditExpiration(localISOTime);
      } else {
          // No expiration date -> Lifetime
          setEditLifetime(true);
          setEditExpiration('');
      }
  }

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    setIsUpdating(true);
    try {
        let expirationTimestamp: number | undefined = undefined;
        
        // Logic: Only calculate timestamp if "Lifetime" is unchecked and there is a value
        if (!editLifetime && editExpiration) {
            expirationTimestamp = new Date(editExpiration).getTime();
        }
        
        const updatedTeacher = { ...editingTeacher, expirationDate: expirationTimestamp };
        
        // Optimistic UI Update
        setTeachers(prev => prev.map(t => t.uid === editingTeacher.uid ? updatedTeacher : t));
        
        const updateData: any = {
            teacherCode: editingTeacher.teacherCode.toUpperCase(),
            school: editingTeacher.school || "",
            name: editingTeacher.name || "",
            expirationDate: expirationTimestamp || null // Store as null in Firestore if undefined
        };
        
        if (editingTeacher.accountType === 'simple' && editingTeacher.password) {
            updateData.password = editingTeacher.password;
        }

        await updateDoc(doc(db, "users", editingTeacher.uid), updateData);
        alert("Cập nhật thành công!");
        setEditingTeacher(null); // Close modal
    } catch(e: any) {
        alert("Lỗi cập nhật: " + e.message);
        fetchTeachers(); // Revert on error
    } finally {
        setIsUpdating(false);
    }
  }

  const isExpired = (timestamp?: number) => {
      if (!timestamp) return false;
      return Date.now() > timestamp;
  }

  const formatDate = (timestamp?: number) => {
      if (!timestamp) return 'Vĩnh viễn';
      return new Date(timestamp).toLocaleString('vi-VN', { 
        hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'
      });
  }

  // --- RENDER LOGIC START ---

  if (adminPreviewQuiz) {
      return (
          <div className="min-h-screen bg-gray-100">
              <div className="bg-orange-600 text-white p-3 text-center font-bold sticky top-0 z-50 shadow-md flex justify-between items-center px-4">
                  <span>CHẾ ĐỘ ADMIN: XEM TRƯỚC ĐỀ THI</span>
                  <button onClick={() => setAdminPreviewQuiz(null)} className="bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-bold hover:bg-gray-100">Thoát Preview</button>
              </div>
              <div className="p-6">
                  <StudentTakeQuiz 
                      quiz={adminPreviewQuiz}
                      student={null}
                      onBack={() => setAdminPreviewQuiz(null)}
                  />
              </div>
          </div>
      )
  }

  if (selectedTeacher) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col">
              <div className="bg-red-600 text-white p-3 px-6 text-sm font-bold shadow-md flex justify-between items-center sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5"/>
                      <span>ADMIN MODE: Đang truy cập quyền của GV <u>{selectedTeacher.name}</u> ({selectedTeacher.teacherCode})</span>
                  </div>
                  <button onClick={() => setSelectedTeacher(null)} className="bg-white text-red-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition shadow">
                      Thoát chế độ này
                  </button>
              </div>
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  <TeacherDashboard 
                      profile={selectedTeacher} 
                      onLogout={() => setSelectedTeacher(null)}
                      onPreviewQuiz={(q) => setAdminPreviewQuiz(q)}
                      onProfileUpdate={(updatedProfile) => {
                          setSelectedTeacher(updatedProfile);
                          setTeachers(prev => prev.map(t => t.uid === updatedProfile.uid ? updatedProfile : t));
                      }}
                  />
              </div>
          </div>
      )
  }

  // MAIN ADMIN DASHBOARD
  const inputClass = "w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8 text-brand-600"/> Quản trị hệ thống
            </h1>
            <p className="text-gray-500 mt-2">Danh sách Giáo viên & Cấu hình hạn sử dụng</p>
        </div>
        <button onClick={onLogout} className="flex items-center bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm font-medium">
          <LogOut className="w-5 h-5 mr-2" /> Đăng xuất
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
          <button onClick={() => { setShowCreateModal(true); setModalTab('single'); }} className="flex items-center px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition">
              <Plus className="w-5 h-5 mr-2"/> Thêm Giáo Viên
          </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <List className="w-6 h-6 mr-2 text-brand-600"/> Danh sách Giáo viên ({teachers.length})
                </h3>
            </div>
            
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 w-16 text-center">Type</th>
                            <th className="p-4 w-1/4">Thông tin</th>
                            <th className="p-4 w-1/4">Tài khoản</th>
                            <th className="p-4">Hạn sử dụng</th>
                            <th className="p-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {teachers.map((t) => (
                            <tr key={t.uid} className={`hover:bg-blue-50/30 transition group ${isExpired(t.expirationDate) ? 'bg-red-50' : ''}`}>
                                <td className="p-4 text-center align-top pt-5">
                                    {t.accountType === 'simple' 
                                        ? <div title="Tài khoản Thường (User/Pass)"><Database className="w-5 h-5 text-purple-400 mx-auto" /></div>
                                        : <div title="Tài khoản Firebase (Email)"><CloudLightning className="w-5 h-5 text-brand-400 mx-auto" /></div>
                                    }
                                </td>
                                <td className="p-4 align-top">
                                    <div>
                                        <div className="font-bold text-gray-800 text-base">{t.name}</div>
                                        <div className="text-gray-500 flex items-center mt-1"><List className="w-3 h-3 mr-1"/> {t.school || 'Chưa cập nhật'}</div>
                                        {isExpired(t.expirationDate) && <span className="text-red-600 text-xs font-bold uppercase mt-1 inline-block border border-red-200 px-1 rounded">Đã hết hạn</span>}
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="font-mono text-xs text-gray-600 space-y-1">
                                        <div className="bg-gray-100 px-2 py-1 rounded inline-block font-bold">CODE: {t.teacherCode}</div>
                                        <div>
                                            {t.accountType === 'simple' ? (
                                                <span className="text-purple-600">User: <b>{t.username}</b></span>
                                            ) : (
                                                <span className="text-brand-600">Email: {t.email}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <div className={`text-sm font-medium ${isExpired(t.expirationDate) ? 'text-red-600' : 'text-green-700'}`}>
                                        <div className="flex items-center">
                                            {t.expirationDate ? (
                                                <>
                                                    <Clock className="w-4 h-4 mr-1 opacity-70"/>
                                                    {formatDate(t.expirationDate)}
                                                </>
                                            ) : (
                                                <>
                                                    <InfinityIcon className="w-4 h-4 mr-1 opacity-70"/>
                                                    Vĩnh viễn
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right align-top">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setSelectedTeacher(t)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" title="Truy cập quyền GV này">
                                            <Eye className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => startEditing(t)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" title="Sửa thông tin">
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => resetPassword(t)} className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200" title="Đổi/Reset Mật khẩu">
                                            <KeyRound className="w-4 h-4"/>
                                        </button>
                                        <button onClick={(e) => confirmDelete(e, t)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Xóa">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {teachers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-400 italic">Chưa có giáo viên nào. Hãy tạo mới.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
      </div>

      {/* --- EDIT TEACHER MODAL --- */}
      {editingTeacher && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] flex flex-col border border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="text-xl font-bold text-gray-800 flex items-center">
                            <Edit className="w-6 h-6 mr-2 text-brand-600"/> Cập nhật thông tin Giáo viên
                       </h3>
                       <button onClick={() => setEditingTeacher(null)} className="text-gray-400 hover:text-gray-600"><X/></button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>
                                <User className="w-4 h-4 inline mr-1 text-gray-500"/>Tên hiển thị
                              </label>
                              <input 
                                className={inputClass} 
                                value={editingTeacher.name || ''} 
                                onChange={e => setEditingTeacher({...editingTeacher, name: e.target.value})} 
                                placeholder="Nhập tên..."
                              />
                          </div>
                          <div>
                              <label className={labelClass}>Mã Giáo Viên</label>
                              <input 
                                className={`${inputClass} font-mono`}
                                value={editingTeacher.teacherCode} 
                                onChange={e => setEditingTeacher({...editingTeacher, teacherCode: e.target.value})} 
                                placeholder="Mã GV"
                              />
                          </div>
                      </div>

                      <div>
                          <label className={labelClass}>
                             <School className="w-4 h-4 inline mr-1 text-gray-500"/>Trường học
                          </label>
                          <input 
                            className={inputClass} 
                            value={editingTeacher.school || ''} 
                            onChange={e => setEditingTeacher({...editingTeacher, school: e.target.value})} 
                            placeholder="Tên trường..."
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className={labelClass}>Loại tài khoản</label>
                              <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-700 font-bold flex items-center">
                                  {editingTeacher.accountType === 'firebase' 
                                    ? <><CloudLightning className="w-4 h-4 mr-2 text-brand-600"/> Firebase (Email)</>
                                    : <><Database className="w-4 h-4 mr-2 text-purple-600"/> Tài khoản thường</>
                                  }
                              </div>
                           </div>
                           <div>
                              <label className={labelClass}>Ngày hết hạn (Giờ:Phút)</label>
                              <div className="relative">
                                  <input 
                                      type="datetime-local" 
                                      className={`${inputClass} ${editLifetime ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} 
                                      value={editExpiration} 
                                      disabled={editLifetime}
                                      onChange={e => setEditExpiration(e.target.value)} 
                                  />
                                  <div className="mt-2 flex items-center">
                                      <input 
                                        type="checkbox" 
                                        id="editLifetime" 
                                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                        checked={editLifetime}
                                        onChange={e => {
                                            setEditLifetime(e.target.checked);
                                            if(e.target.checked) setEditExpiration(''); // Clear time if lifetime
                                        }}
                                      />
                                      <label htmlFor="editLifetime" className="ml-2 text-sm font-bold text-gray-700 flex items-center">
                                          <InfinityIcon className="w-4 h-4 mr-1"/> Vĩnh viễn (Lifetime)
                                      </label>
                                  </div>
                              </div>
                           </div>
                      </div>

                      {editingTeacher.accountType === 'simple' && (
                          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                              <label className="block text-sm font-bold text-yellow-800 mb-2 flex items-center">
                                  <KeyRound className="w-4 h-4 mr-1"/> Đổi mật khẩu (Chỉ áp dụng Acc thường)
                              </label>
                              <input 
                                type="text"
                                className="w-full p-3 border border-yellow-300 rounded-lg bg-white text-gray-900 outline-none focus:ring-2 focus:ring-yellow-500 font-mono" 
                                value={editingTeacher.password || ''} 
                                onChange={e => setEditingTeacher({...editingTeacher, password: e.target.value})} 
                                placeholder="Nhập mật khẩu mới..."
                              />
                          </div>
                      )}

                      <div className="pt-4 flex gap-3">
                          <button onClick={() => setEditingTeacher(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Hủy bỏ</button>
                          <button onClick={handleUpdateTeacher} disabled={isUpdating} className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg flex justify-center items-center">
                              {isUpdating ? 'Đang lưu...' : <><Save className="w-5 h-5 mr-2"/> Lưu thay đổi</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- UNIFIED CREATE MODAL (SINGLE + IMPORT) --- */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white p-0 rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] flex flex-col">
                  {/* HEADER */}
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="text-xl font-bold text-gray-800 flex items-center">
                            <Plus className="w-6 h-6 mr-2 text-brand-600"/> Thêm Giáo Viên
                       </h3>
                       <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
                  </div>

                  {/* TABS */}
                  <div className="flex border-b border-gray-200">
                      <button 
                        onClick={() => setModalTab('single')}
                        className={`flex-1 py-3 font-bold text-sm flex items-center justify-center ${modalTab === 'single' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                      >
                         <UserPlus className="w-4 h-4 mr-2"/> Tạo Thủ Công
                      </button>
                      <button 
                        onClick={() => setModalTab('import')}
                        className={`flex-1 py-3 font-bold text-sm flex items-center justify-center ${modalTab === 'import' ? 'text-green-600 border-b-2 border-green-600 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                      >
                         <FileSpreadsheet className="w-4 h-4 mr-2"/> Import Danh Sách
                      </button>
                  </div>
                  
                  <div className="p-6">
                    {/* --- TAB 1: SINGLE CREATE --- */}
                    {modalTab === 'single' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                             {/* Switcher Type */}
                            <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                                <button onClick={() => setCreateType('firebase')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${createType === 'firebase' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <CloudLightning className="w-4 h-4 inline mr-1"/> Firebase (Email)
                                </button>
                                <button onClick={() => setCreateType('simple')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${createType === 'simple' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Database className="w-4 h-4 inline mr-1"/> Thường (User)
                                </button>
                            </div>

                            <form onSubmit={createTeacher} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Tên hiển thị</label>
                                        <input className={inputClass} placeholder="VD: Cô Lan" value={createName} onChange={e => setCreateName(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Mã GV (Duy nhất)</label>
                                        <input className={inputClass} placeholder="VD: GV001" value={createCode} onChange={e => setCreateCode(e.target.value)} required />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Trường học</label>
                                    <input className={inputClass} placeholder="VD: THPT A" value={createSchool} onChange={e => setCreateSchool(e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Ngày hết hạn (Giờ:Phút)</label>
                                    <div className="relative">
                                        <input 
                                            type="datetime-local" 
                                            className={`${inputClass} ${createLifetime ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                            value={createExpiration} 
                                            disabled={createLifetime}
                                            onChange={e => setCreateExpiration(e.target.value)} 
                                        />
                                        <div className="mt-2 flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id="createLifetime" 
                                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                                checked={createLifetime}
                                                onChange={e => {
                                                    setCreateLifetime(e.target.checked);
                                                    if(e.target.checked) setCreateExpiration('');
                                                }}
                                            />
                                            <label htmlFor="createLifetime" className="ml-2 text-sm font-bold text-gray-700 flex items-center">
                                                <InfinityIcon className="w-4 h-4 mr-1"/> Vĩnh viễn (Lifetime)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {createType === 'firebase' ? (
                                    <>
                                        <div>
                                            <label className={labelClass}>Email đăng nhập</label>
                                            <input type="email" className={inputClass} placeholder="email@example.com" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Mật khẩu</label>
                                            <input type="password" className={inputClass} placeholder="••••••••" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required />
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Username</label>
                                            <input type="text" className={inputClass} placeholder="user123" value={createUsername} onChange={e => setCreateUsername(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Password</label>
                                            <input type="text" className={inputClass} placeholder="123456" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    {createStatus && <p className={`text-sm mb-3 font-medium ${createStatus.startsWith('Lỗi') ? 'text-red-600' : 'text-green-600'}`}>{createStatus}</p>}
                                    <button type="submit" className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95 ${createType === 'firebase' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                        Tạo Tài Khoản
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* --- TAB 2: IMPORT --- */}
                    {modalTab === 'import' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                            {/* Import Type Switcher */}
                            <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                                <button onClick={() => setImportType('simple')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-md transition flex justify-center items-center ${importType === 'simple' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Database className="w-4 h-4 inline mr-1"/> Tài khoản Thường (User)
                                </button>
                                <button onClick={() => setImportType('firebase')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-md transition flex justify-center items-center ${importType === 'firebase' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <CloudLightning className="w-4 h-4 inline mr-1"/> Tài khoản Firebase (Email)
                                </button>
                            </div>

                            <p className="text-sm text-gray-600 mb-3 bg-blue-50 p-3 rounded border border-blue-100 leading-relaxed">
                                Copy nội dung từ Excel và dán vào ô bên dưới. <br/>
                                <span className="block mt-1">
                                    Thứ tự cột: <br/>
                                    {importType === 'simple' ? (
                                        <b className="text-purple-700">Tên | Mã GV | Trường | Username | Password</b>
                                    ) : (
                                        <b className="text-brand-700">Tên | Mã GV | Trường | Email</b>
                                    )}
                                </span>
                            </p>

                            {/* WARNING FOR FIREBASE IMPORT */}
                            {importType === 'firebase' && (
                                <div className="mb-3 flex items-start p-3 bg-orange-50 text-orange-800 text-xs rounded border border-orange-200">
                                    <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5"/>
                                    <span>
                                        <b>Lưu ý quan trọng:</b> Chức năng Import này chỉ tạo <b>Hồ sơ trên hệ thống</b> (để quản lý lớp, đề thi). 
                                        <br/>Tài khoản đăng nhập thực tế (Email/Pass) <b>KHÔNG</b> được tạo tự động. 
                                        Admin cần tạo thủ công trong Firebase Console hoặc giáo viên tự đăng ký.
                                    </span>
                                </div>
                            )}

                            <textarea 
                                className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-green-500 outline-none font-mono bg-white text-gray-900"
                                placeholder={importType === 'simple' 
                                    ? `Nguyen Van A | GV01 | Truong X | gva | 123\nTran Thi B | GV02 | Truong Y | gvb | 456`
                                    : `Nguyen Van A | GV01 | Truong X | a@email.com\nTran Thi B | GV02 | Truong Y | b@email.com`
                                }
                                value={teacherImportText}
                                onChange={e => setTeacherImportText(e.target.value)}
                            />
                             <p className="text-xs text-orange-500 italic mb-4">*Mặc định không có ngày hết hạn khi import nhanh.</p>

                            {importStatus && <p className="text-xs mb-2 font-bold text-orange-600 whitespace-pre-line">{importStatus}</p>}
                            
                            <button onClick={handleBulkImportTeachers} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-lg flex justify-center items-center">
                                <Upload className="w-5 h-5 mr-2"/> Bắt đầu Import
                            </button>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      )}

      {/* --- DELETE MODAL --- */}
      {teacherToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-[bounce_0.2s_ease-out]">
                 <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8"/>
                 </div>
                 <h3 className="font-bold text-xl mb-2 text-gray-800">Xóa giáo viên?</h3>
                 <p className="text-gray-600 mb-1 font-bold text-lg">{teacherToDelete.name}</p>
                 <p className="text-gray-500 text-sm mb-6">Hành động này sẽ xóa vĩnh viễn tài khoản và TẤT CẢ đề thi, dữ liệu liên quan.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setTeacherToDelete(null)} disabled={isDeleting} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700 hover:bg-gray-200">Hủy</button>
                     <button onClick={handleReallyDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg">
                        {isDeleting ? "Đang xóa..." : "Xóa Vĩnh Viễn"}
                     </button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};
