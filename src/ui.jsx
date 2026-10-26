import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sb, inr, nm } from './lib.js';

// Searchable dropdown. multi=true -> checklist with YouTube-style tags; multi=false -> single choice.
export function Pick({ options, value, onChange, multi, placeholder }) {
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), ref = useRef();
  useEffect(() => { const h = e => { if (!ref.current?.contains(e.target)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, []);
  const sel = multi ? value : [value];
  const list = options.filter(o => (o.label + ' ' + (o.sub || '')).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => {
    if (multi) onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
    else { onChange(id); setOpen(false); setQ('') }
  };
  const cur = options.find(o => o.id === value)?.label || '';
  return <div className="pick" ref={ref}>
    <div className="pbox" onClick={() => setOpen(true)}>
      {multi && value.map(id => { const o = options.find(x => x.id === id); return o && <span className="tag" key={id}>{o.label}<button type="button" onClick={e => { e.stopPropagation(); toggle(id) }}>×</button></span> })}
      <input value={open ? q : (multi ? '' : cur)} placeholder={multi && value.length ? 'Add more…' : (open && !multi ? cur : placeholder)} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true) }} />
    </div>
    {open && <div className="plist">
      {!list.length && <small className="empty">No matches</small>}
      {list.map(o => {
        const on = sel.includes(o.id); return <div key={o.id} className={'popt' + (on ? ' on' : '')} onClick={() => toggle(o.id)}>
          <span className="cb">{on ? '✓' : ''}</span><span className="grow">{o.label}</span><small>{o.sub}</small></div>
      })}
    </div>}
  </div>;
}

// Notification bell: friend requests, accepted requests, expenses you were added to, payments received.
// Built from existing tables, so no extra schema needed.
export function Bell({ me }) {
  const key = 'seen_' + me.id, [items, setItems] = useState([]), [open, setOpen] = useState(false), [seen, setSeen] = useState(+localStorage[key] || 0), ref = useRef();
  const load = async () => {
    const [f, e, s] = await Promise.all([
      sb.from('friendships').select('*'),
      sb.from('expenses').select('*').neq('created_by', me.id).order('created_at', { ascending: false }).limit(10),
      sb.from('settlements').select('*').eq('to_id', me.id).order('created_at', { ascending: false }).limit(10)]);
    const fr = f.data || [];
    const raw = [
      ...fr.filter(x => x.addressee === me.id && x.status === 'pending').map(x => ({ t: x.created_at, u: x.requester, k: 'req' })),
      ...fr.filter(x => x.requester === me.id && x.status === 'accepted').map(x => ({ t: x.created_at, u: x.addressee, k: 'acc' })),
      ...(e.data || []).map(x => ({ t: x.created_at, u: x.created_by, k: 'exp', n: x.name, a: x.total })),
      ...(s.data || []).map(x => ({ t: x.created_at, u: x.from_id, k: 'pay', a: x.amount }))
    ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 15);
    const ids = [...new Set(raw.map(r => r.u))];
    const { data: p } = ids.length ? await sb.from('profiles').select('*').in('id', ids) : { data: [] };
    const pm = Object.fromEntries((p || []).map(x => [x.id, x]));
    setItems(raw.map(r => ({ ...r, who: nm(pm[r.u], me.display_mode) })));
  };
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, []);
  useEffect(() => { const h = e => { if (!ref.current?.contains(e.target)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, []);
  const unread = items.filter(i => i.k === 'req' || new Date(i.t) > seen).length;
  const toggle = () => { if (!open) { localStorage[key] = Date.now(); setSeen(Date.now()) } setOpen(!open) };
  const text = i => i.k === 'req' ? `${i.who} sent you a friend request` : i.k === 'acc' ? `${i.who} accepted your friend request` : i.k === 'exp' ? `${i.who} added “${i.n}” (${inr(i.a)})` : `${i.who} paid you ${inr(i.a)}`;
  const to = i => i.k === 'exp' ? '/transactions' : '/' + (i.k === 'pay' ? '' : 'friends');
  return <div className="bell" ref={ref}>
    <button className="icon" title="Notifications" onClick={toggle}>🔔{unread > 0 && <span className="dot">{unread}</span>}</button>
    {open && <div className="drop"><h3>Notifications</h3>
      {!items.length && <p className="mut empty">Nothing yet.</p>}
      {items.map((i, n) => <Link key={n} to={to(i)} className="li nitem" onClick={() => setOpen(false)}>
        <div className="grow"><b>{text(i)}</b><small>{new Date(i.t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></Link>)}
    </div>}
  </div>;
}
