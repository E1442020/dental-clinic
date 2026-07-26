import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DirectionProvider } from '@radix-ui/react-direction'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import PatientsPage from '@/pages/PatientsPage'
import PatientProfilePage from '@/pages/PatientProfilePage'
import AppointmentsPage from '@/pages/AppointmentsPage'
import DoctorsPage from '@/pages/DoctorsPage'
import BranchesPage from '@/pages/BranchesPage'
import InsurancePage from '@/pages/InsurancePage'
import BillingPage from '@/pages/BillingPage'
import NotFoundPage from '@/pages/NotFoundPage'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage />, handle: { title: 'لوحة التحكم' } },
      { path: 'patients', element: <PatientsPage />, handle: { title: 'المرضى' } },
      { path: 'patients/:id', element: <PatientProfilePage />, handle: { title: 'ملف المريض' } },
      { path: 'appointments', element: <AppointmentsPage />, handle: { title: 'المواعيد' } },
      {
        path: 'doctors',
        element: (
          <ProtectedRoute allow={['admin']}>
            <DoctorsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'الأطباء' },
      },
      {
        path: 'branches',
        element: (
          <ProtectedRoute allow={['admin']}>
            <BranchesPage />
          </ProtectedRoute>
        ),
        handle: { title: 'الفروع' },
      },
      {
        path: 'insurance',
        element: (
          <ProtectedRoute allow={['admin', 'receptionist', 'accountant']}>
            <InsurancePage />
          </ProtectedRoute>
        ),
        handle: { title: 'شركات التأمين' },
      },
      {
        path: 'billing',
        element: (
          <ProtectedRoute allow={['admin', 'accountant', 'receptionist']}>
            <BillingPage />
          </ProtectedRoute>
        ),
        handle: { title: 'الحسابات والفواتير' },
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return (
    <DirectionProvider dir="rtl">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </DirectionProvider>
  )
}
