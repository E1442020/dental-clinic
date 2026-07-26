import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useBranches, useCreateBranch } from '@/features/branches/api'
import { toast } from '@/hooks/use-toast'

interface FormValues {
  name: string
  address: string
  phone: string
}

export default function BranchesPage() {
  const { data: branches, isLoading } = useBranches()
  const createBranch = useCreateBranch()
  const [open, setOpen] = React.useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    try {
      await createBranch.mutateAsync(values)
      toast({ title: 'تم إضافة الفرع', variant: 'success' })
      reset()
      setOpen(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          إضافة فرع
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches?.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-2 pt-5">
                <p className="font-bold">{b.name}</p>
                {b.address && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {b.address}
                  </p>
                )}
                {b.phone && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span dir="ltr">{b.phone}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {branches?.length === 0 && <p className="text-muted-foreground">لا توجد فروع بعد</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة فرع جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">اسم الفرع</Label>
              <Input id="name" {...register('name', { required: 'اسم الفرع مطلوب' })} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="address">العنوان</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div>
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" ltr {...register('phone')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
