import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { sb } from './lib.js';
import { Bell } from './ui.jsx';
import { Auth, Dashboard, Friends, AddExpense, Transactions, Settings } from './pages.jsx';
export const Ctx = createContext(); export const useMe = () => useContext(Ctx);
export default function App() {
   const [session, setSession] = useState(undefined), [me, setMe] = useState(null), [theme, setTheme] = useState(localStorage.theme || 'light');
   useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.theme = theme }, [theme]);
   useEffect(() => { sb.auth.getSession().then(({ data }) => setSession(data.session)); const { data } = sb.auth.onAuthStateChange((_, s) => setSession(s)); return () => data.subscription.unsubscribe() }, []);
   const load = async () => { if (!session) return setMe(null); const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single(); setMe(data) };
   useEffect(() => { load() }, [session]);
   if (session === undefined) return <div className="center">Loading…</div>;
   if (!session) return <Ctx.Provider value={{ theme, setTheme }}><Routes><Route path="*" element={<Auth />} /></Routes></Ctx.Provider>;
   if (!me) return <div className="center">Loading…</div>;
   return <Ctx.Provider value={{ me, reload: load, theme, setTheme }}><Shell /></Ctx.Provider>;
}
function Shell() {
   const { me, theme, setTheme } = useMe(), nav = useNavigate();
   const L = [['/', '▦', 'Dashboard'], ['/friends', '☺', 'Friends'], ['/add', '＋', 'Add Expense'], ['/transactions', '☰', 'Transactions'], ['/settings', '⚙', 'Settings']];
   return <div className="shell">
      <aside><img src="/logo.png" className="logo" alt="Penny Pals" />
         <nav>{L.map(([to, i, t]) => <NavLink key={to} to={to} end={to === '/'} className="nl"><span>{i}</span><b>{t}</b></NavLink>)}</nav>
         <button className="nl out" onClick={() => sb.auth.signOut().then(() => nav('/'))}><span>⏻</span><b>Log out</b></button></aside>
      <main><header><Bell me={me} /><div className="pill"><div><b>{me.full_name || me.username}</b><small>@{me.username}</small></div><div className="av">{(me.username || '?')[0].toUpperCase()}</div></div>
         <button className="icon" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button></header>
         <Routes><Route path="/" element={<Dashboard />} /><Route path="/friends" element={<Friends />} /><Route path="/add" element={<AddExpense />} /><Route path="/edit/:id" element={<AddExpense />} /><Route path="/transactions" element={<Transactions />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" />} /></Routes></main></div>;
}
