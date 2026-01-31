import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar, Wallet, Settings, Plus, Camera, X, Check, 
  Printer, LogOut, ChevronRight, Download, Activity, 
  FileText, ArrowLeft, Upload, Fingerprint, RefreshCw, Trash2, Clock,
  TrendingUp, TrendingDown, UserCheck, DollarSign, Menu, AlertTriangle, CameraOff,
  Briefcase, MapPin, Phone, Share2, MessageCircle, MessageSquare, Save, CalendarRange, ScanFace
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Employee, AttendanceRecord, Transaction, EmployeeRole, AttendanceStatus, WorkType } from './types';
import { DataService } from './services/firebaseService';

// --- Constants & Styles ---
const APP_NAME = "Signtech Digital";
const APP_NAME_BN = "সাইনটেক ডিজিটাল";

// Modern Gradients & Shadows
const GRADIENT_PRIMARY = 'bg-gradient-to-br from-rose-700 via-red-700 to-red-900';
const GRADIENT_CARD_1 = 'bg-gradient-to-br from-blue-600 to-blue-800';
const GRADIENT_CARD_2 = 'bg-gradient-to-br from-amber-500 to-orange-600';
const GRADIENT_CARD_3 = 'bg-gradient-to-br from-rose-500 to-red-600';
const GRADIENT_CARD_4 = 'bg-gradient-to-br from-emerald-500 to-teal-700';

const SHADOW_glow = 'shadow-xl shadow-red-900/10';
const GLASS_PANEL = 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg';
const CARD_HOVER = 'hover:-translate-y-1 hover:shadow-2xl transition-all duration-300';

// --- Utility Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getTodayDate = () => new Date().toISOString().split('T')[0];
const formatMoney = (amount: number) => `৳${Math.round(amount).toLocaleString('bn-BD')}`;
const formatDateBn = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Helper to resize image
const resizeImage = (base64Str: string, maxWidth = 300): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str); // Fallback
  });
};

const getRoleBn = (role: string) => {
  switch(role) {
    case EmployeeRole.DESIGNER: return 'ডিজাইনার';
    case EmployeeRole.MACHINE_OPERATOR: return 'মেশিন অপারেটর';
    case EmployeeRole.DELIVERY: return 'ডেলিভারি ম্যান';
    case EmployeeRole.HELPER: return 'হেল্পার';
    case EmployeeRole.INSTALLER: return 'ইন্সটলার';
    default: return role;
  }
};

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<{ phone: string; name: string } | null>(null);
  const [view, setView] = useState<'LOGIN' | 'OTP' | 'DASHBOARD' | 'EMPLOYEES' | 'ATTENDANCE' | 'PROFILE' | 'SETTINGS'>('LOGIN');
  
  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ADD_EMPLOYEE' | 'ADD_TRANSACTION' | 'CAMERA' | 'FINGERPRINT' | 'SALARY_SLIP' | 'DELETE_CONFIRM' | 'REPORT_FILTER' | 'FACE_VERIFICATION'>('ADD_EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [faceCheckinId, setFaceCheckinId] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Report Filter State
  const [reportRange, setReportRange] = useState({ start: getTodayDate(), end: getTodayDate(), label: 'দৈনিক' });

  // Forms
  const [loginPhone, setLoginPhone] = useState('');
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({});
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  
  // Attendance Selection State
  const [attendanceWorkType, setAttendanceWorkType] = useState<WorkType>(WorkType.PRINTING);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        DataService.getEmployees((data) => setEmployees(data || []));
        DataService.getAttendance((data) => setAttendance(data || []));
        DataService.getTransactions((data) => setTransactions(data || []));
        setLoading(false);
    };
    loadData();
  }, []);

  // --- Handlers ---
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = loginPhone.replace(/\D/g, '');
    const bdPhoneRegex = /^01[3-9][0-9]{8}$/;

    if (bdPhoneRegex.test(cleanPhone)) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setView('OTP');
      }, 500);
    } else {
      setError('সঠিক মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)');
    }
  };

  const playWelcomeSound = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("সাইনটেক এ আপনাকে স্বাগতম");
      utterance.lang = 'bn-BD'; 
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if(otp.length !== 4) return;
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        if (otp === '1234') { 
          setUser({ phone: loginPhone, name: 'Owner' });
          setView('DASHBOARD');
          playWelcomeSound();
        } else {
          setError('ভুল পিন কোড! আবার চেষ্টা করুন।');
        }
    }, 500);
  };

  const startCamera = async (facingMode: 'user' | 'environment' = 'environment') => {
    setIsModalOpen(true);
    setError(''); 
    setCameraError(false);
    // Wait for modal to render
    setTimeout(() => initCameraStream(facingMode), 100);
  };

  const initCameraStream = async (facingMode: 'user' | 'environment') => {
      setCameraError(false);
      setError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError(true);
          setError("আপনার ব্রাউজারে ক্যামেরা সাপোর্ট করছে না।");
          return;
      }

      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode } 
          });
          if(videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err) {
          try {
             // Fallback to any camera
             const stream = await navigator.mediaDevices.getUserMedia({ video: true });
             if(videoRef.current) {
                videoRef.current.srcObject = stream;
             }
          } catch (fallbackErr) {
             setCameraError(true);
             setError("কোনো ক্যামেরা পাওয়া যায়নি।");
          }
      }
  };

  useEffect(() => {
      // Clean up camera on modal close
      if (!isModalOpen && videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
      }
  }, [isModalOpen]);

  const capturePhoto = () => {
    if (videoRef.current && !cameraError) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        processImage(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const dataUrl = reader.result as string;
              processImage(dataUrl);
          };
          reader.readAsDataURL(file);
      }
  };

  const processImage = async (dataUrl: string) => {
      const resized = await resizeImage(dataUrl);
      setCapturedImage(resized);
      if(videoRef.current && videoRef.current.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setNewEmployee(prev => ({ ...prev, photoUrl: resized }));
      setIsModalOpen(false); 
      setModalType('ADD_EMPLOYEE'); 
      setTimeout(() => setIsModalOpen(true), 100);
  };

  // --- CRUD Handlers ---
  const handleAddEmployee = async () => {
    setFormError('');
    const name = (newEmployee.name || '').trim();
    const phone = (newEmployee.phone || '').trim();

    if (!name) { setFormError('কর্মচারীর নাম প্রয়োজন'); return; }
    if (!phone) { setFormError('মোবাইল নম্বর প্রয়োজন'); return; }

    setLoading(true);
    try {
        const emp: Employee = {
          id: generateId(),
          name: name,
          phone: phone,
          role: newEmployee.role || EmployeeRole.HELPER,
          salaryType: newEmployee.salaryType || 'MONTHLY',
          baseSalary: Number(newEmployee.baseSalary) || 0,
          joiningDate: newEmployee.joiningDate || getTodayDate(),
          photoUrl: newEmployee.photoUrl || "", 
          hasFingerprint: false,
          isActive: true,
        };

        await DataService.addEmployee(emp);
        setEmployees(prev => [...prev, emp]);
        setIsModalOpen(false);
        setNewEmployee({});
        setCapturedImage(null);
    } catch (e: any) {
        setFormError('সেভ করতে সমস্যা হয়েছে: ' + (e.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteRequest = () => {
    setModalType('DELETE_CONFIRM');
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if(!selectedEmployee) return;
    setLoading(true);
    try {
      await DataService.deleteEmployee(selectedEmployee.id);
      
      setEmployees(prev => prev.filter(e => e.id !== selectedEmployee.id));
      setAttendance(prev => prev.filter(a => a.employeeId !== selectedEmployee.id));
      setTransactions(prev => prev.filter(t => t.employeeId !== selectedEmployee.id));
      
      setIsModalOpen(false);
      setView('EMPLOYEES');
      setSelectedEmployee(null);
    } catch (e) {
      alert("ডিলিট করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCheckin = async () => {
      if(!faceCheckinId) {
          alert("অনুগ্রহ করে কর্মচারী সিলেক্ট করুন");
          return;
      }
      
      setIsScanning(true);
      // Simulate Face Scanning Delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await handleAttendance(faceCheckinId, AttendanceStatus.PRESENT, 8, 0);
      setIsScanning(false);
      setIsModalOpen(false);
      setFaceCheckinId('');
      
      if ('speechSynthesis' in window) {
         const emp = employees.find(e => e.id === faceCheckinId);
         if(emp) {
            const utterance = new SpeechSynthesisUtterance("ফেস ভেরিফাইড। ধন্যবাদ " + emp.name);
            utterance.lang = 'bn-BD';
            window.speechSynthesis.speak(utterance);
         }
      }
      alert("হাজিরা সফল হয়েছে!");
  };

  const handleAttendance = async (empId: string, status: AttendanceStatus, hours: number, ot: number) => {
    const record: AttendanceRecord = {
      id: generateId(),
      employeeId: empId,
      date: getTodayDate(),
      status,
      workType: attendanceWorkType,
      workHours: hours,
      overtimeHours: ot,
      checkInTime: new Date().toLocaleTimeString(),
    };
    await DataService.addAttendance(record);
    setAttendance(prev => {
        const filtered = prev.filter(a => !(a.employeeId === empId && a.date === getTodayDate()));
        return [...filtered, record];
    });
  };

  const handleAddTransaction = async () => {
    if (!selectedEmployee || !newTransaction.amount || !newTransaction.type) return;
    const trx: Transaction = {
      id: generateId(),
      employeeId: selectedEmployee.id,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as any,
      date: getTodayDate(),
      note: newTransaction.note || '',
    };
    await DataService.addTransaction(trx);
    setTransactions(prev => [...prev, trx]); 
    setIsModalOpen(false);
    setNewTransaction({});
  };

  // --- Export/Import ---
  const exportData = () => {
    const data = { employees, attendance, transactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Signtech_Backup_${getTodayDate()}.json`;
    link.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.employees) {
            if(confirm("বর্তমান ডাটা মুছে ব্যাকআপ রিস্টোর করতে চান?")) {
                localStorage.setItem('employees', JSON.stringify(json.employees));
                localStorage.setItem('attendance', JSON.stringify(json.attendance || []));
                localStorage.setItem('transactions', JSON.stringify(json.transactions || []));
                window.location.reload();
            }
          } else {
            alert("ভুল ফাইল ফরম্যাট!");
          }
        } catch (error) {
          alert("ফাইল রিড করতে সমস্যা হয়েছে।");
        }
      };
      reader.readAsText(file);
    }
  };

  // --- Stats & PDF ---
  const getEmployeeStats = (empId: string) => {
    const empAtt = attendance.filter(a => a.employeeId === empId);
    const empTrx = transactions.filter(t => t.employeeId === empId);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthAtt = empAtt.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisMonthTrx = empTrx.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const presentDays = thisMonthAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const halfDays = thisMonthAtt.filter(a => a.status === AttendanceStatus.HALF_DAY).length;
    const totalOT = thisMonthAtt.reduce((acc, curr) => acc + (curr.overtimeHours || 0), 0);

    const advance = thisMonthTrx.filter(t => t.type === 'ADVANCE').reduce((acc, curr) => acc + curr.amount, 0);
    const food = thisMonthTrx.filter(t => t.type === 'FOOD_COST').reduce((acc, curr) => acc + curr.amount, 0);
    const penalties = thisMonthTrx.filter(t => t.type === 'PENALTY').reduce((acc, curr) => acc + curr.amount, 0);
    const bonus = thisMonthTrx.filter(t => t.type === 'BONUS').reduce((acc, curr) => acc + curr.amount, 0);
    const paid = thisMonthTrx.filter(t => t.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0);

    return { presentDays, halfDays, totalOT, advance, food, penalties, bonus, paid };
  };

  const calculateSalary = (emp: Employee) => {
    const stats = getEmployeeStats(emp.id);
    let earned = 0;
    
    let dailyRate = 0;
    if (emp.salaryType === 'MONTHLY') {
        dailyRate = emp.baseSalary / 30;
    } else if (emp.salaryType === 'WEEKLY') {
        dailyRate = emp.baseSalary / 7;
    } else {
        dailyRate = emp.baseSalary;
    }
    
    earned += (stats.presentDays * dailyRate);
    earned += (stats.halfDays * dailyRate * 0.5);
    
    const hourlyRate = dailyRate / 8;
    earned += (stats.totalOT * hourlyRate);
    earned += stats.bonus;
    
    const totalTaken = stats.advance + stats.food + stats.penalties + stats.paid;
    const remainingDue = earned - totalTaken;

    return { 
      earned: Math.round(earned), 
      totalDeductions: Math.round(totalTaken), 
      netPayable: Math.round(remainingDue), 
      remainingDue: Math.round(remainingDue), 
      dailyRate: Math.round(dailyRate), 
      hourlyRate: Math.round(hourlyRate)
    };
  };

  const openReportFilter = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const end = today.toISOString().split('T')[0];
    setReportRange({ start, end, label: 'মাসিক' });
    setModalType('REPORT_FILTER');
    setIsModalOpen(true);
  };

  const setFilterOption = (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
      const today = new Date();
      let start = '';
      const end = today.toISOString().split('T')[0];
      let label = '';

      if (type === 'DAILY') {
          start = end;
          label = 'দৈনিক';
      } else if (type === 'WEEKLY') {
          const d = new Date();
          d.setDate(d.getDate() - 6);
          start = d.toISOString().split('T')[0];
          label = 'সাপ্তাহিক';
      } else {
          const d = new Date(today.getFullYear(), today.getMonth(), 1);
          start = d.toISOString().split('T')[0];
          label = 'মাসিক';
      }
      setReportRange({ start, end, label });
  };

  // Generate PDF with Fallback for Mobile
  const handleReportAction = async (action: 'DOWNLOAD' | 'SHARE') => {
    if (!reportRef.current || !selectedEmployee) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, 
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `Report_${selectedEmployee.name}_${reportRange.label}.pdf`;

      if (action === 'DOWNLOAD') {
          try {
              pdf.save(fileName);
          } catch (e) {
              // Fallback for mobile views that block downloads
              const pdfBlob = pdf.output('blob');
              const fileURL = URL.createObjectURL(pdfBlob);
              window.open(fileURL, '_blank');
              alert("ডাউনলোড শুরু না হলে, নতুন উইন্ডো থেকে সেভ করুন।");
          }
      } else if (action === 'SHARE') {
          const pdfBlob = pdf.output('blob');
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                    files: [file],
                    title: 'Signtech Salary Report',
                    text: `Report for ${selectedEmployee.name}`
                });
              } catch (error: any) {
                 if (error.name !== 'AbortError') {
                    // Fallback: Open file in new tab
                    const fileURL = URL.createObjectURL(pdfBlob);
                    window.open(fileURL, '_blank');
                    alert("শেয়ার অপশন কাজ করছে না। ফাইলটি ওপেন হয়েছে, ম্যানুয়ালি শেয়ার করুন।");
                 }
              }
          } else {
              // Fallback: Open file in new tab
              const fileURL = URL.createObjectURL(pdfBlob);
              window.open(fileURL, '_blank');
              alert("আপনার ডিভাইসে সরাসরি শেয়ার সাপোর্ট করছে না। ফাইলটি ওপেন হয়েছে, ম্যানুয়ালি হোয়াটসঅ্যাপে পাঠান।");
          }
      }
      
      setIsModalOpen(false);
    } catch (err) {
      console.error("PDF Gen Error:", err);
      alert("পিডিএফ তৈরিতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  // Share Functionality (Text only)
  const handleShare = (method: 'WHATSAPP' | 'SMS') => {
      if (!selectedEmployee) return;
      
      const salary = calculateSalary(selectedEmployee);
      const message = `
*${APP_NAME_BN} - হিসাব বিবরণী*
তারিখ: ${new Date().toLocaleDateString('bn-BD')}
কর্মচারী: ${selectedEmployee.name}

মোট আয়: ৳${salary.earned}
মোট গ্রহণ/খরচ: ৳${salary.totalDeductions}
বর্তমান বকেয়া: ৳${salary.remainingDue}

বিস্তারিত জানতে অফিসে যোগাযোগ করুন।
      `.trim();

      const encodedMsg = encodeURIComponent(message);
      
      if (method === 'WHATSAPP') {
          let phone = selectedEmployee.phone.replace(/\D/g, '');
          if (phone.startsWith('0')) phone = '88' + phone;
          window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
      } else {
          window.open(`sms:${selectedEmployee.phone}?body=${encodedMsg}`, '_blank');
      }
  };

  // --- Helper for Render Report ---
  const renderHiddenReport = () => {
    if (!selectedEmployee) return null;
    
    // Filter data based on reportRange
    const empAtt = attendance.filter(a => a.employeeId === selectedEmployee.id && a.date >= reportRange.start && a.date <= reportRange.end);
    const empTrx = transactions.filter(t => t.employeeId === selectedEmployee.id && t.date >= reportRange.start && t.date <= reportRange.end);
    
    // Calculate stats based on filtered data
    let dailyRate = 0;
    if (selectedEmployee.salaryType === 'MONTHLY') dailyRate = selectedEmployee.baseSalary / 30;
    else if (selectedEmployee.salaryType === 'WEEKLY') dailyRate = selectedEmployee.baseSalary / 7;
    else dailyRate = selectedEmployee.baseSalary;

    const hourlyRate = dailyRate / 8;

    const presentDays = empAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const halfDays = empAtt.filter(a => a.status === AttendanceStatus.HALF_DAY).length;
    const totalOT = empAtt.reduce((acc, curr) => acc + (curr.overtimeHours || 0), 0);

    let earned = (presentDays * dailyRate) + (halfDays * dailyRate * 0.5) + (totalOT * hourlyRate);
    
    const advance = empTrx.filter(t => t.type === 'ADVANCE').reduce((a, b) => a + b.amount, 0);
    const food = empTrx.filter(t => t.type === 'FOOD_COST').reduce((a, b) => a + b.amount, 0);
    const penalty = empTrx.filter(t => t.type === 'PENALTY').reduce((a, b) => a + b.amount, 0);
    const bonus = empTrx.filter(t => t.type === 'BONUS').reduce((a, b) => a + b.amount, 0);
    const paid = empTrx.filter(t => t.type === 'PAYMENT').reduce((a, b) => a + b.amount, 0);

    earned += bonus;
    const totalTaken = advance + food + penalty + paid;
    const netDue = earned - totalTaken;

    // Timeline construction
    const timeline = [
        ...empAtt.map(a => ({
            id: a.id,
            date: a.date,
            type: 'HAJIRA',
            desc: `${a.status === AttendanceStatus.PRESENT ? 'উপস্থিত' : a.status === AttendanceStatus.HALF_DAY ? 'হাফ ডে' : 'অনুপস্থিত'} (${a.overtimeHours || 0} ঘণ্টা OT)`,
            amount: 0,
            isCredit: true
        })),
        ...empTrx.map(t => ({
            id: t.id,
            date: t.date,
            type: t.type,
            desc: t.note || (t.type === 'ADVANCE' ? 'অগ্রিম' : t.type === 'FOOD_COST' ? 'খাবার' : t.type === 'PENALTY' ? 'জরিমানা' : t.type === 'BONUS' ? 'বোনাস' : 'বেতন প্রদান'),
            amount: t.amount,
            isCredit: t.type === 'BONUS'
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div ref={reportRef} className="fixed -left-[9999px] top-0 w-[210mm] min-h-[297mm] bg-white text-black p-10 font-sans" style={{ width: '794px' }}>
         {/* Header */}
         <div className="text-center border-b-2 border-red-800 pb-6 mb-6">
            <h1 className="text-4xl font-bold text-red-800 mb-2">{APP_NAME_BN}</h1>
            <p className="text-gray-600">ডিজিটাল ব্যানার প্রিন্টিং সলিউশন</p>
            <p className="text-sm text-gray-500 mt-1">রিপোর্টের সময়কাল: {formatDateBn(reportRange.start)} থেকে {formatDateBn(reportRange.end)}</p>
         </div>

         {/* Employee Info */}
         <div className="flex justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mb-8">
            <div>
               <p className="text-sm text-gray-500 mb-1">কর্মচারীর নাম</p>
               <p className="text-xl font-bold">{selectedEmployee.name}</p>
            </div>
            <div className="text-right">
               <p className="text-sm text-gray-500 mb-1">পদবি ও মোবাইল</p>
               <p className="font-bold">{getRoleBn(selectedEmployee.role)} | {selectedEmployee.phone}</p>
            </div>
         </div>

         {/* Summary Cards */}
         <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-800 border-l-4 border-red-600 pl-3">হিসাব বিবরণী ({reportRange.label})</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="border p-3 rounded-lg bg-green-50 border-green-100">
                   <span className="text-green-700 text-sm">মোট আয় (হাজিরা+OT+বোনাস)</span>
                   <p className="font-bold text-lg text-green-800">{formatMoney(earned)}</p>
                </div>
                <div className="border p-3 rounded-lg bg-red-50 border-red-100">
                   <span className="text-red-700 text-sm">মোট গ্রহণ (অগ্রিম+খাবার+বেতন)</span>
                   <p className="font-bold text-lg text-red-800">-{formatMoney(totalTaken)}</p>
                </div>
                <div className="border p-3 rounded-lg bg-blue-50 border-blue-100 col-span-2">
                   <span className="text-blue-700 text-sm">বর্তমান বকেয়া (পাবে)</span>
                   <p className="font-bold text-2xl text-blue-800">{formatMoney(netDue)}</p>
                </div>
            </div>
         </div>

         {/* Detailed Table */}
         <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800 border-l-4 border-gray-600 pl-3">বিস্তারিত লেনদেন ও হাজিরা</h3>
            <table className="w-full text-sm text-left border-collapse">
               <thead>
                  <tr className="bg-red-800 text-white">
                     <th className="p-3 rounded-tl-lg">তারিখ</th>
                     <th className="p-3">ধরণ</th>
                     <th className="p-3">বিবরণ</th>
                     <th className="p-3 text-right rounded-tr-lg">টাকা</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                  {timeline.map((item, idx) => (
                     <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-3 font-medium">{formatDateBn(item.date)}</td>
                        <td className="p-3">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'HAJIRA' ? 'bg-gray-200 text-gray-700' : item.isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.type === 'HAJIRA' ? 'হাজিরা' : item.type}
                           </span>
                        </td>
                        <td className="p-3 text-gray-600">{item.desc}</td>
                        <td className={`p-3 text-right font-bold ${item.amount === 0 ? 'text-gray-400' : item.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                           {item.amount > 0 ? (item.isCredit ? '+' : '-') + formatMoney(item.amount) : '-'}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Footer */}
         <div className="mt-16 flex justify-between text-xs text-gray-400 pt-4 border-t border-gray-200">
            <p>Generated by {APP_NAME_BN}</p>
            <p>Authorized Signature</p>
         </div>
      </div>
    );
  };

  // --- Render Views ---
  
  // Login Screen
  if (view === 'LOGIN') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-400/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-sm bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
            <div className={`${GRADIENT_PRIMARY} p-10 text-center relative overflow-hidden`}>
               {/* Pattern Overlay */}
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               
               <div className="bg-white/20 p-4 rounded-3xl w-24 h-24 mx-auto mb-5 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                <Printer size={48} className="text-white drop-shadow-md" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-sm">{APP_NAME_BN}</h1>
              <p className="text-red-100 text-sm mt-1 font-medium opacity-90">ডিজিটাল ব্যানার প্রিন্টিং ম্যানেজমেন্ট</p>
            </div>
            <div className="p-8">
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">মোবাইল নম্বর</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-3.5 text-gray-500 font-bold tracking-wider z-10 bg-white/0">+88</span>
                    <input 
                      type="tel" 
                      className={`block w-full rounded-2xl border bg-gray-50/50 p-3.5 pl-12 text-lg font-bold text-gray-800 focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none ${error ? 'border-red-500' : 'border-gray-200 hover:border-red-300'}`}
                      placeholder="017xxxxxxxx"
                      value={loginPhone}
                      onChange={e => { setLoginPhone(e.target.value); setError(''); }}
                    />
                  </div>
                  {error && <p className="text-red-600 text-sm mt-3 font-medium bg-red-50 p-2.5 rounded-xl flex items-center animate-pulse"><X size={14} className="mr-1.5"/>{error}</p>}
                </div>
                <button type="submit" disabled={loading} className={`w-full ${GRADIENT_PRIMARY} hover:brightness-110 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-900/20 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {loading ? 'অপেক্ষা করুন...' : 'পরবর্তী ধাপ'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Screen
  if (view === 'OTP') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 items-center justify-center p-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200"></div>
         <div className="w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 relative z-10 border border-white/60">
            <button onClick={() => setView('LOGIN')} className="absolute top-4 left-4 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors bg-white/50 p-2.5 rounded-full"><ArrowLeft size={20} /></button>
            <div className="text-center mb-8 mt-6">
               <h2 className="text-2xl font-bold text-gray-800">পিন কোড যাচাই</h2>
               <p className="text-gray-500 text-sm mt-1">আপনার মোবাইলে পাঠানো ৪ সংখ্যার কোডটি দিন</p>
            </div>
            
            <div className="bg-blue-50/80 text-blue-700 p-4 rounded-2xl text-sm text-center mb-8 border border-blue-100 font-medium backdrop-blur-sm">ডেমো পিন: <span className="font-bold text-xl tracking-widest ml-2">1234</span></div>
            
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <input 
                type="text" 
                className="block w-full rounded-2xl border-2 border-gray-100 bg-white p-5 text-center text-4xl tracking-[0.5em] font-bold text-gray-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none shadow-sm placeholder:tracking-normal placeholder:text-gray-300"
                placeholder="••••"
                maxLength={4}
                value={otp}
                onChange={e => { setOtp(e.target.value); setError(''); }}
              />
               {error && <p className="text-red-600 text-sm text-center font-bold bg-red-50 py-2 rounded-lg">{error}</p>}
               <button type="submit" disabled={loading || otp.length < 4} className={`w-full ${GRADIENT_PRIMARY} hover:brightness-110 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-900/20 transform active:scale-[0.98] transition-all disabled:opacity-50`}>
                  {loading ? 'যাচাই হচ্ছে...' : 'লগইন করুন'}
                </button>
            </form>
         </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-28 md:pb-0 md:pl-72 font-sans text-gray-800 selection:bg-red-100 selection:text-red-900">
      
      {/* Sidebar (Desktop) */}
      <aside className={`hidden md:flex flex-col w-72 fixed inset-y-0 left-0 ${GRADIENT_PRIMARY} text-white z-50 shadow-2xl overflow-hidden relative`}>
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="p-8 flex items-center space-x-3 border-b border-white/10 relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl shadow-inner w-12 h-12 flex items-center justify-center border border-white/20">
             <Printer size={26} className="text-white drop-shadow-md" />
          </div>
          <div><span className="font-bold text-xl block leading-tight tracking-wide drop-shadow-sm">{APP_NAME_BN}</span><span className="text-xs text-red-200/90 uppercase tracking-widest font-semibold mt-0.5 block">অ্যাডমিন প্যানেল</span></div>
        </div>
        <nav className="flex-1 p-6 space-y-4 relative z-10">
          {[
            { id: 'DASHBOARD', icon: Activity, label: 'ড্যাশবোর্ড' },
            { id: 'EMPLOYEES', icon: Users, label: 'কর্মচারী তালিকা' },
            { id: 'ATTENDANCE', icon: Calendar, label: 'দৈনিক হাজিরা' },
            { id: 'SETTINGS', icon: Settings, label: 'সেটিংস' }
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as any)} className={`flex items-center space-x-4 w-full p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${view === item.id ? 'bg-white text-red-800 shadow-xl font-bold translate-x-2' : 'text-red-50 hover:bg-white/10 hover:translate-x-1'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${view === item.id ? 'bg-red-600' : 'bg-transparent'} transition-all`}></div>
              <item.icon size={22} className={view === item.id ? 'stroke-[2.5px]' : ''} /> <span className="text-base tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 bg-black/20 backdrop-blur-sm relative z-10"><button onClick={() => { setUser(null); setView('LOGIN'); }} className="flex items-center space-x-3 text-sm text-red-100 hover:text-white w-full transition-colors group"><div className="p-2 rounded-full bg-white/10 group-hover:bg-red-600 transition-colors"><LogOut size={16} /></div> <span className="font-bold">লগ আউট</span></button></div>
      </aside>

      {/* Mobile Header */}
      <header className={`md:hidden ${GRADIENT_PRIMARY} text-white p-5 flex justify-between items-center sticky top-0 z-40 shadow-lg rounded-b-[2rem] relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div className="flex items-center space-x-3 relative z-10">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md w-10 h-10 flex items-center justify-center border border-white/20 shadow-lg">
            <Printer size={22} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-wide drop-shadow-md">{APP_NAME_BN}</span>
        </div>
        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition border border-white/10 backdrop-blur-md relative z-10" onClick={() => { setUser(null); setView('LOGIN'); }}><LogOut size={18} className="text-white" /></div>
      </header>

      <main className="p-5 md:p-10 max-w-7xl mx-auto">
        
        {view === 'DASHBOARD' && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
               <div>
                  <h2 className="text-3xl font-bold text-gray-800">স্বাগতম! 👋</h2>
                  <p className="text-gray-500 font-medium mt-1">আজকের দিনের সকল আপডেট</p>
               </div>
               <span className="self-start md:self-auto text-sm bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm text-gray-600 font-bold flex items-center gap-2"><Calendar size={16} className="text-red-600"/> {formatDateBn(getTodayDate())}</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric Cards with Decor */}
                <div className={`relative overflow-hidden ${GRADIENT_CARD_1} p-6 rounded-3xl shadow-xl shadow-blue-900/10 text-white group ${CARD_HOVER}`}>
                  <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12 scale-150"><Users size={120} /></div>
                  <div className="relative z-10">
                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md"><UserCheck size={24} /></div>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">আজ উপস্থিত</p>
                    <p className="text-4xl font-bold">{attendance.filter(a => a.date === getTodayDate() && a.status === AttendanceStatus.PRESENT).length} <span className="text-lg font-normal opacity-60">/ {employees.length}</span></p>
                  </div>
                </div>

                <div className={`relative overflow-hidden ${GRADIENT_CARD_2} p-6 rounded-3xl shadow-xl shadow-orange-900/10 text-white group ${CARD_HOVER}`}>
                   <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12 scale-150"><Clock size={120} /></div>
                   <div className="relative z-10">
                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md"><Clock size={24} /></div>
                    <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">মোট ওভারটাইম</p>
                    <p className="text-4xl font-bold">{attendance.filter(a => a.date === getTodayDate()).reduce((a,b) => a + (b.overtimeHours || 0), 0)} <span className="text-lg font-normal opacity-80">ঘণ্টা</span></p>
                   </div>
                </div>

                <div className={`relative overflow-hidden ${GRADIENT_CARD_3} p-6 rounded-3xl shadow-xl shadow-red-900/10 text-white group ${CARD_HOVER}`}>
                   <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12 scale-150"><Wallet size={120} /></div>
                   <div className="relative z-10">
                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md"><TrendingDown size={24} /></div>
                    <p className="text-pink-100 text-xs font-bold uppercase tracking-widest mb-1">আজকের খরচ</p>
                    <p className="text-3xl font-bold">{formatMoney(transactions.filter(t => t.date === getTodayDate() && ['ADVANCE', 'FOOD_COST', 'PAYMENT'].includes(t.type)).reduce((a,b) => a + b.amount, 0))}</p>
                   </div>
                </div>

                <div className={`relative overflow-hidden ${GRADIENT_CARD_4} p-6 rounded-3xl shadow-xl shadow-emerald-900/10 text-white group ${CARD_HOVER}`}>
                   <div className="absolute right-[-20px] top-[-20px] opacity-10 transform rotate-12 scale-150"><DollarSign size={120} /></div>
                   <div className="relative z-10">
                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md"><Activity size={24} /></div>
                    <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">মোট বকেয়া</p>
                    <p className="text-3xl font-bold">{formatMoney(employees.reduce((acc, emp) => acc + calculateSalary(emp).remainingDue, 0))}</p>
                   </div>
                </div>
             </div>
             
             {/* Recent Activity List */}
             <div className={`${GLASS_PANEL} rounded-[2rem] p-8`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2"><RefreshCw size={20} className="text-gray-400"/> সর্বশেষ লেনদেন</h3>
                    <button onClick={() => setView('EMPLOYEES')} className="text-sm font-bold text-red-600 hover:text-red-700 hover:underline">সব দেখুন</button>
                </div>
                <div className="space-y-4">
                   {transactions.slice(-3).reverse().map(t => {
                     const emp = employees.find(e => e.id === t.employeeId);
                     return (
                       <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white border border-gray-100 hover:border-red-100 rounded-2xl transition-all duration-200 hover:shadow-md cursor-default group">
                          <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-2xl ${['BONUS','PAYMENT'].includes(t.type) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} group-hover:scale-110 transition-transform`}>
                                {['BONUS','PAYMENT'].includes(t.type) ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                             </div>
                             <div>
                                <p className="font-bold text-base text-gray-800">{emp?.name}</p>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5">{t.type}</p>
                             </div>
                          </div>
                          <span className={`font-bold text-lg ${['BONUS','PAYMENT'].includes(t.type) ? 'text-green-600' : 'text-red-600'}`}>
                             {['BONUS','PAYMENT'].includes(t.type) ? '+' : '-'} {t.amount}
                          </span>
                       </div>
                     )
                   })}
                   {transactions.length === 0 && <p className="text-gray-400 text-center text-sm py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">কোনো লেনদেন পাওয়া যায়নি</p>}
                </div>
             </div>
          </div>
        )}

        {view === 'EMPLOYEES' && (
          <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-center">
               <h2 className="text-3xl font-bold text-gray-800">কর্মচারী তালিকা <span className="text-gray-400 text-xl font-medium align-top ml-1">({employees.length})</span></h2>
               <button onClick={() => { setModalType('ADD_EMPLOYEE'); setIsModalOpen(true); setFormError(''); }} className={`${GRADIENT_PRIMARY} text-white px-6 py-3 rounded-full shadow-lg shadow-red-900/20 flex items-center hover:scale-105 transition-transform active:scale-95 ring-4 ring-red-50`}><Plus size={20} className="mr-2" /> <span className="font-bold">নতুন যোগ</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {employees.map(emp => (
                 <div key={emp.id} onClick={() => { setSelectedEmployee(emp); setView('PROFILE'); }} className={`group bg-white rounded-3xl p-6 relative cursor-pointer border border-gray-100 hover:border-red-100 transition-all duration-300 ${CARD_HOVER}`}>
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-3xl border-b border-gray-100"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="h-24 w-24 rounded-full bg-white p-1 shadow-lg mb-3 mt-4 group-hover:scale-105 transition-transform duration-300">
                             <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
                                {emp.photoUrl ? <img src={emp.photoUrl} className="h-full w-full object-cover" /> : <Users size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300" />}
                             </div>
                        </div>
                        <h3 className="font-bold text-xl text-gray-800 text-center mb-1 group-hover:text-red-700 transition-colors">{emp.name}</h3>
                        <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">{getRoleBn(emp.role)}</span>
                        
                        <div className="w-full grid grid-cols-2 gap-2 mt-2">
                             <div className="bg-gray-50 rounded-xl p-2 text-center">
                                 <p className="text-[10px] text-gray-400 font-bold uppercase">বেতন/হাজিরা</p>
                                 <p className="font-bold text-gray-700 text-sm">{formatMoney(emp.baseSalary)}</p>
                             </div>
                             <div className="bg-emerald-50 rounded-xl p-2 text-center">
                                 <p className="text-[10px] text-emerald-400 font-bold uppercase">পাবে</p>
                                 <p className="font-bold text-emerald-700 text-sm">{formatMoney(calculateSalary(emp).netPayable)}</p>
                             </div>
                        </div>
                    </div>
                 </div>
               ))}
               {employees.length === 0 && <div className="text-center text-gray-400 py-16 w-full col-span-full bg-white rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center"><Users size={48} className="text-gray-200 mb-4"/><p>কোনো কর্মচারী নেই, নতুন যোগ করুন।</p></div>}
            </div>
          </div>
        )}

        {view === 'ATTENDANCE' && (
          <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
             <div className={`${GLASS_PANEL} p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4`}>
               <div>
                   <h2 className="text-3xl font-bold text-gray-800 mb-2">হাজিরা খাতা</h2>
                   <p className="text-gray-500 font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm inline-flex"><Calendar size={16} className="text-red-500"/> {formatDateBn(getTodayDate())}</p>
               </div>
               
               <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <button onClick={() => { setModalType('FACE_VERIFICATION'); startCamera('user'); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition active:scale-95">
                        <ScanFace size={20} /> ফেস ভেরিফিকেশন হাজিরা
                    </button>

                    <div className="w-full md:w-auto">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 ml-1">কাজের ধরন</p>
                        <div className="relative group">
                            <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-3 pl-5 pr-10 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-200 w-full md:w-56 shadow-sm transition-all cursor-pointer" value={attendanceWorkType} onChange={e => setAttendanceWorkType(e.target.value as WorkType)}>
                                {Object.values(WorkType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 group-hover:text-red-500 transition-colors"><ChevronRight size={16} className="rotate-90"/></div>
                        </div>
                    </div>
               </div>
             </div>
             
             <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {employees.map((emp, idx) => {
                  const todayRecord = attendance.find(a => a.employeeId === emp.id && a.date === getTodayDate());
                  return (
                    <div key={emp.id} className={`p-6 border-b last:border-0 border-gray-100 transition-colors hover:bg-gray-50/80`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-0">
                         <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-gray-100 overflow-hidden shadow-sm ring-2 ring-white">{emp.photoUrl && <img src={emp.photoUrl} className="h-full w-full object-cover" />}</div>
                            <div>
                                <p className="font-bold text-lg text-gray-800">{emp.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded uppercase tracking-wide">{getRoleBn(emp.role)}</span>
                                    {todayRecord && <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${todayRecord.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : todayRecord.status === AttendanceStatus.HALF_DAY ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{todayRecord.status === AttendanceStatus.PRESENT ? 'উপস্থিত' : todayRecord.status === AttendanceStatus.HALF_DAY ? 'হাফ ডে' : 'অনুপস্থিত'}</span>}
                                </div>
                            </div>
                         </div>
                         
                         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                            {(todayRecord?.status === AttendanceStatus.PRESENT || todayRecord?.status === AttendanceStatus.HALF_DAY) && (
                                <div className="flex items-center bg-white border border-red-100 rounded-xl px-3 py-1.5 shadow-sm mr-2 focus-within:ring-2 ring-red-100 transition-all">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase mr-2">OT</span>
                                    <input 
                                    type="number" 
                                    className="w-10 text-center text-lg font-bold text-red-600 outline-none placeholder-gray-300" 
                                    defaultValue={todayRecord.overtimeHours || 0} 
                                    onBlur={(e) => handleAttendance(emp.id, todayRecord.status, todayRecord.workHours, Number(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-400 font-medium ml-1">ঘণ্টা</span>
                                </div>
                            )}

                            <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                                <button onClick={() => handleAttendance(emp.id, AttendanceStatus.PRESENT, 8, 0)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${todayRecord?.status === AttendanceStatus.PRESENT ? 'bg-white text-green-600 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}>
                                    <Check size={16} /> <span className="hidden sm:inline">উপস্থিত</span>
                                </button>
                                <button onClick={() => handleAttendance(emp.id, AttendanceStatus.HALF_DAY, 4, 0)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${todayRecord?.status === AttendanceStatus.HALF_DAY ? 'bg-white text-amber-500 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}>
                                    <Activity size={16} /> <span className="hidden sm:inline">হাফ ডে</span>
                                </button>
                                <button onClick={() => handleAttendance(emp.id, AttendanceStatus.ABSENT, 0, 0)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${todayRecord?.status === AttendanceStatus.ABSENT ? 'bg-white text-red-500 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}>
                                    <X size={16} /> <span className="hidden sm:inline">নাই</span>
                                </button>
                            </div>
                         </div>
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {view === 'PROFILE' && selectedEmployee && (
          <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-24">
             <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                {/* Curved Header Background */}
                <div className={`${GRADIENT_PRIMARY} h-48 relative overflow-hidden`}>
                   <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                   <div className="absolute bottom-0 w-full h-16 bg-white rounded-t-[50%] scale-x-150 translate-y-8"></div>
                   
                   <button onClick={() => setView('EMPLOYEES')} className="absolute top-6 left-6 text-white flex items-center bg-white/10 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md hover:bg-white/20 transition border border-white/10"><ChevronRight className="rotate-180 mr-1" size={14}/> ফিরে যান</button>
                   <div className="absolute top-6 right-6 flex gap-3">
                      <button onClick={() => { setModalType('ADD_TRANSACTION'); setIsModalOpen(true); }} className="bg-white/10 text-white px-5 py-2.5 rounded-full text-xs font-bold backdrop-blur-md flex items-center hover:bg-white/20 transition border border-white/10 shadow-lg"><Plus size={14} className="mr-1.5"/> টাকা দিন/নিন</button>
                      <button onClick={openReportFilter} className="bg-white/10 text-white p-2.5 rounded-full backdrop-blur-md hover:bg-white/20 transition border border-white/10"><Download size={16} /></button>
                   </div>
                </div>
                
                <div className="px-8 pb-10 relative text-center">
                   <div className="relative inline-block -mt-24 mb-6">
                      <div className="h-36 w-36 rounded-full border-4 border-white bg-white p-1 shadow-2xl relative z-10">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                           {selectedEmployee.photoUrl ? <img src={selectedEmployee.photoUrl} className="h-full w-full object-cover"/> : <Camera className="m-auto mt-12 text-gray-300" size={40}/>}
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-green-500 border-4 border-white w-6 h-6 rounded-full z-20" title="Active"></div>
                   </div>
                   
                   <h2 className="text-4xl font-bold text-gray-800 mb-2">{selectedEmployee.name}</h2>
                   <div className="flex items-center justify-center gap-3 mb-6">
                        <span className="bg-gray-100 px-4 py-1.5 rounded-full text-xs font-bold text-gray-600 uppercase tracking-widest">{getRoleBn(selectedEmployee.role)}</span>
                        <span className="flex items-center text-gray-400 text-sm font-medium"><Phone size={14} className="mr-1"/>{selectedEmployee.phone}</span>
                   </div>
                   
                   {/* WhatsApp and SMS Sharing Buttons */}
                   <div className="flex justify-center gap-4 mb-8">
                       <button onClick={() => handleShare('WHATSAPP')} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-green-200 transition-all transform active:scale-95">
                           <MessageCircle size={18} /> WhatsApp
                       </button>
                       <button onClick={() => handleShare('SMS')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95">
                           <MessageSquare size={18} /> SMS
                       </button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 mt-10 max-w-lg mx-auto">
                       <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:border-red-100 transition-colors">
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">বর্তমান বেতন/হাজিরা</p>
                          <p className="text-2xl font-bold text-gray-800">{formatMoney(selectedEmployee.baseSalary)}</p>
                       </div>
                       <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 hover:border-emerald-200 transition-colors">
                          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">মোট প্রাপ্য (চলতি মাস)</p>
                          <p className="text-2xl font-bold text-emerald-600">{formatMoney(calculateSalary(selectedEmployee).netPayable)}</p>
                       </div>
                   </div>
                </div>
             </div>
             
             <div className={`${GLASS_PANEL} rounded-[2.5rem] overflow-hidden`}>
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-xl">লেনদেন ইতিহাস</h3>
                    <span className="text-xs text-gray-500 font-bold bg-gray-100 px-3 py-1.5 rounded-full">সর্বশেষ ৩০ দিন</span>
                </div>
                <div className="divide-y divide-gray-50">
                   {transactions.filter(t => t.employeeId === selectedEmployee.id).slice().reverse().map(t => (
                      <div key={t.id} className="p-6 flex justify-between items-center hover:bg-gray-50/80 transition-colors">
                         <div className="flex items-center gap-5">
                            <div className={`p-3.5 rounded-2xl ${['BONUS', 'PAYMENT'].includes(t.type) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {['BONUS', 'PAYMENT'].includes(t.type) ? <TrendingUp size={24}/> : <TrendingDown size={24}/>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-base mb-1">{t.type === 'ADVANCE' ? 'অগ্রিম গ্রহণ' : t.type === 'PAYMENT' ? 'বেতন প্রদান' : t.type === 'FOOD_COST' ? 'খাবার বাবদ' : t.type}</p>
                                <p className="text-xs text-gray-400 font-medium bg-white border border-gray-100 px-2 py-0.5 rounded inline-block">{t.date}</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <span className={`font-bold text-xl block ${['BONUS', 'PAYMENT'].includes(t.type) ? 'text-green-600' : 'text-red-600'}`}>
                               {['BONUS', 'PAYMENT'].includes(t.type) ? '+' : '-'} {formatMoney(t.amount)}
                             </span>
                             {t.note && <span className="text-xs text-gray-400 block max-w-[150px] truncate mt-1">{t.note}</span>}
                         </div>
                      </div>
                   ))}
                   {transactions.filter(t => t.employeeId === selectedEmployee.id).length === 0 && <div className="p-16 text-center text-gray-400 flex flex-col items-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Wallet size={32} className="text-gray-300"/></div><p>কোনো লেনদেন পাওয়া যায়নি</p></div>}
                </div>
             </div>
             
             <div className="flex justify-center pt-8">
                <button 
                  onClick={handleDeleteRequest} 
                  className="flex items-center space-x-2 text-red-400 hover:text-white bg-transparent hover:bg-red-500 px-6 py-3 rounded-full transition-all duration-300 font-bold text-sm border border-red-100 hover:border-red-500"
                >
                  <Trash2 size={16} />
                  <span>কর্মচারী ডিলিট করুন</span>
                </button>
             </div>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-3xl font-bold text-gray-800">সেটিংস</h2>
            <div className={`${GLASS_PANEL} rounded-[2.5rem] p-8`}>
               <div className="flex items-center gap-5 mb-10">
                   <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 border border-blue-100 shadow-sm"><Settings size={32}/></div>
                   <div>
                       <h3 className="font-bold text-xl text-gray-800">ডাটা ম্যানেজমেন্ট</h3>
                       <p className="text-sm text-gray-500 mt-1">আপনার সমস্ত ডাটা সুরক্ষিত রাখুন এবং ব্যাকআপ নিন</p>
                   </div>
               </div>
               
               <div className="grid gap-5">
                   <button onClick={exportData} className="bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700 p-6 rounded-2xl font-bold flex items-center justify-between w-full transition-all group shadow-sm hover:shadow-md">
                       <span className="flex items-center gap-4">
                           <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-100 transition-colors"><Download className="text-gray-400 group-hover:text-blue-600" size={24} /></div>
                           <span className="text-lg">ব্যাকআপ ডাউনলোড (JSON)</span>
                       </span>
                       <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-400"/>
                   </button>
                   
                   <input type="file" ref={restoreInputRef} onChange={handleImportData} accept=".json" className="hidden" />
                   <button onClick={() => restoreInputRef.current?.click()} className="bg-white hover:bg-green-50/50 border border-gray-200 hover:border-green-200 text-gray-700 hover:text-green-700 p-6 rounded-2xl font-bold flex items-center justify-between w-full transition-all group shadow-sm hover:shadow-md">
                       <span className="flex items-center gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-green-100 transition-colors"><Upload className="text-gray-400 group-hover:text-green-600" size={24} /></div>
                            <span className="text-lg">ব্যাকআপ রিস্টোর করুন</span>
                       </span>
                       <ChevronRight size={20} className="text-gray-300 group-hover:text-green-400"/>
                   </button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden Report Template for Capture */}
      {renderHiddenReport()}

      {/* FLOATING MOBILE DOCK NAVIGATION */}
      <nav className={`md:hidden fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-2xl border border-white/50 flex justify-around items-center p-2 rounded-3xl shadow-2xl shadow-gray-400/20 z-50 ring-1 ring-white/50`}>
        {[ { id: 'DASHBOARD', icon: Activity, label: 'হোম' }, { id: 'EMPLOYEES', icon: Users, label: 'স্টাফ' }, { id: 'ATTENDANCE', icon: Calendar, label: 'হাজিরা' }, { id: 'PROFILE', icon: Wallet, label: 'টাকা' } ].map((item) => (
           <button key={item.id} onClick={() => { if (item.id === 'PROFILE' && !selectedEmployee) { setView('EMPLOYEES'); } else { setView(item.id as any); } }} className={`flex flex-col items-center justify-center p-3 rounded-2xl w-16 h-16 transition-all duration-300 relative group ${view === item.id ? 'text-white -translate-y-8 shadow-xl shadow-red-500/30' : 'text-gray-400 hover:text-gray-600'}`}>
             <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${view === item.id ? GRADIENT_PRIMARY : 'bg-transparent'}`}></div>
             <item.icon size={24} className="relative z-10" strokeWidth={view === item.id ? 2.5 : 2} />
             {view === item.id && <span className="absolute -bottom-6 text-[10px] font-bold text-gray-500 whitespace-nowrap">{item.label}</span>}
           </button>
        ))}
      </nav>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-[zoomIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            {modalType !== 'DELETE_CONFIRM' && (
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-xl">
                    {modalType === 'ADD_EMPLOYEE' && 'নতুন কর্মচারী'}
                    {modalType === 'ADD_TRANSACTION' && 'টাকা জমা/খরচ'}
                    {modalType === 'CAMERA' && 'ছবি তুলুন'}
                    {modalType === 'FINGERPRINT' && 'বায়োমেট্রিক সেটআপ'}
                    {modalType === 'REPORT_FILTER' && 'রিপোর্ট ডাউনলোড'}
                    {modalType === 'FACE_VERIFICATION' && 'ফেস ভেরিফিকেশন'}
                </h3>
                <button onClick={() => { setIsModalOpen(false); if(modalType === 'CAMERA') setModalType('ADD_EMPLOYEE'); }} className="p-2 rounded-full bg-white hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition shadow-sm border border-gray-100"><X size={20} /></button>
                </div>
            )}

            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* DELETE CONFIRMATION */}
              {modalType === 'DELETE_CONFIRM' && (
                <div className="text-center pt-4">
                    <div className="bg-red-50 text-red-500 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 animate-bounce shadow-inner">
                        <AlertTriangle size={48} strokeWidth={2} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">আপনি কি নিশ্চিত?</h3>
                    <p className="text-gray-500 mb-8 text-sm px-4">এই কর্মচারীর সকল ডাটা, হাজিরা এবং হিসাব মুছে ফেলা হবে। এই কাজ ফিরে আসা যাবে না।</p>
                    <div className="flex gap-4">
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-4 rounded-2xl font-bold text-gray-700 transition">না, থাক</button>
                        <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-200 transition">হ্যাঁ, ডিলিট</button>
                    </div>
                </div>
              )}

              {/* FACE VERIFICATION */}
              {modalType === 'FACE_VERIFICATION' && (
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">কর্মচারী সিলেক্ট করুন</label>
                        <select className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 outline-none text-sm font-bold text-gray-700 focus:border-blue-400" value={faceCheckinId} onChange={e => setFaceCheckinId(e.target.value)}>
                            <option value="">-- নাম নির্বাচন করুন --</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} - {getRoleBn(e.role)}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center w-full">
                        <div className="relative w-48 h-48 rounded-3xl overflow-hidden bg-black ring-4 ring-gray-100 shadow-xl mb-4">
                            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"></video>
                            {isScanning && (
                                <div className="absolute inset-0 border-4 border-blue-500/50 animate-pulse z-10">
                                    <div className="w-full h-1 bg-blue-500 absolute top-0 animate-[scan_2s_linear_infinite] shadow-[0_0_10px_#3b82f6]"></div>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{isScanning ? 'ফেস স্ক্যান করা হচ্ছে...' : 'ক্যামেরার দিকে তাকান'}</p>
                    </div>

                    <button onClick={handleFaceCheckin} disabled={isScanning || !faceCheckinId} className={`w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed`}>
                         {isScanning ? 'যাচাই হচ্ছে...' : 'ফেস ভেরিফাই করুন'}
                    </button>
                </div>
              )}

              {/* REPORT FILTER MODAL */}
              {modalType === 'REPORT_FILTER' && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setFilterOption('DAILY')} className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${reportRange.label === 'দৈনিক' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 bg-white text-gray-600 hover:border-red-200'}`}>আজ</button>
                          <button onClick={() => setFilterOption('WEEKLY')} className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${reportRange.label === 'সাপ্তাহিক' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 bg-white text-gray-600 hover:border-red-200'}`}>এই সপ্তাহ</button>
                          <button onClick={() => setFilterOption('MONTHLY')} className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${reportRange.label === 'মাসিক' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 bg-white text-gray-600 hover:border-red-200'}`}>এই মাস</button>
                          <button className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${!['দৈনিক','সাপ্তাহিক','মাসিক'].includes(reportRange.label) ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 bg-white text-gray-600 hover:border-red-200'}`}>কাস্টম</button>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex items-center gap-3">
                              <CalendarRange size={18} className="text-gray-400"/>
                              <p className="text-xs font-bold text-gray-500 uppercase">তারিখ রেঞ্জ সিলেক্ট করুন</p>
                          </div>
                          <div className="flex gap-3">
                              <input type="date" value={reportRange.start} onChange={e => setReportRange({...reportRange, start: e.target.value, label: 'কাস্টম'})} className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 focus:border-red-400 outline-none"/>
                              <span className="self-center text-gray-400">-</span>
                              <input type="date" value={reportRange.end} onChange={e => setReportRange({...reportRange, end: e.target.value, label: 'কাস্টম'})} className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 focus:border-red-400 outline-none"/>
                          </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => handleReportAction('SHARE')} disabled={loading} className={`flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-green-200 hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2`}>
                            <Share2 size={18} /> {loading ? '...' : 'শেয়ার করুন'}
                        </button>
                        <button onClick={() => handleReportAction('DOWNLOAD')} disabled={loading} className={`flex-1 ${GRADIENT_PRIMARY} text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-200 hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2`}>
                            <Download size={18} /> {loading ? '...' : 'ডাউনলোড'}
                        </button>
                      </div>
                  </div>
              )}

              {/* ADD EMPLOYEE FORM */}
              {modalType === 'ADD_EMPLOYEE' && (
                <div className="space-y-6">
                   <div className="flex justify-center mb-4">
                     <div onClick={() => startCamera('environment')} className="group h-32 w-32 rounded-full bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer overflow-hidden hover:border-red-400 hover:bg-red-50 transition-all relative shadow-sm hover:shadow-md">
                       {newEmployee.photoUrl ? <img src={newEmployee.photoUrl} className="h-full w-full object-cover" /> : <div className="text-center text-gray-400 group-hover:text-red-400 transition-colors"><Camera size={32} className="mx-auto mb-2"/><span className="text-xs font-bold uppercase tracking-wide">ছবি দিন</span></div>}
                     </div>
                   </div>
                   
                   <div className="space-y-4">
                       <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">নাম</label>
                            <input className={`w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 font-bold text-gray-800 outline-none focus:ring-4 focus:ring-red-50 focus:border-red-400 transition ${formError && !newEmployee.name ? 'border-red-500 bg-red-50' : ''}`} placeholder="পুরো নাম লিখুন" value={newEmployee.name || ''} onChange={e => { setNewEmployee({...newEmployee, name: e.target.value}); setFormError(''); }} />
                       </div>
                       
                       <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">মোবাইল</label>
                            <input className={`w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 font-bold text-gray-800 outline-none focus:ring-4 focus:ring-red-50 focus:border-red-400 transition ${formError && !newEmployee.phone ? 'border-red-500 bg-red-50' : ''}`} type="tel" placeholder="017..." value={newEmployee.phone || ''} onChange={e => { setNewEmployee({...newEmployee, phone: e.target.value}); setFormError(''); }} />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">পদবি</label>
                            <select className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 outline-none text-sm font-bold text-gray-700 focus:border-red-400" value={newEmployee.role || ''} onChange={e => setNewEmployee({...newEmployee, role: e.target.value as EmployeeRole})}>
                                <option value="">নির্বাচন করুন</option>
                                {Object.values(EmployeeRole).map(r => <option key={r} value={r}>{getRoleBn(r)}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">বেতন টাইপ</label>
                            <select className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 outline-none text-sm font-bold text-gray-700 focus:border-red-400" value={newEmployee.salaryType || 'MONTHLY'} onChange={e => setNewEmployee({...newEmployee, salaryType: e.target.value as any})}>
                                <option value="MONTHLY">মাসিক বেতন</option>
                                <option value="WEEKLY">সাপ্তাহিক বেতন</option>
                                <option value="DAILY">দৈনিক হাজিরা</option>
                            </select>
                         </div>
                       </div>
                       <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">টাকার পরিমাণ</label>
                            <div className="relative">
                                    <span className="absolute left-4 top-4 text-gray-400 font-bold">৳</span>
                                    <input className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 pl-10 outline-none focus:ring-4 focus:ring-red-50 focus:border-red-400 transition font-bold text-gray-700" type="number" placeholder="0.00" value={newEmployee.baseSalary === undefined ? '' : newEmployee.baseSalary} onChange={e => setNewEmployee({...newEmployee, baseSalary: Number(e.target.value)})} />
                            </div>
                       </div>
                   </div>
                   
                   {formError && (
                       <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold text-center border border-red-100 flex items-center justify-center gap-2 animate-pulse">
                           <Activity size={18}/> {formError}
                       </div>
                   )}

                   <button onClick={handleAddEmployee} disabled={loading} className={`w-full ${GRADIENT_PRIMARY} text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-200 mt-4 disabled:opacity-50 flex justify-center items-center hover:brightness-110 transition-all active:scale-95`}>
                     {loading ? <RefreshCw className="animate-spin mr-2" size={20}/> : 'সেভ করুন'}
                   </button>
                </div>
              )}

              {/* CAMERA */}
              {modalType === 'CAMERA' && (
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-black rounded-3xl mb-6 overflow-hidden relative shadow-2xl flex items-center justify-center ring-4 ring-gray-100">
                    {!capturedImage && !cameraError && <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"></video>}
                    {!capturedImage && cameraError && <div className="text-white/50 flex flex-col items-center"><CameraOff size={64} className="mb-4 opacity-50"/><span className="text-sm font-medium">ক্যামেরা পাওয়া যায়নি</span></div>}
                    {capturedImage && <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover"/>}
                  </div>
                  {error && <p className="text-red-500 text-xs mb-4 text-center bg-red-50 px-3 py-1.5 rounded-lg font-bold w-full">{error}</p>}
                  <div className="flex gap-4 w-full">
                    {!capturedImage ? (
                      <>
                        <button onClick={capturePhoto} disabled={cameraError} className={`flex-1 ${GRADIENT_PRIMARY} disabled:opacity-50 disabled:grayscale text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform`}>ছবি তুলুন</button>
                        <input type="file" accept="image/*" capture="user" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 py-4 rounded-2xl font-bold text-gray-700 transition active:scale-95">আপলোড</button>
                      </>
                    ) : (
                      <button onClick={() => setCapturedImage(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-4 rounded-2xl font-bold text-gray-700 transition active:scale-95">আবার তুলুন</button>
                    )}
                  </div>
                </div>
              )}
              
              {/* FINGERPRINT */}
              {modalType === 'FINGERPRINT' && (
                <div className="text-center py-8">
                  <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 border-8 ${loading ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-50'}`}>
                    <Fingerprint size={64} className={loading ? 'animate-ping' : 'animate-pulse'} />
                  </div>
                  <h4 className="font-bold text-xl mb-3 text-gray-800">বায়োমেট্রিক স্ক্যান</h4>
                  <p className="text-gray-500 text-sm mb-10 px-6 leading-relaxed">সেন্সরে আঙুল রাখুন এবং স্ক্যান সম্পূর্ণ হওয়া পর্যন্ত অপেক্ষা করুন।</p>
                  <button onClick={() => {}} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 transition-all active:scale-95">
                    {loading ? 'যাচাই হচ্ছে...' : 'স্ক্যান শুরু করুন'}
                  </button>
                </div>
              )}

              {/* TRANSACTION FORM */}
              {modalType === 'ADD_TRANSACTION' && (
                <div className="space-y-6">
                   <div className="text-center mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">লেনদেন করছেন</p>
                      <p className="font-bold text-2xl text-gray-800">{selectedEmployee?.name}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setNewTransaction({...newTransaction, type: 'ADVANCE'})} className={`p-4 rounded-2xl text-sm font-bold transition-all ${newTransaction.type === 'ADVANCE' ? 'bg-red-600 text-white shadow-lg shadow-red-200 scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>অগ্রিম</button>
                      <button onClick={() => setNewTransaction({...newTransaction, type: 'FOOD_COST'})} className={`p-4 rounded-2xl text-sm font-bold transition-all ${newTransaction.type === 'FOOD_COST' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>খাবার</button>
                      <button onClick={() => setNewTransaction({...newTransaction, type: 'PENALTY'})} className={`p-4 rounded-2xl text-sm font-bold transition-all ${newTransaction.type === 'PENALTY' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>জরিমানা</button>
                      <button onClick={() => setNewTransaction({...newTransaction, type: 'BONUS'})} className={`p-4 rounded-2xl text-sm font-bold transition-all ${newTransaction.type === 'BONUS' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>বোনাস</button>
                   </div>
                   <div className="relative mt-2 group">
                     <span className="absolute left-6 top-5 text-gray-400 text-2xl font-bold group-focus-within:text-red-500 transition-colors">৳</span>
                     <input type="number" className="w-full bg-gray-50 rounded-3xl p-5 pl-12 text-4xl font-bold text-gray-800 border-2 border-transparent focus:border-red-500 focus:bg-white transition-all outline-none placeholder-gray-300" placeholder="0" value={newTransaction.amount || ''} onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})} />
                   </div>
                   <textarea className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-5 text-sm focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition resize-none font-medium" placeholder="কোনো মন্তব্য থাকলে লিখুন..." rows={3} value={newTransaction.note || ''} onChange={e => setNewTransaction({...newTransaction, note: e.target.value})}/>
                   <button onClick={handleAddTransaction} className={`w-full ${GRADIENT_PRIMARY} text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-200 hover:brightness-110 active:scale-95 transition-all`}>নিশ্চিত করুন</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;