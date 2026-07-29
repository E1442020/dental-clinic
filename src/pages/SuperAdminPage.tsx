import * as React from "react";
import { Plus, Pencil, Power, PowerOff, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, cn } from "@/lib/utils";
import {
  useAllClinics,
  useUpdateClinicDetails,
  useSetUserActive,
  useCreateClinicBySuperAdmin,
  type ClinicWithUsers,
} from "@/features/clinics/superadmin-api";
import { toast } from "@/hooks/use-toast";
import type { Clinic } from "@/types/database";

type StatusKey = "active" | "trial" | "expired" | "disabled";

const statusLabels: Record<StatusKey, string> = {
  active: "نشط",
  trial: "تجريبي",
  expired: "منتهي",
  disabled: "معطل",
};

const statusVariant: Record<
  StatusKey,
  "success" | "warning" | "destructive" | "muted"
> = {
  active: "success",
  trial: "warning",
  expired: "destructive",
  disabled: "muted",
};

function clinicStatus(clinic: Clinic): StatusKey {
  if (!clinic.is_active) return "disabled";
  const subscriptionActive =
    !!clinic.subscription_ends_at &&
    new Date(clinic.subscription_ends_at).getTime() > Date.now();
  if (subscriptionActive) return "active";
  if (!clinic.trial_ends_at) return "active";
  return new Date(clinic.trial_ends_at).getTime() > Date.now()
    ? "trial"
    : "expired";
}

function daysRemaining(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function relativeArabic(iso: string | null) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return `منذ ${Math.floor(diffHours / 24)} يوم`;
}

/** yyyy-mm-dd (for a date input) from a timestamptz, or '' when null. */
function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

/** End-of-day ISO timestamp from a yyyy-mm-dd date input value, or null when empty. */
function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

export default function SuperAdminPage() {
  const { data: clinics, isLoading } = useAllClinics();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusKey | "all">(
    "all",
  );
  const [editTarget, setEditTarget] = React.useState<ClinicWithUsers | null>(
    null,
  );
  const [addOpen, setAddOpen] = React.useState(false);
  const setUserActive = useSetUserActive();

  const filtered = React.useMemo(() => {
    if (!clinics) return [];
    const q = search.trim().toLowerCase();
    return clinics.filter((clinic) => {
      if (statusFilter !== "all" && clinicStatus(clinic) !== statusFilter)
        return false;
      if (!q) return true;
      const admin = clinic.users.find((u) => u.role === "admin");
      return (
        clinic.name.toLowerCase().includes(q) ||
        admin?.full_name.toLowerCase().includes(q) ||
        admin?.email.toLowerCase().includes(q)
      );
    });
  }, [clinics, search, statusFilter]);

  const counts = React.useMemo(() => {
    const base: Record<StatusKey, number> = {
      active: 0,
      trial: 0,
      expired: 0,
      disabled: 0,
    };
    clinics?.forEach((clinic) => {
      base[clinicStatus(clinic)] += 1;
    });
    return base;
  }, [clinics]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          كل العيادات المسجّلة في النظام
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          عيادة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="إجمالي العيادات" value={clinics?.length ?? 0} />
        <StatCard label="نشط" value={counts.active} className="text-success" />
        <StatCard
          label="تجريبي"
          value={counts.trial}
          className="text-warning"
        />
        <StatCard
          label="منتهي"
          value={counts.expired}
          className="text-destructive"
        />
        <StatCard
          label="معطل"
          value={counts.disabled}
          className="text-muted-foreground"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "active", "trial", "expired", "disabled"] as const).map(
            (key) => (
              <Button
                key={key}
                size="sm"
                variant={statusFilter === key ? "default" : "outline"}
                onClick={() => setStatusFilter(key)}
              >
                {key === "all" ? "الكل" : statusLabels[key]}
              </Button>
            ),
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute inset-e-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحثي باسم العيادة..."
            className="pe-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">
            جارٍ التحميل...
          </p>
        ) : filtered.length > 0 ? (
          filtered.map((clinic) => {
            const admin = clinic.users.find((u) => u.role === "admin");
            const status = clinicStatus(clinic);
            return (
              <Card key={clinic.id}>
                <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {clinic.name[0]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{clinic.name}</p>
                        <Badge variant={statusVariant[status]}>
                          {statusLabels[status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {admin?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {admin?.email ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:items-end">
                    <p>انضم: {formatDate(clinic.created_at)}</p>
                    {clinic.subscription_ends_at ? (
                      <p>
                        ينتهي الاشتراك:{" "}
                        {formatDate(clinic.subscription_ends_at)}
                      </p>
                    ) : clinic.trial_ends_at ? (
                      <p>
                        {status === "expired" ? (
                          <>انتهت التجربة: {formatDate(clinic.trial_ends_at)}</>
                        ) : (
                          <>
                            تنتهي التجربة: {formatDate(clinic.trial_ends_at)}{" "}
                            (باقي{" "}
                            <span className="font-semibold text-warning">
                              {daysRemaining(clinic.trial_ends_at)}
                            </span>{" "}
                            يوم)
                          </>
                        )}
                      </p>
                    ) : (
                      <p>اشتراك غير محدود</p>
                    )}
                    <p>
                      آخر ظهور: {relativeArabic(admin?.last_seen_at ?? null)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditTarget(clinic)}
                    >
                      <Pencil className="size-4" />
                      تعديل
                    </Button>
                    {admin && (
                      <Button
                        size="sm"
                        variant={admin.is_active ? "destructive" : "outline"}
                        onClick={() =>
                          setUserActive.mutate({
                            userId: admin.id,
                            isActive: !admin.is_active,
                          })
                        }
                      >
                        {admin.is_active ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        {admin.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="p-8 text-center text-muted-foreground">
            لا توجد عيادات مطابقة
          </p>
        )}
      </div>

      <EditClinicDialog
        clinic={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <AddClinicDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className={cn("text-2xl font-bold", className)}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EditClinicDialog({
  clinic,
  onOpenChange,
}: {
  clinic: ClinicWithUsers | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateDetails = useUpdateClinicDetails();
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [trialEndsAt, setTrialEndsAt] = React.useState("");
  const [subscriptionEndsAt, setSubscriptionEndsAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (clinic) {
      setName(clinic.name);
      setIsActive(clinic.is_active);
      setTrialEndsAt(toDateInputValue(clinic.trial_ends_at));
      setSubscriptionEndsAt(toDateInputValue(clinic.subscription_ends_at));
      setNotes(clinic.notes ?? "");
    }
  }, [clinic]);

  async function handleSave() {
    if (!clinic) return;
    try {
      await updateDetails.mutateAsync({
        clinicId: clinic.id,
        name,
        isActive,
        trialEndsAt: fromDateInputValue(trialEndsAt),
        subscriptionEndsAt: fromDateInputValue(subscriptionEndsAt),
        notes: notes || null,
      });
      toast({ title: "تم حفظ التعديلات", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "حدث خطأ",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  const admin = clinic?.users.find((u) => u.role === "admin");

  return (
    <Dialog open={!!clinic} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل اشتراك العيادة</DialogTitle>
          <DialogDescription dir="ltr">{admin?.email}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="clinic_name">اسم العيادة</Label>
            <Input
              id="clinic_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">حالة الحساب</span>
            <Button
              size="sm"
              variant={isActive ? "default" : "destructive"}
              onClick={() => setIsActive((v) => !v)}
            >
              {isActive ? "مفعل" : "معطل"}
            </Button>
          </div>

          <div>
            <Label htmlFor="subscription_ends_at">
              تاريخ انتهاء الاشتراك (اختياري)
            </Label>
            <Input
              id="subscription_ends_at"
              type="date"
              value={subscriptionEndsAt}
              onChange={(e) => setSubscriptionEndsAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              اتركه فارغًا لو مفيش اشتراك مدفوع بتاريخ محدد
            </p>
          </div>

          <div>
            <Label htmlFor="trial_ends_at">تاريخ انتهاء الفترة التجريبية</Label>
            <Input
              id="trial_ends_at"
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              تُستخدم فقط إذا لم يكن هناك اشتراك مدفوع — اتركها فارغة لحساب غير
              محدود
            </p>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="مثال: دفع عن طريق فودافون كاش يوليو 2026..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={updateDetails.isPending}>
            {updateDetails.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddClinicDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createClinic = useCreateClinicBySuperAdmin();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isTrial, setIsTrial] = React.useState(true);
  const [trialDays, setTrialDays] = React.useState("7");
  const [subscriptionEndsAt, setSubscriptionEndsAt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setPassword("");
    setIsTrial(true);
    setTrialDays("7");
    setSubscriptionEndsAt("");
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("من فضلك أدخلي كل البيانات");
      return;
    }
    try {
      await createClinic.mutateAsync({
        full_name: fullName,
        email,
        password,
        trial_days: isTrial ? Number(trialDays) || 7 : null,
        subscription_ends_at: fromDateInputValue(subscriptionEndsAt),
      });
      toast({ title: "تم إنشاء العيادة بنجاح", variant: "success" });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة عيادة جديدة</DialogTitle>
          <DialogDescription>
            سيتم إنشاء حساب مدير للعيادة مباشرةً — احفظ كلمة المرور لمشاركتها
            معه
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="add_full_name">الاسم الكامل</Label>
            <Input
              id="add_full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add_email">البريد الإلكتروني</Label>
            <Input
              id="add_email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add_password">كلمة المرور</Label>
            <Input
              id="add_password"
              type="text"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">فترة تجريبية مجانية</span>
              <Button
                size="sm"
                variant={isTrial ? "default" : "outline"}
                onClick={() => setIsTrial((v) => !v)}
              >
                {isTrial ? "مفعّلة" : "غير مفعّلة"}
              </Button>
            </div>
            {isTrial && (
              <div className="mt-3">
                <Label htmlFor="trial_days">عدد الأيام</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min={1}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                />
              </div>
            )}
            {!isTrial && (
              <p className="mt-2 text-xs text-muted-foreground">
                حساب دائم — بدون حد أقصى للفترة التجريبية
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="add_subscription_ends_at">
              تاريخ انتهاء الاشتراك (اختياري)
            </Label>
            <Input
              id="add_subscription_ends_at"
              type="date"
              value={subscriptionEndsAt}
              onChange={(e) => setSubscriptionEndsAt(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleCreate} disabled={createClinic.isPending}>
            {createClinic.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
