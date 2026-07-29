import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DirectionProvider } from '@radix-ui/react-direction'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const PatientsPage = lazy(() => import('@/pages/PatientsPage'))
const PatientProfilePage = lazy(() => import('@/pages/PatientProfilePage'))
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'))
const DoctorsPage = lazy(() => import('@/pages/DoctorsPage'))
const BranchesPage = lazy(() => import('@/pages/BranchesPage'))
const InsurancePage = lazy(() => import('@/pages/InsurancePage'))
const BillingPage = lazy(() => import('@/pages/BillingPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const StaffPage = lazy(() => import('@/pages/StaffPage'))
const SuperAdminPage = lazy(() => import('@/pages/SuperAdminPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
})

function PageFallback() {
  return <p className="p-8 text-center text-muted-foreground">جارٍ التحميل...</p>
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
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
      { path: 'profile', element: <ProfilePage />, handle: { title: 'الملف الشخصي' } },
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
      {
        path: 'staff',
        element: (
          <ProtectedRoute allow={['admin']}>
            <StaffPage />
          </ProtectedRoute>
        ),
        handle: { title: 'الموظفون' },
      },
      {
        path: 'super-admin',
        element: (
          <ProtectedRoute requireSuperAdmin>
            <SuperAdminPage />
          </ProtectedRoute>
        ),
        handle: { title: 'إدارة العيادات' },
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
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
