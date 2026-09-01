import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/Header';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';

function AppContent() {
  const { activeRole } = useApp();
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <Header />
      {activeRole === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
