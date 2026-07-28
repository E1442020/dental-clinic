import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Phone, ChevronRight, ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { usePatients, PATIENTS_PAGE_SIZE } from '@/features/patients/api'
import { PatientForm } from '@/features/patients/PatientForm'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatDate } from '@/lib/utils'

export default function PatientsPage() {
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [page, setPage] = React.useState(0)
  const [formOpen, setFormOpen] = React.useState(false)
  const { data, isLoading } = usePatients(debouncedSearch, page)
  const navigate = useNavigate()

  const patients = data?.patients ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PATIENTS_PAGE_SIZE))

  React.useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف أو الرقم القومي..."
            className="ps-9"
          />
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          إضافة مريض
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={4}>جارٍ التحميل...</TableEmpty>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <TableCell className="font-semibold">{patient.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5" dir="ltr">
                      <Phone className="size-3.5" />
                      {patient.phone}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(patient.created_at)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={4}>لا يوجد مرضى مطابقون للبحث</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      {!isLoading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            إجمالي {totalCount} مريض · صفحة {page + 1} من {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="size-4" />
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <PatientForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
