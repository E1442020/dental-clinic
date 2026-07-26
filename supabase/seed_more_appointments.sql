-- ============================================================================
-- ADD MORE APPOINTMENTS — tops up the daily schedule so each doctor has
-- ~3 appointments/day instead of 1, using the branches/doctors/patients that
-- seed_demo_data.sql already created (looked up by name, nothing re-created,
-- nothing duplicated). Safe to run once on top of the existing seed.
--
-- Picks two extra time slots per doctor that the original seed never used
-- for that loop, so there's no risk of double-booking the same doctor at
-- the same time. New completed treatments auto-generate their own invoice
-- via the existing trigger; a payment pass at the end only touches invoices
-- that don't have a payment yet, so already-settled invoices are untouched.
-- ============================================================================

do $$
declare
  v_branch1 uuid;
  v_branch2 uuid;
  v_doctor_ids uuid[];
  v_patient_ids uuid[];
  v_doctor uuid;
  v_patient uuid;
  v_branch uuid;
  v_appt_id uuid;
  d date;
  daynum int;
  i int;
  extra_idx int;
  slot_time time;
  slot_times time[] := array['10:00','11:30','13:00','15:30','17:00','18:30'];
  past_extra_indexes int[] := array[1, 6];   -- unused by the original past-loop
  future_extra_indexes int[] := array[1, 2]; -- unused by the original future-loop
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
  added_count int := 0;
begin
  select id into v_branch1 from branches where name = 'الفرع الرئيسي - المهندسين';
  select id into v_branch2 from branches where name = 'فرع مدينة نصر';

  select array_agg(d.id order by n.ord) into v_doctor_ids
  from unnest(array['د. محمد الشريف','د. سارة عبد الوهاب','د. أحمد فتحي','د. ياسمين كمال']) with ordinality as n(name, ord)
  join doctors d on d.full_name = n.name;

  select array_agg(p.id order by n.ord) into v_patient_ids
  from unnest(array[
    'محمود سعيد','فاطمة الزهراء','عمر خالد','نور الهدى','كريم عادل','منى إبراهيم',
    'يوسف حسن','هبة الله طارق','مصطفى جمال','رنا وليد','طارق منير','إيمان صبري',
    'حسام الدين محمد','سلمى ماهر','أحمد رفعت','ندى شوقي','خالد عبد الرحمن','مريم لطفي',
    'عمرو صلاح','دينا فوزي','وليد نبيل','شيرين عاطف','تامر إسماعيل','آية جمال'
  ]) with ordinality as n(name, ord)
  join patients p on p.full_name = n.name;

  if v_branch1 is null or v_doctor_ids is null or v_patient_ids is null then
    raise exception 'Seed data not found — run seed_demo_data.sql first.';
  end if;

  -- ----------------------------------------------------------------------------
  -- Extra past appointments (last 45 days), 2 more per doctor per active day
  -- ----------------------------------------------------------------------------
  for d in select generate_series(current_date - 45, current_date - 1, interval '1 day')::date loop
    daynum := d - date '2000-01-01';

    for i in 1..array_length(v_doctor_ids, 1) loop
      if (daynum + i) % 3 = 0 then
        continue;
      end if;

      v_doctor := v_doctor_ids[i];
      v_branch := case when i % 2 = 0 then v_branch1 else v_branch2 end;

      foreach extra_idx in array past_extra_indexes loop
        v_patient := v_patient_ids[1 + ((daynum + i * 13 + extra_idx * 17) % array_length(v_patient_ids, 1))];
        slot_time := slot_times[extra_idx];

        status_roll := (daynum + i + extra_idx) % 12;
        appt_status := case
          when status_roll = 0 then 'no_show'
          when status_roll = 1 then 'cancelled'
          else 'completed'
        end;

        proc_idx := 1 + ((daynum + i * 3 + extra_idx) % array_length(procedure_types, 1));
        proc_name := procedure_types[proc_idx];
        cost := proc_costs[proc_idx];
        tooth := 1 + ((daynum + i * 5 + extra_idx) % 32);

        insert into appointments (patient_id, doctor_id, branch_id, appointment_date, start_time, end_time, status, reason)
        values (v_patient, v_doctor, v_branch, d, slot_time, slot_time + interval '30 minutes', appt_status, proc_name)
        returning id into v_appt_id;

        added_count := added_count + 1;

        if appt_status = 'completed' then
          insert into treatments (patient_id, doctor_id, appointment_id, branch_id, tooth_number, procedure_type, procedure_date, cost)
          values (v_patient, v_doctor, v_appt_id, v_branch, tooth, proc_name, d, cost);
        end if;
      end loop;
    end loop;
  end loop;

  -- ----------------------------------------------------------------------------
  -- Extra upcoming appointments (today .. +13 days), booked, no treatment yet
  -- ----------------------------------------------------------------------------
  for d in select generate_series(current_date, current_date + 13, interval '1 day')::date loop
    daynum := d - date '2000-01-01';

    for i in 1..array_length(v_doctor_ids, 1) loop
      if (daynum + i) % 2 = 0 then
        continue;
      end if;

      v_doctor := v_doctor_ids[i];
      v_branch := case when i % 2 = 0 then v_branch1 else v_branch2 end;

      foreach extra_idx in array future_extra_indexes loop
        v_patient := v_patient_ids[1 + ((daynum + i * 11 + extra_idx * 19) % array_length(v_patient_ids, 1))];
        slot_time := slot_times[extra_idx];

        insert into appointments (patient_id, doctor_id, branch_id, appointment_date, start_time, end_time, status, reason)
        values (v_patient, v_doctor, v_branch, d, slot_time, slot_time + interval '30 minutes', 'booked', 'كشف دوري');

        added_count := added_count + 1;
      end loop;
    end loop;
  end loop;

  -- ----------------------------------------------------------------------------
  -- Settle payments only for invoices created just now (no payment yet)
  -- ----------------------------------------------------------------------------
  for inv_row in
    select id, patient_due_amount, row_number() over (order by id) as rn
    from invoices
    where patient_due_amount > 0
      and not exists (select 1 from payments where payments.invoice_id = invoices.id)
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

  raise notice 'Added % extra appointments.', added_count;
end $$;
