import { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Bell, Building2, CalendarDays, CheckCircle2,
  ClipboardList, Droplet, Heart, HeartHandshake, Hospital, LayoutDashboard,
  LockKeyhole, MapPin, Menu, Search, ShieldCheck, X,
} from 'lucide-react';

const PAGES = [
  { id: 'home', label: 'Home' }, { id: 'camps', label: 'Find Camps' },
  { id: 'donor', label: 'Donor' }, { id: 'hospital', label: 'Hospital' },
  { id: 'bank', label: 'Blood Bank' }, { id: 'admin', label: 'Admin' },
];
const api = async (path, options = {}, token = '') => {
  const response = await fetch('/api/v1' + path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const navigate = (page) => { window.location.hash = page; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const startingPage = () => PAGES.some(page => page.id === window.location.hash.slice(1))
  ? window.location.hash.slice(1) : ['signup','login'].includes(window.location.hash.slice(1))
    ? window.location.hash.slice(1) : 'home';
function IconTile({ Icon, tone='red' }) { return <span className={'icon-tile ' + tone}><Icon size={23} strokeWidth={1.8}/></span>; }
function Badge({ children, className='' }) { return <span className={'badge ' + className}>{children}</span>; }
function Heading({ tag, title, description }) {
  return <div className="page-heading"><span className="eyebrow">{tag}</span><h1>{title}</h1><p>{description}</p></div>;
}
function SectionTitle({ title, subtitle }) {
  return <div className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}
function Navbar({ page, loggedIn, onLogout }) {
  const [open,setOpen]=useState(false);
  return <header className="topbar"><div className="navbar wrap">
    <a className="brand" href="#home" onClick={() => setOpen(false)}><span className="brand-mark"><Heart size={20} fill="white"/></span><span>Blood<span className="brand-red">Bridge</span><small>CONNECTING COMMUNITIES</small></span></a>
    <nav aria-label="Main navigation" className={open ? 'navigation opened' : 'navigation'}>
      {PAGES.map(item => <a key={item.id} href={'#'+item.id} className={page === item.id ? 'active' : ''} onClick={()=>setOpen(false)}>{item.label}</a>)}
    </nav>
    <div className="header-actions">{loggedIn ? <button className="outline small" onClick={onLogout}>Log out</button> : <button className="primary small" onClick={()=>navigate('login')}>Sign in <ArrowRight size={16}/></button>}
      <button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={()=>setOpen(o=>!o)}>{open?<X size={23}/>:<Menu size={23}/>}</button>
    </div>
  </div></header>;
}
function Hero() {
  return <section className="hero"><div className="hero-text"><Badge className="on-dark">Sri Lanka · Blood donation network</Badge>
    <h1>Every drop connects <em>us all.</em></h1><p>Discover community donation camps, register as a donor, and bring hospitals and blood banks together in one coordinated platform.</p>
    <div className="hero-actions"><button className="primary" onClick={()=>navigate('signup')}>Become a Donor <ArrowRight size={19}/></button><button className="ghost" onClick={()=>navigate('camps')}>Explore Donation Camps</button></div>
    <div className="hero-tagline"><span className="pulse-dot"/> A prototype designed for Sri Lankan communities</div>
  </div><div className="hero-visual" aria-hidden="true"><div className="orbit a"/><div className="orbit b"/><div className="illustrated-drop"><Droplet size={152} strokeWidth={1.5} fill="white" color="white"/><Heart size={53} fill="#C9263E" color="#C9263E" className="drop-heart"/></div><div className="float-note"><CheckCircle2 size={19} color="#14856A"/><div><strong>One connected network</strong><small>Donors · Hospitals · Blood Banks</small></div></div></div></section>;
}
function Features() {
  const features = [
    { Icon: HeartHandshake, title: 'Give blood, give hope', desc: 'Register as a donor, set your availability, and discover relevant donation opportunities.'},
    { Icon: Hospital, title: 'Coordinate urgent needs', desc: 'Hospital staff can make component-specific blood requests through authorized workflows.'},
    { Icon: Droplet, title: 'Track available units', desc: 'Blood-bank staff manage released component inventory and traceable reservations.'},
  ];
  return <section className="block-space"><SectionTitle title="Built around people and purpose" subtitle="Separate experiences, one consistent blood coordination system."/><div className="three-grid">{features.map(x=><div className="surface-card feature" key={x.title}><IconTile Icon={x.Icon}/><h3>{x.title}</h3><p>{x.desc}</p></div>)}</div></section>;
}
function Home({ camps }) {
  return <><Hero/><Features/><section className="block-space"><SectionTitle title="Donation camps near your community" subtitle="Only approved camps appear in live results. No fictional events are presented as real."/><div className="camps-preview">{camps.length ? camps.slice(0,3).map(c=><CampCard key={c.camp_id} camp={c}/>) : <div className="empty-card"><CalendarDays size={31}/><strong>No approved upcoming camps in the demo database yet.</strong><p>A verified blood-bank account can create and approve the first camp.</p><button className="text-link" onClick={()=>navigate('camps')}>Open camp finder <ArrowRight size={16}/></button></div>}</div></section><section className="bottom-cta"><Heart size={30}/><div><h2>Be part of something meaningful.</h2><p>Join the BloodBridge donor community and keep your donation preferences updated.</p></div><button className="light-button" onClick={()=>navigate('signup')}>Create donor account <ArrowRight size={17}/></button></section></>;
}
function CampCard({ camp }) {
  const date = new Date(camp.starts_at);
  return <article className="surface-card camp-card"><div className="camp-art"><CalendarDays size={43}/></div><Badge className="success">Verified blood-bank event</Badge><h3>{camp.title}</h3><p><MapPin size={15}/>{camp.town} · {camp.district_name}</p><p><CalendarDays size={15}/>{date.toLocaleString('en-LK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Colombo'})}</p><p><Hospital size={15}/>{camp.coordinating_blood_bank}</p><button className="text-link" onClick={()=>navigate('login')}>Sign in to register <ArrowRight size={16}/></button></article>;
}
function Camps({ camps, district, setDistrict, districts, loading, error }) {
  return <div className="view-section"><Heading tag="Find a blood donation opportunity" title="Donation camps" description="Browse verified upcoming camps by Sri Lankan district. Your area selection filters real records in PostgreSQL."/>
    <div className="surface-card filter-card"><label htmlFor="district">Filter by district</label><div className="filter-row"><Search size={20}/><select id="district" value={district} onChange={e=>setDistrict(e.target.value)}><option value="">All available districts</option>{districts.map(d=><option key={d.code} value={d.code}>{d.name}</option>)}</select></div></div>
    {error && <div className="notice error">{error}</div>}
    {loading ? <p className="loading">Loading approved camps…</p> : camps.length ? <div className="three-grid">{camps.map(c=><CampCard key={c.camp_id} camp={c}/>)}</div> : <div className="empty-card"><CalendarDays size={32}/><h3>No upcoming camps found</h3><p>Try another district, or check back once a blood bank approves a camp.</p></div>}
  </div>;
}
function Portal({ type, session, token }) {
  const [profile,setProfile]=useState(null), [error,setError]=useState(''), [saving,setSaving]=useState(false);
  const defs = {
    donor: { label:'Donor Portal', title:'Your donation journey', icon:HeartHandshake, description:'A calm mobile-first space to manage your availability and discover approved camps.', metrics:[['My availability','Contact preference'],['Donation history','Verified records'],['Donation camps','Nearby opportunities']] },
    hospital: { label:'Hospital Portal', title:'Coordinated emergency requests', icon:Hospital, description:'Create component-specific requests, find released inventory and track fulfillment.', metrics:[['Blood requests','Submitted by staff'],['Matching','Potential candidates'],['Fulfillment','Verified handover']] },
    bank: { label:'Blood Bank Portal', title:'Manage your blood bank', icon:Droplet, description:'Track individual component units, approve donation camps and handle reservations.', metrics:[['Inventory','Release status'],['Requests','Pending allocation'],['Camp approvals','Coordinating bank']] },
    admin: { label:'Admin Portal', title:'Operational insights', icon:LayoutDashboard, description:'Manage institutional access and analyze database performance and warehouse trends.', metrics:[['User management','Role and organization'],['Analytics','Warehouse summaries'],['Database lab','EXPLAIN / indexes']] },
  };
  const d=defs[type];
  useEffect(()=>{
    if (type==='donor' && token && session?.user?.role==='DONOR') api('/donors/me',{},token).then(r=>setProfile(r.data)).catch(e=>setError(e.message));
  },[type,token,session]);
  const savePreference=async (key,val)=>{
    if(!profile)return;
    setSaving(true);setError('');
    const updated={...profile,[key]:val};
    try {
      const result=await api('/donors/me/preferences',{ method:'PATCH',body:JSON.stringify({ availableForContact:updated.available_for_contact,campNotificationsOptIn:updated.camp_notifications_opt_in})},token);
      setProfile({...updated,...result.data});
    } catch(e) {setError(e.message);} finally {setSaving(false);}
  };
  const authorized=session?.user?.role===({donor:'DONOR',hospital:'HOSPITAL_STAFF',bank:'BANK_STAFF',admin:'ADMIN'}[type]);
  return <div className="view-section portal"><Heading tag={d.label} title={d.title} description={d.description}/>
    {!authorized && <div className="notice"><LockKeyhole size={18}/><span>This is the {d.label.toLowerCase()} design layout. Sign in with the appropriate role to access private data; no sample clinical or operational figures are presented.</span><button className="text-link" onClick={()=>navigate('login')}>Sign in <ArrowRight size={15}/></button></div>}
    <div className="portal-heading"><IconTile Icon={d.icon}/><div><strong>{authorized ? `Welcome, ${session.user.fullName || session.user.full_name || 'user'}` : 'Dashboard preview'}</strong><p>Shared components · role-based authorization · responsive cards</p></div></div>
    <div className="three-grid">{d.metrics.map(([heading,desc])=><div className="surface-card stat-card" key={heading}><span className="small-label">{heading}</span><h3>—</h3><p>{desc}</p></div>)}</div>
    {type==='donor' && authorized && profile && <div className="surface-card settings-card"><h3>Donor preferences</h3><p>These preferences are saved to PostgreSQL and are not medical eligibility decisions.</p><label className="toggle-row"><input type="checkbox" disabled={saving} checked={profile.available_for_contact} onChange={e=>savePreference('available_for_contact',e.target.checked)}/><span>Available to be contacted for donation</span></label><label className="toggle-row"><input type="checkbox" disabled={saving} checked={profile.camp_notifications_opt_in} onChange={e=>savePreference('camp_notifications_opt_in',e.target.checked)}/><span>Opt in to relevant donation camp notifications</span></label></div>}
    {error && <div className="notice error">{error}</div>}
    <div className="surface-card info-card"><h3>Next implementation step</h3><p>Connect this role's remaining workflows to the documented API. Use real records, preserve organization-scoped permissions, and never substitute mock numbers for live inventory.</p><div className="chip-row"><Badge>Desktop: sidebar/table views</Badge><Badge>Mobile: stacked cards</Badge><Badge>Keyboard-accessible forms</Badge></div></div>
  </div>;
}
function Register({ districts, onDone }) {
  const [form,setForm]=useState({fullName:'',email:'',password:'',districtCode:'',bloodTypeCode:'',availableForContact:false,campNotificationsOptIn:false});
  const [state,setState]=useState({loading:false,error:'',success:''});
  const set=(field,value)=>setForm(f=>({...f,[field]:value}));
  const submit=async (e)=>{
    e.preventDefault();setState({loading:true,error:'',success:''});
    try {
      await api('/auth/register-donor',{method:'POST',body:JSON.stringify({...form,bloodTypeCode:form.bloodTypeCode || null})});
      setState({loading:false,error:'',success:'Account created. Sign in to manage your donor preferences.'});
      onDone();
    } catch(e){setState({loading:false,error:e.message,success:''});}
  };
  return <div className="auth-layout"><section className="surface-card auth-card"><Badge>Donor registration</Badge><h1>Join the BloodBridge community</h1><p>Use only fictional data when evaluating the academic prototype.</p>
    <form onSubmit={submit} className="form-grid"><label>Full name<input required minLength={2} value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Your name"/></label><label>Email<input required type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@example.com"/></label><label>Password (10+ characters)<input required minLength={10} type="password" autoComplete="new-password" value={form.password} onChange={e=>set('password',e.target.value)}/></label><label>District<select required value={form.districtCode} onChange={e=>set('districtCode',e.target.value)}><option value="">Choose a district</option>{districts.map(d=><option value={d.code} key={d.code}>{d.name}</option>)}</select></label><label>Blood group (optional, confirm medically)<select value={form.bloodTypeCode} onChange={e=>set('bloodTypeCode',e.target.value)}><option value="">Unknown / not confirmed</option>{['O-','O+','A-','A+','B-','B+','AB-','AB+'].map(t=><option value={t} key={t}>{t}</option>)}</select></label><label className="checkbox-line"><input type="checkbox" checked={form.availableForContact} onChange={e=>set('availableForContact',e.target.checked)}/> I agree to be contacted about donation opportunities</label><label className="checkbox-line"><input type="checkbox" checked={form.campNotificationsOptIn} onChange={e=>set('campNotificationsOptIn',e.target.checked)}/> Notify me about approved local donation camps</label>
      {state.error && <div className="notice error">{state.error}</div>}{state.success && <div className="notice success">{state.success}</div>}<button className="primary" disabled={state.loading}>{state.loading?'Creating account…':'Create donor account'} <ArrowRight size={18}/></button></form></section></div>;
}
function Login({ onLogin }) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const submit=async(e)=>{e.preventDefault();setLoading(true);setError('');try { const r=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});onLogin(r); }catch(err){setError(err.message);}finally{setLoading(false);} };
  return <div className="auth-layout"><section className="surface-card auth-card"><Badge>Secure login</Badge><h1>Welcome back</h1><p>Sign in to access the role-specific dashboard. Staff accounts must be created by authorized administrators.</p><form onSubmit={submit} className="form-grid"><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error && <div className="notice error">{error}</div>}<button className="primary" disabled={loading}>{loading?'Signing in…':'Sign in'}<ArrowRight size={17}/></button></form><p className="form-foot">New donor? <button className="text-link" onClick={()=>navigate('signup')}>Create an account</button></p></section></div>;
}
export default function App() {
  const [page,setPage]=useState(startingPage());
  const [session,setSession]=useState(()=>{try{return JSON.parse(sessionStorage.getItem('bb_session') || 'null');}catch{return null;}});
  const [districts,setDistricts]=useState([]),[district,setDistrict]=useState(''),[camps,setCamps]=useState([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{const update=()=>setPage(startingPage());window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  useEffect(()=>{ api('/locations/districts').then(r=>setDistricts(r.data)).catch(e=>setError('Location service unavailable: '+e.message));},[]);
  useEffect(()=>{setLoading(true);setError('');api('/camps'+(district?'?districtCode='+encodeURIComponent(district):'')).then(r=>setCamps(r.data)).catch(e=>setError('Camp service unavailable: '+e.message)).finally(()=>setLoading(false));},[district]);
  const login=(r)=>{const s={token:r.token,user:r.user};sessionStorage.setItem('bb_session',JSON.stringify(s));setSession(s);navigate(({DONOR:'donor',HOSPITAL_STAFF:'hospital',BANK_STAFF:'bank',ADMIN:'admin'}[r.user.role]||'home'));};
  const logout=()=>{sessionStorage.removeItem('bb_session');setSession(null);navigate('home');};
  return <><Navbar page={page} loggedIn={Boolean(session)} onLogout={logout}/><main className="wrap main">
    {page==='home' && <Home camps={camps}/>}{page==='camps' && <Camps camps={camps} district={district} setDistrict={setDistrict} districts={districts} loading={loading} error={error}/>}
    {['donor','hospital','bank','admin'].includes(page) && <Portal type={page} session={session} token={session?.token}/>}
    {page==='signup' && <Register districts={districts} onDone={()=>{}}/>}
    {page==='login' && <Login onLogin={login}/>}
  </main><footer className="footer"><div className="wrap footer-inside"><span><Heart size={16} fill="#C9263E"/> BloodBridge · Academic prototype</span><span>Built for learning · Not for clinical use or live emergency decisions</span></div></footer></>;
}
