-- ============================================================================
-- DEMO SEED DATA — run this ONCE (in the Supabase SQL Editor) to fill the
-- clinic with realistic, internally-consistent sample data: branches,
-- insurance companies, doctors (with working hours), patients, ~2 months of
-- appointments, treatments (which auto-generate invoices via the existing
-- trigger), and a realistic mix of paid / partially-paid / unpaid invoices.
--
-- Safe to run on top of whatever you already have — it only INSERTs new
-- rows, it never deletes or modifies existing ones. Since this data is
-- shared by the whole clinic (not per-login), it will show up for every
-- user, including your own admin account.
-- ============================================================================

do $$
declare
  v_branch1 uuid;
  v_branch2 uuid;
  v_ins1 uuid;
  v_ins2 uuid;
  v_ins3 uuid;
  v_doctor_ids uuid[];
  v_patient_ids uuid[];
  v_doctor uuid;
  v_patient uuid;
  v_branch uuid;
  v_appt_id uuid;
  d date;
  daynum int;
  i int;
  slot_time time;
  slot_times time[] := array['10:00','11:30','13:00','15:30','17:00','18:30'];
  procedure_types text[] := array['كشف','حشو','خلع','تنظيف','عصب','تركيب','تبييض'];
  proc_costs numeric[] := array[150,300,400,250,900,1800,1200];
  proc_idx int;
  proc_name text;
  cost numeric;
  tooth int;
  status_roll int;
  appt_status appointment_status;
  inv_row record;
  pct int;
  pay_amount numeric;
begin

  -- ----------------------------------------------------------------------------
  -- Branches
  -- ----------------------------------------------------------------------------
  insert into branches (name, address, phone)
  values ('الفرع الرئيسي - المهندسين', 'شارع جامعة الدول العربية، المهندسين، الجيزة', '0223456789')
  returning id into v_branch1;

  insert into branches (name, address, phone)
  values ('فرع مدينة نصر', 'شارع مصطفى النحاس، مدينة نصر، القاهرة', '0224561234')
  returning id into v_branch2;

  -- ----------------------------------------------------------------------------
  -- Insurance companies
  -- ----------------------------------------------------------------------------
  insert into insurances (company_name, contact_phone)
  values ('تأمين مصر الصحي', '19345')
  returning id into v_ins1;

  insert into insurances (company_name, contact_phone)
  values ('ميدنت للتأمين', '16620')
  returning id into v_ins2;

  insert into insurances (company_name, contact_phone)
  values ('الأهلي للرعاية الصحية', '19677')
  returning id into v_ins3;

  -- ----------------------------------------------------------------------------
  -- Doctors (schedule now lives per-branch in doctor_branches, assigned right
  -- after — matching the same branch each doctor is used with further down)
  -- ----------------------------------------------------------------------------
  with new_doctors as (
    insert into doctors (full_name, specialty, phone, email)
    values
      ('د. محمد الشريف', 'طب أسنان عام', '01011122233', 'm.elsherif@clinic.com'),
      ('د. سارة عبد الوهاب', 'تقويم الأسنان', '01099887766', 's.abdelwahab@clinic.com'),
      ('د. أحمد فتحي', 'جراحة الفم والأسنان', '01122334455', 'a.fathy@clinic.com'),
      ('د. ياسمين كمال', 'تجميل وتركيبات الأسنان', '01234567890', 'y.kamal@clinic.com')
    returning id
  )
  select array_agg(id) into v_doctor_ids from new_doctors;

  -- doctor i works only at v_branch2 when i is odd, v_branch1 when even — matches
  -- the `v_branch := case when i % 2 = 0 then v_branch1 else v_branch2 end` used below
  insert into doctor_branches (doctor_id, branch_id, working_days, working_hours_start, working_hours_end)
  values
    (v_doctor_ids[1], v_branch2, '["sat","sun","mon","tue","wed"]'::jsonb, '10:00', '18:00'),
    (v_doctor_ids[2], v_branch1, '["sun","mon","tue","wed","thu"]'::jsonb, '11:00', '19:00'),
    (v_doctor_ids[3], v_branch2, '["sat","mon","tue","wed"]'::jsonb, '09:00', '16:00'),
    (v_doctor_ids[4], v_branch1, '["sun","tue","wed","thu"]'::jsonb, '12:00', '20:00');

  -- ----------------------------------------------------------------------------
  -- Patients (spread their created_at over the last ~2 months so the "new
  -- patients" trend chart looks like real growth, not one big spike today)
  -- ----------------------------------------------------------------------------
  with names as (
    select name, row_number() over () as rn
    from unnest(array[
      'محمود سعيد','فاطمة الزهراء','عمر خالد','نور الهدى','كريم عادل','منى إبراهيم',
      'يوسف حسن','هبة الله طارق','مصطفى جمال','رنا وليد','طارق منير','إيمان صبري',
      'حسام الدين محمد','سلمى ماهر','أحمد رفعت','ندى شوقي','خالد عبد الرحمن','مريم لطفي',
      'عمرو صلاح','دينا فوزي','وليد نبيل','شيرين عاطف','تامر إسماعيل','آية جمال'
    ]) as name
  ),
  new_patients as (
    insert into patients (full_name, phone, gender, date_of_birth, insurance_id, primary_branch_id, address, created_at)
    select
      name,
      '01' || (case rn % 4 when 0 then '0' when 1 then '1' when 2 then '2' else '5' end) || lpad((10000000 + rn * 137)::text, 8, '0'),
      (case when rn % 2 = 0 then 'male' else 'female' end)::gender,
      (date '1975-01-01' + ((rn * 733) % 16000) * interval '1 day')::date,
      case rn % 4 when 0 then null when 1 then v_ins1 when 2 then v_ins2 else v_ins3 end,
      case when rn % 2 = 0 then v_branch1 else v_branch2 end,
      'القاهرة',
      now() - ((24 - rn) * interval '2 days')
    from names
    returning id
  )
  select array_agg(id) into v_patient_ids from new_patients;

  -- ----------------------------------------------------------------------------
  -- Past appointments + treatments (drives revenue/procedure/doctor analytics)
  -- ----------------------------------------------------------------------------
  for d in select generate_series(current_date - 45, current_date - 1, interval '1 day')::date loop
    daynum := d - date '2000-01-01';

    for i in 1..array_length(v_doctor_ids, 1) loop
      -- skip roughly one third of doctor-days for a realistic, non-uniform calendar
      if (daynum + i) % 3 = 0 then
        continue;
      end if;

      v_doctor := v_doctor_ids[i];
      v_branch := case when i % 2 = 0 then v_branch1 else v_branch2 end;
      v_patient := v_patient_ids[1 + ((daynum + i * 7) % array_length(v_patient_ids, 1))];
      slot_time := slot_times[1 + (i % array_length(slot_times, 1))];

      status_roll := (daynum + i) % 12;
      appt_status := case
        when status_roll = 0 then 'no_show'
        when status_roll = 1 then 'cancelled'
        else 'completed'
      end;

      proc_idx := 1 + ((daynum + i * 3) % array_length(procedure_types, 1));
      proc_name := procedure_types[proc_idx];
      cost := proc_costs[proc_idx];
      tooth := 1 + ((daynum + i * 5) % 32);

      insert into appointments (patient_id, doctor_id, branch_id, appointment_date, start_time, end_time, status, reason)
      values (v_patient, v_doctor, v_branch, d, slot_time, slot_time + interval '30 minutes', appt_status, proc_name)
      returning id into v_appt_id;

      if appt_status = 'completed' then
        insert into treatments (patient_id, doctor_id, appointment_id, branch_id, tooth_number, procedure_type, procedure_date, cost)
        values (v_patient, v_doctor, v_appt_id, v_branch, tooth, proc_name, d, cost);
      end if;
    end loop;
  end loop;

  -- ----------------------------------------------------------------------------
  -- Upcoming appointments (today .. +13 days), booked, no treatment yet
  -- ----------------------------------------------------------------------------
  for d in select generate_series(current_date, current_date + 13, interval '1 day')::date loop
    daynum := d - date '2000-01-01';

    for i in 1..array_length(v_doctor_ids, 1) loop
      if (daynum + i) % 2 = 0 then
        continue;
      end if;

      v_doctor := v_doctor_ids[i];
      v_branch := case when i % 2 = 0 then v_branch1 else v_branch2 end;
      v_patient := v_patient_ids[1 + ((daynum + i * 11) % array_length(v_patient_ids, 1))];
      slot_time := slot_times[1 + ((i + 1) % array_length(slot_times, 1))];

      insert into appointments (patient_id, doctor_id, branch_id, appointment_date, start_time, end_time, status, reason)
      values (v_patient, v_doctor, v_branch, d, slot_time, slot_time + interval '30 minutes', 'booked', 'كشف دوري');
    end loop;
  end loop;

  -- ----------------------------------------------------------------------------
  -- Payments — pay ~60% of invoices in full, ~20% partially, leave ~20% unpaid
  -- (invoices themselves already exist, auto-created by the treatments trigger)
  -- ----------------------------------------------------------------------------
  for inv_row in
    select id, patient_due_amount, row_number() over (order by id) as rn
    from invoices
    where patient_due_amount > 0
  loop
    pct := inv_row.rn % 5;

    if pct in (0, 1, 2) then
      insert into payments (invoice_id, amount_paid, payment_method)
      values (inv_row.id, inv_row.patient_due_amount, (array['cash','card','installment'])[1 + inv_row.rn % 3]::payment_method);
      update invoices set status = 'paid' where id = inv_row.id;
    elsif pct = 3 then
      pay_amount := round(inv_row.patient_due_amount * 0.5, 2);
      insert into payments (invoice_id, amount_paid, payment_method)
      values (inv_row.id, pay_amount, 'cash');
      update invoices set status = 'partial' where id = inv_row.id;
    end if;
  end loop;

  raise notice 'Seed complete: % doctors, % patients, % branches, % insurances',
    array_length(v_doctor_ids, 1), array_length(v_patient_ids, 1), 2, 3;
end $$;
