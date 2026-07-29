import type { UserRole } from "@/types/database";

export const roleLabels: Record<UserRole, string> = {
  admin: "مدير العيادة",
  doctor: "دكتور",
  receptionist: "ريسبشن",
  accountant: "محاسب",
};

export const appointmentStatusLabels: Record<string, string> = {
  booked: "محجوز",
  completed: "تم",
  cancelled: "ملغي",
  no_show: "غياب",
};

export const toothStatusLabels: Record<string, string> = {
  healthy: "سليمة",
  filled: "محشوة",
  extracted: "مخلوعة",
  crowned: "تركيبة",
  needs_treatment: "تحتاج علاج",
  root_canal: "عصب",
  implant: "زراعة",
};

export const invoiceStatusLabels: Record<string, string> = {
  unpaid: "غير مدفوعة",
  partial: "مدفوعة جزئيًا",
  paid: "مدفوعة بالكامل",
};

export const claimStatusLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليها",
  rejected: "مرفوضة",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "نقدًا",
  card: "بطاقة",
  installment: "تقسيط",
  insurance: "تأمين",
  transfer: "تحويل",
};
