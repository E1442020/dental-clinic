# نظام إدارة عيادة الأسنان

تطبيق React (Vite) + Supabase لإدارة ملفات المرضى، المواعيد، الخريطة السنية، شركات التأمين، والحسابات — لعيادة واحدة بعدة فروع.

## المكدس التقني

- **الواجهة:** React + TypeScript + Vite, Tailwind CSS v4, Radix UI, React Router, TanStack Query, React Hook Form + Zod
- **الخلفية/قاعدة البيانات:** Supabase (Postgres + Auth + Row Level Security)
- **الاستضافة:** Vercel

## 1) إعداد Supabase

1. أنشئ مشروعًا جديدًا على [supabase.com](https://supabase.com).
2. من **SQL Editor**، شغّل الملفين بالترتيب:
   - `supabase/migrations/0001_init.sql` (الجداول والعلاقات)
   - `supabase/migrations/0002_rls.sql` (صلاحيات الأدوار Row Level Security)
3. من **Project Settings → API** انسخ `Project URL` و `anon public key`.

### إنشاء أول مستخدم Admin (خطوة يدوية لمرة واحدة)

لأن صلاحيات RLS تمنع أي حساب غير Admin من إنشاء مستخدمين، أول حساب لازم يتضاف يدويًا:

1. من **Authentication → Users** في لوحة Supabase، أنشئ مستخدمًا بالبريد الإلكتروني وكلمة المرور.
2. من **SQL Editor** نفّذ (استبدل القيم المناسبة):

```sql
insert into public.branches (name) values ('الفرع الرئيسي');

insert into public.users (id, full_name, email, role, branch_id)
values (
  '<UUID الخاص بالمستخدم من Authentication → Users>',
  'اسمك هنا',
  'the-email-you-used@example.com',
  'admin',
  null -- الأدمن يشوف كل الفروع
);
```

بعد كده تقدر تسجّل الدخول بنفس البيانات، وتضيف باقي المستخدمين (دكاترة/ريسبشن/محاسب) من نفس الطريقة، أو تبني شاشة إدارة مستخدمين لاحقًا (تحتاج Supabase Service Role Key من السيرفر، مش من المتصفح).

## 2) تشغيل المشروع محليًا

```bash
npm install
cp .env.example .env.local   # وعبّي فيه بيانات Supabase
npm run dev
```

## 3) النشر على Vercel

1. ادفع المشروع إلى GitHub.
2. من Vercel: **Import Project** → اختر الريبو.
3. Framework Preset: **Vite**.
4. أضف Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## الأدوار والصلاحيات

| الدور | الصلاحيات |
|---|---|
| `admin` | كل شيء + كل الفروع + إدارة الأطباء/الفروع/شركات التأمين |
| `doctor` | الملف الطبي الكامل (الخريطة السنية، العلاجات)، المواعيد، المرضى |
| `receptionist` | المرضى (بدون التفاصيل الطبية)، المواعيد، الحسابات — مقيّد بفرعه |
| `accountant` | الفواتير والمدفوعات والتقارير المالية |

**ملاحظة أمنية:** حقلي `medical_history` و `allergies` في جدول `patients` مموّهان في واجهة الريسبشن على مستوى التطبيق فقط (الأعمدة نفسها ليست محمية على مستوى قاعدة البيانات لأن RLS في Postgres يعمل على مستوى الصف وليس العمود). لو محتاج ضمان أقوى على مستوى القاعدة، الخطوة التالية هي عمل RPC function بصلاحيات security definer تُرجع فقط الأعمدة المسموح بها حسب الدور.

## هيكل المشروع

```
src/
  components/ui/       مكوّنات واجهة عامة (Button, Input, Dialog, Table...)
  components/layout/   الهيكل العام (Sidebar, Topbar, AppLayout)
  features/            كل ميزة في مجلدها (api.ts + مكوّنات الفورم)
  pages/               صفحات مربوطة بالراوتر
  lib/                 supabase client, utils, roles labels
  types/database.ts    أنواع TypeScript مطابقة لمخطط القاعدة
supabase/migrations/   ملفات SQL
```

## الحالة الحالية / لسه ناقص

تم بناء: تسجيل الدخول والصلاحيات، إدارة المرضى، المواعيد (مع منع تعارض الحجز تلقائيًا من القاعدة)، الخريطة السنية التفاعلية، العلاجات، الفواتير والمدفوعات الأساسية، إدارة الأطباء/الفروع/شركات التأمين.

لسه محتاج (حسب الأولوية المقترحة):
- تذكير مواعيد تلقائي (واتساب/SMS) — يحتاج تكامل مع خدمة خارجية (Twilio/WhatsApp Business API) عبر Supabase Edge Function.
- مطالبات التأمين (insurance_claims) — الجدول جاهز في القاعدة، الواجهة لسه مش مبنية.
- تقارير Admin التفصيلية (أداء الأطباء، أكثر العلاجات طلبًا).
- رفع صور الأشعة/قبل وبعد العلاج (Supabase Storage).
- بوابة مريض (اختياري من المستقبل).
