-- Run once in Supabase SQL Editor (after schema.sql). Lets ONLY the creator edit/delete an expense.
create policy e_del on expenses for delete to authenticated using(created_by=auth.uid());

create or replace function update_expense(p_id uuid,p_name text,p_total bigint,p_paid_by uuid,p_shares jsonb) returns void language plpgsql security definer set search_path=public as $$
declare s jsonb;
begin
 if not exists(select 1 from expenses where id=p_id and created_by=auth.uid()) then raise exception 'Only the creator can edit this expense';end if;
 if not are_friends(auth.uid(),p_paid_by) then raise exception 'payer must be a friend';end if;
 if (select coalesce(sum((x->>'share')::bigint),0) from jsonb_array_elements(p_shares) x)<>p_total then raise exception 'shares must equal total';end if;
 for s in select * from jsonb_array_elements(p_shares) loop
  if not are_friends(auth.uid(),(s->>'user_id')::uuid) then raise exception 'participant must be a friend';end if;end loop;
 update expenses set name=p_name,total=p_total,paid_by=p_paid_by where id=p_id;
 delete from expense_shares where expense_id=p_id;
 insert into expense_shares select p_id,(x->>'user_id')::uuid,(x->>'share')::bigint from jsonb_array_elements(p_shares) x;
end $$;
