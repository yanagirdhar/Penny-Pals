create table profiles(id uuid primary key references auth.users on delete cascade,full_name text,username text not null,avatar_url text,display_mode text default 'username',created_at timestamptz default now());
create unique index on profiles(lower(username));
create table friendships(id uuid primary key default gen_random_uuid(),requester uuid not null references profiles,addressee uuid not null references profiles,status text not null default 'pending',created_at timestamptz default now(),check(requester<>addressee));
create unique index on friendships(least(requester,addressee),greatest(requester,addressee));
create table expenses(id uuid primary key default gen_random_uuid(),name text not null,total bigint not null check(total>0),paid_by uuid not null references profiles,created_by uuid not null references profiles,created_at timestamptz default now());
create table expense_shares(expense_id uuid references expenses on delete cascade,user_id uuid references profiles,share bigint not null check(share>=0),primary key(expense_id,user_id));
create table settlements(id uuid primary key default gen_random_uuid(),from_id uuid not null references profiles,to_id uuid not null references profiles,amount bigint not null check(amount>0),note text,created_at timestamptz default now(),check(from_id<>to_id));

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name,username) values(new.id,new.raw_user_meta_data->>'full_name',lower(new.raw_user_meta_data->>'username'));return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function is_party(eid uuid) returns boolean language sql security definer set search_path=public stable as $$
select exists(select 1 from expenses where id=eid and paid_by=auth.uid()) or exists(select 1 from expense_shares where expense_id=eid and user_id=auth.uid()) $$;
create function are_friends(a uuid,b uuid) returns boolean language sql security definer set search_path=public stable as $$
select a=b or exists(select 1 from friendships where status='accepted' and least(requester,addressee)=least(a,b) and greatest(requester,addressee)=greatest(a,b)) $$;

alter table profiles enable row level security;alter table friendships enable row level security;alter table expenses enable row level security;alter table expense_shares enable row level security;alter table settlements enable row level security;
create policy p_sel on profiles for select to authenticated using(true);
create policy p_upd on profiles for update to authenticated using(id=auth.uid());
create policy f_sel on friendships for select to authenticated using(auth.uid() in(requester,addressee));
create policy f_ins on friendships for insert to authenticated with check(requester=auth.uid() and status='pending');
create policy f_upd on friendships for update to authenticated using(addressee=auth.uid()) with check(status in('accepted'));
create policy f_del on friendships for delete to authenticated using(auth.uid() in(requester,addressee));
create policy e_sel on expenses for select to authenticated using(is_party(id));
create policy s_sel on expense_shares for select to authenticated using(is_party(expense_id));
create policy st_sel on settlements for select to authenticated using(auth.uid() in(from_id,to_id));
create policy st_ins on settlements for insert to authenticated with check(from_id=auth.uid() and are_friends(from_id,to_id));

create function create_expense(p_name text,p_total bigint,p_paid_by uuid,p_shares jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare eid uuid;s jsonb;
begin
 if auth.uid() is null then raise exception 'not signed in';end if;
 if not are_friends(auth.uid(),p_paid_by) then raise exception 'payer must be a friend';end if;
 if (select coalesce(sum((x->>'share')::bigint),0) from jsonb_array_elements(p_shares) x)<>p_total then raise exception 'shares must equal total';end if;
 for s in select * from jsonb_array_elements(p_shares) loop
  if not are_friends(auth.uid(),(s->>'user_id')::uuid) then raise exception 'participant must be a friend';end if;end loop;
 insert into expenses(name,total,paid_by,created_by) values(p_name,p_total,p_paid_by,auth.uid()) returning id into eid;
 insert into expense_shares select eid,(x->>'user_id')::uuid,(x->>'share')::bigint from jsonb_array_elements(p_shares) x;
 return eid;end $$;

-- positive = they owe me, negative = I owe them (paise)
create function my_balances() returns table(other uuid,amount bigint) language sql security definer set search_path=public stable as $$
select o,sum(a)::bigint from(
 select s.user_id o,s.share a from expense_shares s join expenses e on e.id=s.expense_id where e.paid_by=auth.uid() and s.user_id<>auth.uid()
 union all select e.paid_by,-s.share from expense_shares s join expenses e on e.id=s.expense_id where s.user_id=auth.uid() and e.paid_by<>auth.uid()
 union all select from_id,-amount from settlements where to_id=auth.uid()
 union all select to_id,amount from settlements where from_id=auth.uid()) t group by o $$;
