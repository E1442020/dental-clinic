-- ============================================================================
-- Adds appointments for a specific day: Monday 2026-07-27.
-- Uses the doctors/patients/branches already created by seed_demo_data.sql
-- (looked up by name, nothing duplicated). Skips د. ياسمين كمال — she
-- doesn't work Mondays per her working_days. Time slots (xx:45 / xx:15) are
-- deliberately off the seed scripts' own grid (xx:00 / xx:30), so this can't
-- collide with any appointment they already placed on this date.
-- ============================================================================

do $$
declare
  v_branch1 uuid;
  v_branch2 uuid;
  v_doctor1 uuid; -- د. محمد الشريف
  v_doctor2 uuid; -- د. سارة عبد الوهاب
  v_doctor3 uuid; -- د. أحمد فتحي
  v_patients uuid[];
  target_date date := '2026-07-27';
begin
  select id into v_branch1 from branches where name = 'الفرع الرئيسي - المهندسين';
  select id into v_branch2 from branches where name = 'فرع مدينة نصر';
  select id into v_doctor1 from doctors where full_name = 'د. محمد الشريف';
  select id into v_doctor2 from doctors where full_name = 'د. سارة عبد الوهاب';
  select id into v_doctor3 from doctors where full_name = 'د. أحمد فتحي';

  select array_agg(p.id order by n.ord) into v_patients
  from unnest(array[
    'محمود سعيد','فاطمة الزهراء','عمر خالد','نور الهدى','كريم عادل',
    'منى إبراهيم','يوسف حسن','هبة الله طارق','مصطفى جمال'
  ]) with ordinality as n(name, ord)
  join patients p on p.full_name = n.name;

  if v_branch1 is null or v_doctor1 is null or v_doctor2 is null or v_doctor3 is null or v_patients is null then
    raise exception 'Seed data not found — run seed_demo_data.sql first.';
  end if;

  insert into appointments (patient_id, doctor_id, branch_id, appointment_date, start_time, end_time, status, reason)
  values
    (v_patients[1], v_doctor1, v_branch1, target_date, '10:45', '11:15', 'booked', 'كشف'),
    (v_patients[2], v_doctor1, v_branch1, target_date, '12:15', '12:45', 'booked', 'حشو'),
    (v_patients[3], v_doctor1, v_branch2, target_date, '16:15', '16:45', 'booked', 'تنظيف'),

    (v_patients[4], v_doctor2, v_branch2, target_date, '12:15', '12:45', 'booked', 'متابعة تقويم'),
    (v_patients[5], v_doctor2, v_branch2, target_date, '14:15', '14:45', 'booked', 'كشف'),
    (v_patients[6], v_doctor2, v_branch1, target_date, '17:45', '18:15', 'booked', 'تركيب'),

    (v_patients[7], v_doctor3, v_branch1, target_date, '09:15', '09:45', 'booked', 'خلع'),
    (v_patients[8], v_doctor3, v_branch1, target_date, '12:15', '12:45', 'booked', 'كشف'),
    (v_patients[9], v_doctor3, v_branch2, target_date, '14:15', '14:45', 'booked', 'عصب');

  raise notice 'Added 9 appointments for %', target_date;
end $$;
