import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pick } from './ui.jsx';
import { sb, inr, toPaise, splitEqual, nm } from './lib.js';
import { useMe } from './App.jsx';

export function Auth() {
  const { theme, setTheme } = useMe(), [mode, setMode] = useState('in'), [f, setF] = useState({}), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = async e => {
    e.preventDefault(); setBusy(true); setMsg(''); let r;
    if (mode === 'in') r = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
    else if (mode === 'up') {
      if (!/^[a-z0-9_]{3,20}$/i.test(f.username || '')) r = { error: { message: 'Username: 3-20 letters, numbers, underscores' } };
      else if (f.password !== f.confirm) r = { error: { message: 'Passwords do not match' } };
      else { r = await sb.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: location.origin, data: { full_name: f.name, username: f.username } } }); if (!r.error) r = { error: { message: 'Check your email to verify your account, then log in.' } } }
    }
    else { r = await sb.auth.resetPasswordForEmail(f.email, { redirectTo: location.origin }); r = { error: { message: 'If that email has an account, a reset link is on its way.' } } }
    setBusy(false); if (r.error) setMsg(r.error.message)
  };
  return <div className="auth"><button className="icon tg" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
    <form className="card authc" onSubmit={go}><img src="/logo.png" className="logo big" alt="Penny Pals" />
      <h2>{mode === 'in' ? 'Welcome back' : mode === 'up' ? 'Create account' : 'Reset password'}</h2><p className="mut">Split expenses with friends, effortlessly.</p>
      {mode === 'up' && <><input placeholder="Full name" required onChange={set('name')} /><input placeholder="Username" required onChange={set('username')} /></>}
      <input type="email" placeholder="Email" required onChange={set('email')} />
      {mode !== 'fp' && <input type="password" placeholder="Password" minLength={8} required onChange={set('password')} />}
      {mode === 'up' && <input type="password" placeholder="Confirm password" required onChange={set('confirm')} />}
      {msg && <div className="note">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Log in' : mode === 'up' ? 'Register' : 'Send reset link'}</button>
      <div className="links">{mode !== 'in' && <a onClick={() => setMode('in')}>Log in</a>}{mode !== 'up' && <a onClick={() => setMode('up')}>Create account</a>}{mode === 'in' && <a onClick={() => setMode('fp')}>Forgot password?</a>}</div></form></div>;
}

const useProfiles = () => { const [m, setM] = useState({}); const add = async ids => { ids = [...new Set(ids)].filter(i => !m[i]); if (!ids.length) return; const { data } = await sb.from('profiles').select('*').in('id', ids); setM(o => ({ ...o, ...Object.fromEntries((data || []).map(p => [p.id, p])) })) }; return [m, add] };

export function Dashboard() {
  const { me } = useMe(), nav = useNavigate(), [bal, setBal] = useState(null), [ex, setEx] = useState([]), [pm, load] = useProfiles(), [pay, setPay] = useState(null), [amt, setAmt] = useState('');
  const refresh = async () => {
    const { data } = await sb.rpc('my_balances'); const b = (data || []).filter(x => x.amount !== 0); setBal(b);
    const { data: e } = await sb.from('expenses').select('*').order('created_at', { ascending: false }).limit(5); setEx(e || []); load([...b.map(x => x.other), ...(e || []).map(x => x.paid_by)])
  };
  useEffect(() => { refresh() }, []);
  const owed = (bal || []).filter(b => b.amount > 0).reduce((s, b) => s + b.amount, 0), owe = (bal || []).filter(b => b.amount < 0).reduce((s, b) => s - b.amount, 0);
  const settle = async () => { const { error } = await sb.from('settlements').insert({ from_id: me.id, to_id: pay.other, amount: toPaise(amt), note: 'Recorded in Penny Pals' }); if (error) return alert(error.message); setPay(null); setAmt(''); refresh() };
  return <div><h1>Hey, <span className="y">{me.full_name?.split(' ')[0] || me.username}!</span></h1><p className="mut">Here's your expense overview</p>
    <div className="row"><Link className="btn" to="/add">+ Add Expense</Link><Link className="btn ghost" to="/friends">+ Add Friend</Link></div>
    <div className="stats"><div className="card stat"><small>You owe</small><b className="neg">{inr(owe)}</b></div><div className="card stat"><small>You are owed</small><b className="pos">{inr(owed)}</b></div><div className="card stat"><small>Net balance</small><b className={owed >= owe ? 'pos' : 'neg'}>{owed >= owe ? '+' : '-'}{inr(owed - owe)}</b></div></div>
    <div className="grid2"><section className="card"><h3>People & balances</h3>
      {bal === null ? <p className="mut">Loading…</p> : !bal.length ? <div className="empty"><p>Your expense-sharing journey starts here.</p><Link className="btn" to="/friends">Add your first friend</Link></div> : bal.map(b => <div className="li" key={b.other}><div className="av">{(pm[b.other]?.username || '?')[0].toUpperCase()}</div><div className="grow"><b>{nm(pm[b.other], me.display_mode)}</b><small className={b.amount > 0 ? 'pos' : 'neg'}>{b.amount > 0 ? `Owes you ${inr(b.amount)}` : `You owe ${inr(b.amount)}`}</small></div>{b.amount < 0 && <button className="btn sm" onClick={() => { setPay(b); setAmt(String(-b.amount / 100)) }}>Pay back</button>}</div>)}</section>
      <section className="card"><h3>Recent transactions</h3>{!ex.length ? <p className="mut">No expenses yet.</p> : ex.map(e => <div className="li" key={e.id}><div className="grow"><b>{e.name}</b><small>{new Date(e.created_at).toLocaleDateString('en-IN')} · paid by {nm(pm[e.paid_by], me.display_mode)}</small></div><b>{inr(e.total)}</b></div>)}<Link to="/transactions" className="lnk">View all →</Link></section></div>
    {pay && <div className="modal" onClick={() => setPay(null)}><div className="card" onClick={e => e.stopPropagation()}><h3>Settle up</h3><p>You owe {nm(pm[pay.other], me.display_mode)} {inr(pay.amount)}. Records a payment you made outside the app.</p><input type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} /><div className="row"><button className="btn" onClick={settle}>Confirm</button><button className="btn ghost" onClick={() => setPay(null)}>Cancel</button></div></div></div>}</div>;
}

export function Friends() {
  const { me } = useMe(), [q, setQ] = useState(''), [res, setRes] = useState([]), [fr, setFr] = useState([]), [pm, load] = useProfiles();
  const refresh = async () => { const { data } = await sb.from('friendships').select('*'); setFr(data || []); load((data || []).flatMap(f => [f.requester, f.addressee])) };
  useEffect(() => { refresh() }, []);
  const search = async e => { e.preventDefault(); const { data } = await sb.from('profiles').select('*').ilike('username', `%${q}%`).neq('id', me.id).limit(10); setRes(data || []) };
  const add = async id => { const { error } = await sb.from('friendships').insert({ requester: me.id, addressee: id }); if (error) alert(error.code === '23505' ? 'Request already exists' : error.message); refresh() };
  const acc = async id => { await sb.from('friendships').update({ status: 'accepted' }).eq('id', id); refresh() };
  const del = async id => { await sb.from('friendships').delete().eq('id', id); refresh() };
  const other = f => f.requester === me.id ? f.addressee : f.requester, rel = id => fr.find(f => other(f) === id);
  const Row = ({ id, children }) => <div className="li"><div className="av">{(pm[id]?.username || '?')[0].toUpperCase()}</div><div className="grow"><b>{nm(pm[id], me.display_mode)}</b><small>{pm[id]?.full_name}</small></div>{children}</div>;
  return <div><h1>Friends</h1><form className="row" onSubmit={search}><input placeholder="Search by username" value={q} onChange={e => setQ(e.target.value)} /><button className="btn">Search</button></form>
    {res.length > 0 && <section className="card"><h3>Results</h3>{res.map(p => { pm[p.id] || (pm[p.id] = p); const r = rel(p.id); return <Row key={p.id} id={p.id}>{!r ? <button className="btn sm" onClick={() => add(p.id)}>Add friend</button> : <span className="badge">{r.status === 'accepted' ? 'Friends' : 'Pending'}</span>}</Row> })}</section>}
    <div className="grid2"><section className="card"><h3>Requests</h3>{!fr.filter(f => f.status === 'pending').length && <p className="mut">No pending requests.</p>}{fr.filter(f => f.status === 'pending').map(f => <Row key={f.id} id={other(f)}>{f.addressee === me.id ? <><button className="btn sm" onClick={() => acc(f.id)}>Accept</button><button className="btn sm ghost" onClick={() => del(f.id)}>Decline</button></> : <button className="btn sm ghost" onClick={() => del(f.id)}>Cancel</button>}</Row>)}</section>
      <section className="card"><h3>Your friends</h3>{!fr.filter(f => f.status === 'accepted').length && <p className="mut">No friends yet. Search above!</p>}{fr.filter(f => f.status === 'accepted').map(f => <Row key={f.id} id={other(f)}><button className="btn sm ghost" onClick={() => confirm('Remove friend?') && del(f.id)}>Remove</button></Row>)}</section></div></div>;
}

export function AddExpense() {
  const { me } = useMe(), nav = useNavigate(), { id } = useParams(), [fr, setFr] = useState([]), [pm, load] = useProfiles(), [name, setName] = useState(''), [amt, setAmt] = useState(''), [paidBy, setPaidBy] = useState(me.id), [sel, setSel] = useState([me.id]), [incl, setIncl] = useState(true), [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const { data } = await sb.from('friendships').select('*').eq('status', 'accepted');
      let ids = (data || []).map(f => f.requester === me.id ? f.addressee : f.requester);
      if (id) { // edit mode: creator only
        const { data: e } = await sb.from('expenses').select('*').eq('id', id).single();
        if (!e || e.created_by !== me.id) return nav('/transactions');
        const { data: s } = await sb.from('expense_shares').select('*').eq('expense_id', id); const sids = (s || []).map(x => x.user_id);
        ids = [...new Set([...ids, e.paid_by, ...sids].filter(x => x !== me.id))];
        setName(e.name); setAmt(String(e.total / 100)); setPaidBy(e.paid_by); setSel(sids); setIncl(sids.includes(e.paid_by))
      }
      setFr(ids); load([me.id, ...ids])
    })()
  }, [id]);
  const all = [me.id, ...fr], opts = all.map(i => ({ id: i, label: i === me.id ? 'You' : nm(pm[i], me.display_mode), sub: i === me.id ? '' : pm[i]?.full_name }));
  const total = toPaise(amt), ids = incl ? [...new Set([...sel, paidBy])] : sel.filter(k => k !== paidBy), shares = splitEqual(total, ids);
  const label = i => i === me.id ? 'You' : nm(pm[i], me.display_mode);
  const save = async () => {
    setErr(''); if (!name || total <= 0 || !ids.length) return setErr('Enter a name, amount and at least one participant.');
    const args = { p_name: name, p_total: total, p_paid_by: paidBy, p_shares: shares };
    const { error } = id ? await sb.rpc('update_expense', { ...args, p_id: id }) : await sb.rpc('create_expense', args);
    if (error) return setErr(error.message); nav(id ? '/transactions' : '/')
  };
  return <div><h1>{id ? 'Edit expense' : 'Add expense'}</h1><section className="card form">
    <input placeholder="Expense name (e.g. Dinner)" value={name} onChange={e => setName(e.target.value)} />
    <input type="number" step="0.01" placeholder="Total amount ₹" value={amt} onChange={e => setAmt(e.target.value)} />
    <label>Paid by</label><Pick options={opts} value={paidBy} onChange={setPaidBy} placeholder="Search friends…" />
    <label className="chk"><input type="checkbox" checked={incl} onChange={e => setIncl(e.target.checked)} />Include payer in the split</label>
    <label>Split with</label><Pick multi options={opts} value={sel} onChange={setSel} placeholder="Search & select people…" />
    <div className="card inner"><b>Split preview (equal)</b>{shares.map(s => <div className="li" key={s.user_id}><span className="grow">{label(s.user_id)}</span><b>{inr(s.share)}</b></div>)}</div>
    {err && <div className="note">{err}</div>}<div className="row"><button className="btn" onClick={save}>{id ? 'Save changes' : 'Save expense'}</button>{id && <button className="btn ghost" onClick={() => nav('/transactions')}>Cancel</button>}</div></section></div>;
}

export function Transactions() {
  const { me } = useMe(), nav = useNavigate(), [ex, setEx] = useState([]), [sh, setSh] = useState([]), [q, setQ] = useState(''), [pm, load] = useProfiles();
  const refresh = async () => { const { data } = await sb.from('expenses').select('*').order('created_at', { ascending: false }); const { data: s } = await sb.from('expense_shares').select('*'); setEx(data || []); setSh(s || []); load((data || []).map(e => e.paid_by)) };
  useEffect(() => { refresh() }, []);
  const del = async e => { if (!confirm(`Delete "${e.name}"? It will be removed for everyone involved.`)) return; const { error } = await sb.from('expenses').delete().eq('id', e.id); if (error) return alert(error.message); refresh() };
  const list = ex.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  return <div><h1>Transactions</h1><input placeholder="Search transactions" value={q} onChange={e => setQ(e.target.value)} />
    <section className="card">{!list.length && <p className="mut">Nothing here yet.</p>}{list.map(e => {
      const my = sh.find(s => s.expense_id === e.id && s.user_id === me.id); return <div className="li" key={e.id}><div className="grow"><b>{e.name}</b><small>{new Date(e.created_at).toLocaleDateString('en-IN')} · paid by {e.paid_by === me.id ? 'you' : nm(pm[e.paid_by], me.display_mode)} · {sh.filter(s => s.expense_id === e.id).length} people</small></div><div className="r"><b>{inr(e.total)}</b><small>Your share {inr(my?.share || 0)}</small></div>
        {e.created_by === me.id && <div className="acts"><button className="btn sm ghost" onClick={() => nav('/edit/' + e.id)}>Edit</button><button className="btn sm ghost danger" onClick={() => del(e)}>Delete</button></div>}</div>
    })}</section></div>;
}

export function Settings() {
  const { me, reload, theme, setTheme } = useMe(), [name, setName] = useState(me.full_name || ''), [uname, setUname] = useState(me.username || ''), [pw, setPw] = useState(''), [msg, setMsg] = useState('');
  const upd = async p => {
    if (p.username !== undefined) { p.username = p.username.trim().toLowerCase(); if (!/^[a-z0-9_]{3,20}$/.test(p.username)) return setMsg('Username: 3-20 letters, numbers, underscores') }
    const { error } = await sb.from('profiles').update(p).eq('id', me.id); setMsg(error ? (error.code === '23505' ? 'That username is already taken' : error.message) : 'Saved'); reload()
  };
  return <div><h1>Settings</h1>{msg && <div className="note">{msg}</div>}
    <section className="card form"><h3>Profile</h3><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /><button className="btn sm" onClick={() => upd({ full_name: name })}>Save name</button>
      <label>Username</label><input value={uname} onChange={e => setUname(e.target.value)} placeholder="username" /><button className="btn sm" onClick={() => upd({ username: uname })}>Save username</button></section>
    <section className="card form"><h3>Appearance</h3><div className="row">{['light', 'dark'].map(t => <button key={t} className={'btn ' + (theme === t ? '' : 'ghost')} onClick={() => setTheme(t)}>{t === 'light' ? '☀ Light' : '☾ Dark'}</button>)}</div>
      <h3>Display names as</h3><div className="row">{[['username', 'Username'], ['full_name', 'Full name']].map(([v, l]) => <button key={v} className={'btn ' + (me.display_mode === v ? '' : 'ghost')} onClick={() => upd({ display_mode: v })}>{l}</button>)}</div></section>
    <section className="card form"><h3>Change password</h3><input type="password" minLength={8} placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} /><button className="btn sm" onClick={async () => { const { error } = await sb.auth.updateUser({ password: pw }); setMsg(error ? error.message : 'Password updated'); setPw('') }}>Update password</button></section></div>;
}
