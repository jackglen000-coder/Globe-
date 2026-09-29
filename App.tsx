import { useEffect, useState } from 'react';
import { api, auth } from '@appdeploy/client';
import { ShieldCheck, TrendingUp, ArrowRight, CheckCircle2, Menu, X, Landmark, UserRound, FileCheck2, LockKeyhole, ChevronDown, Bot, Send, Languages, LogOut, LayoutDashboard, CircleAlert } from 'lucide-react';
import './index.css';

type Plan = { name: string; min: string; max: string; risk: string; duration: string; description: string };
type Profile = { fullName: string; phone: string; country: string; plan: string; verificationStatus: string; createdAt: string };
const plans: Plan[] = [
  { name: 'Starter', min: '$5,000', max: '$9,999', risk: 'Moderate', duration: 'Flexible term', description: 'A starting allocation for investors seeking diversified exposure with a measured risk profile.' },
  { name: 'Growth', min: '$10,000', max: '$49,999', risk: 'Moderate', duration: 'Flexible term', description: 'Designed for investors looking to build a larger diversified portfolio over time.' },
  { name: 'Professional', min: '$50,000', max: '$99,999', risk: 'Moderate–High', duration: 'Flexible term', description: 'A higher-capital tier with access to a broader portfolio allocation framework.' },
  { name: 'Premium', min: '$100,000', max: '$100,000+', risk: 'Moderate–High', duration: 'Flexible term', description: 'Our highest allocation tier for investors seeking a substantial managed investment position.' },
];

function App() {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<'onboard' | 'deposit' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [faq, setFaq] = useState<number | null>(null);
  const [language, setLanguage] = useState('English');
  const [botOpen, setBotOpen] = useState(false);
  const [botInput, setBotInput] = useState('');
  const [botBusy, setBotBusy] = useState(false);
  const [botMessages, setBotMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([{ role: 'bot', text: 'Hello! I’m the GlobalRise support assistant. I can explain our plans, onboarding, verification, bank-transfer process, and risk information.' }]);
  const [user, setUser] = useState<Awaited<ReturnType<typeof auth.getUser>>>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', country: '', plan: 'Starter' });
  const [dashboard, setDashboard] = useState(false);
  const [requests, setRequests] = useState<Array<{ id: string; type: string; amount: number; reference?: string; status: string }>>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminRequests, setAdminRequests] = useState<Array<{ id: string; type: string; amount: number; reference?: string; status: string; email?: string; fullName?: string }>>([]);
  const [adminProfiles, setAdminProfiles] = useState<Array<{ id: string; fullName: string; email: string; country: string; plan: string; verificationStatus: string }>>([]);
  const [requestForm, setRequestForm] = useState({ type: 'deposit', amount: '', reference: '' });
  const [emailTestBusy, setEmailTestBusy] = useState(false);
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const translations: Record<string, Record<string, string>> = {
    English: { home: 'Home', plans: 'Plans', process: 'How It Works', faq: 'FAQ', login: 'Investor Login', start: 'Get Started', hero1: 'Growing opportunities.', hero2: 'Building tomorrow.', explore: 'Explore plans', choose: 'Choose your investment tier', questions: 'Frequently asked questions' },
    French: { home: 'Accueil', plans: 'Plans', process: 'Comment ça marche', faq: 'FAQ', login: 'Connexion investisseur', start: 'Commencer', hero1: 'Développer les opportunités.', hero2: 'Construire demain.', explore: 'Voir les plans', choose: 'Choisissez votre niveau d’investissement', questions: 'Questions fréquentes' },
    Spanish: { home: 'Inicio', plans: 'Planes', process: 'Cómo funciona', faq: 'FAQ', login: 'Acceso del inversor', start: 'Comenzar', hero1: 'Creando oportunidades.', hero2: 'Construyendo el mañana.', explore: 'Ver planes', choose: 'Elige tu nivel de inversión', questions: 'Preguntas frecuentes' },
    Portuguese: { home: 'Início', plans: 'Planos', process: 'Como funciona', faq: 'FAQ', login: 'Login do investidor', start: 'Começar', hero1: 'Criando oportunidades.', hero2: 'Construindo o amanhã.', explore: 'Ver planos', choose: 'Escolha seu nível de investimento', questions: 'Perguntas frequentes' },
    German: { home: 'Startseite', plans: 'Pläne', process: 'So funktioniert es', faq: 'FAQ', login: 'Anleger-Login', start: 'Loslegen', hero1: 'Chancen entwickeln.', hero2: 'Die Zukunft gestalten.', explore: 'Pläne ansehen', choose: 'Wählen Sie Ihre Investmentstufe', questions: 'Häufige Fragen' },
  };
  const t = translations[language] || translations.English;

  useEffect(() => {
    void (async () => {
      const current = await auth.getUser();
      setUser(current);
      if (current) { await loadProfile(); await loadRequests(); }
    })();
  }, []);

  const loadRequests = async () => { try { const response = await api.get('/api/investor/requests'); setRequests(response.data.requests || []); } catch { setRequests([]); } };
  const loadAdminRequests = async () => { try { const response = await api.get('/api/admin/requests'); setAdminRequests(response.data.requests || []); } catch { setAdminRequests([]); } };
  const loadAdminProfiles = async () => { try { const response = await api.get('/api/admin/profiles'); setAdminProfiles(response.data.profiles || []); } catch { setAdminProfiles([]); } };
  const submitRequest = async () => { const amount = Number(requestForm.amount); if (!Number.isFinite(amount) || amount <= 0) { setAuthError('Enter a valid amount.'); return; } setAuthBusy(true); setAuthError(''); try { await api.post('/api/investor/requests', { type: requestForm.type, amount, reference: requestForm.reference }); await loadRequests(); setRequestForm({ type: 'deposit', amount: '', reference: '' }); setModal(null); setDashboard(true); } catch (err) { setAuthError(err instanceof Error ? err.message : 'Unable to submit request.'); } finally { setAuthBusy(false); } };
  const updateAdminRequest = async (id: string, status: string) => { try { await api.put(`/api/admin/requests/${id}`, { status }); await loadAdminRequests(); } catch (err) { setAuthError(err instanceof Error ? err.message : 'Unable to update request.'); } };
  const updateAdminProfile = async (id: string, status: string) => { try { await api.put(`/api/admin/profiles/${id}`, { status }); await loadAdminProfiles(); } catch (err) { setAuthError(err instanceof Error ? err.message : 'Unable to update investor.'); } };
  const testAdminEmail = async () => { if (emailTestBusy) return; setEmailTestBusy(true); setEmailTestMessage(''); try { const response = await api.get('/api/admin/email-test'); setEmailTestMessage(`Test email sent to ${response.data.recipient}. Check Inbox and Spam.`); } catch (err) { setEmailTestMessage(err instanceof Error ? err.message : 'Email test failed.'); } finally { setEmailTestBusy(false); } };

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/investor/profile');
      setProfile(response.data.profile ?? null);
      if (response.data.profile) setProfileForm({ fullName: response.data.profile.fullName, phone: response.data.profile.phone, country: response.data.profile.country, plan: response.data.profile.plan });
    } catch {
      setProfile(null);
    }
  };

  const signIn = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const result = await auth.signIn({ scope: 'openid email profile offline_access' });
      setUser(result.user);
      await loadProfile();
      await loadRequests();
      setDashboard(true);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setAuthError(code === 'popup_blocked' ? 'Please allow pop-ups for GlobalRise to complete sign-in.' : code === 'popup_closed' ? 'Sign-in was cancelled.' : 'Sign-in could not be completed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setDashboard(false);
  };

  const saveProfile = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await api.put('/api/investor/profile', profileForm);
      setProfile(response.data.profile);
      setDashboard(true);
      setModal(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to save your investor profile.');
    } finally {
      setAuthBusy(false);
    }
  };

  const startInvesting = (plan?: Plan) => {
    setSelectedPlan(plan ?? plans[0]);
    if (!user) {
      void signIn();
      return;
    }
    setProfileForm(prev => ({ ...prev, plan: plan?.name ?? prev.plan }));
    setModal('onboard');
  };

  const askBot = async () => {
    const message = botInput.trim();
    if (!message || botBusy) return;
    setBotInput('');
    setBotMessages(prev => [...prev, { role: 'user', text: message }]);
    setBotBusy(true);
    try {
      const response = await api.post('/api/ai-support', { message, language });
      setBotMessages(prev => [...prev, { role: 'bot', text: response.data.reply }]);
    } catch {
      setBotMessages(prev => [...prev, { role: 'bot', text: 'Sorry, the support assistant is temporarily unavailable. Please try again.' }]);
    } finally { setBotBusy(false); }
  };

  return (
    <div className="site">
      <header className="nav">
        <div className="brand"><div className="brand-mark">GR</div><div><strong>GlobalRise</strong><span>INVESTMENTS</span></div></div>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
        <nav className={menu ? 'nav-links open' : 'nav-links'}>
          <a href="#home" onClick={() => setMenu(false)}>{t.home}</a><a href="#plans" onClick={() => setMenu(false)}>{t.plans}</a><a href="#process" onClick={() => setMenu(false)}>{t.process}</a><a href="#faq" onClick={() => setMenu(false)}>{t.faq}</a>
          <label className="language-select"><Languages size={15}/><select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>German</option></select></label>
          {user ? <><button className="outline" onClick={() => setDashboard(true)}><LayoutDashboard size={15}/> Dashboard</button><button className="primary small" onClick={() => void signOut()}><LogOut size={15}/> Sign out</button></> : <><button className="outline" onClick={() => void signIn()}>{t.login}</button><button className="primary small" onClick={() => startInvesting()}>{t.start}</button></>}
        </nav>
      </header>
      <main>
        <section id="home" className="hero"><div className="hero-copy"><div className="eyebrow"><ShieldCheck size={16}/> Transparent investing. Informed decisions.</div><h1>{t.hero1}<br/><em>{t.hero2}</em></h1><p>GlobalRise Investments provides a structured platform for investors to explore investment options, manage allocations, and track their portfolio in one place.</p><div className="hero-actions"><button className="primary" onClick={() => startInvesting()}>Start Investing <ArrowRight size={18}/></button><a className="text-link" href="#plans">{t.explore}</a></div><div className="trust-row"><span><LockKeyhole size={15}/> Secure account</span><span><FileCheck2 size={15}/> Verification workflow</span><span><Landmark size={15}/> Bank transfer</span></div></div><div className="hero-card"><div className="card-top"><span>Investment overview</span><span className="status-dot">●</span></div><div className="balance">Portfolio planning</div><div className="muted">Illustrative dashboard preview</div><div className="chart"><div className="chart-line"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div className="mini-stats"><div><b>$5,000+</b><span>Minimum allocation</span></div><div><b>$100,000+</b><span>Premium tier</span></div></div><div className="demo-note">Demo figures are illustrative and are not investment performance.</div></div></section>
        <section className="stats"><div><b>$5K</b><span>Starting allocation</span></div><div><b>4</b><span>Investment tiers</span></div><div><b>24/7</b><span>Account access</span></div><div><b>Secure</b><span>Verification process</span></div></section>
        <section id="plans" className="section"><div className="section-head"><div><div className="eyebrow">Investment options</div><h2>{t.choose}</h2></div><p>Review the available allocation ranges and risk profiles. Returns are not guaranteed and all investments carry risk.</p></div><div className="plans">{plans.map((plan, i) => <article className={i === 1 ? 'plan featured' : 'plan'} key={plan.name}>{i === 1 && <div className="popular">Popular</div>}<div className="plan-icon">{i + 1}</div><h3>{plan.name}</h3><div className="range">{plan.min} <span>to</span> {plan.max}</div><div className="plan-meta"><span>Risk: {plan.risk}</span><span>{plan.duration}</span></div><p>{plan.description}</p><button className={i === 1 ? 'primary full' : 'secondary full'} onClick={() => startInvesting(plan)}>Select plan <ArrowRight size={16}/></button></article>)}</div></section>
        <section id="process" className="section process-section"><div className="center-head"><div className="eyebrow">Simple onboarding</div><h2>From registration to investing</h2><p>Sign in securely, complete your investor profile, and follow the verification process before restricted investment functionality is enabled.</p></div><div className="steps"><div><span>01</span><UserRound/><h3>Create your account</h3><p>Use the secure GlobalRise sign-in window to create or access your investor account.</p></div><div><span>02</span><FileCheck2/><h3>Complete your profile</h3><p>Add your contact information and selected investment tier to your private profile.</p></div><div><span>03</span><Landmark/><h3>Fund by bank transfer</h3><p>Use only the verified bank instructions provided on the deposit page.</p></div><div><span>04</span><TrendingUp/><h3>Track your portfolio</h3><p>Access your account dashboard to review profile and investment information.</p></div></div></section>
        <section className="dashboard-preview"><div><div className="eyebrow">Investor dashboard</div><h2>Your account, securely in one view.</h2><p>Signed-in investors can manage their profile, review verification status and access account information.</p><ul><li><CheckCircle2/> Secure authenticated account</li><li><CheckCircle2/> Personal investor profile</li><li><CheckCircle2/> Verification status</li><li><CheckCircle2/> Investment plan selection</li></ul><button className="primary" onClick={() => user ? setDashboard(true) : void signIn()}>{user ? 'Open my dashboard' : 'Create / sign in'} <ArrowRight size={17}/></button></div><div className="dashboard"><div className="dash-nav">GLOBALRISE <span>Investor Dashboard</span></div><div className="dash-balance"><span>Account status</span><strong>{user ? 'Authenticated' : 'Secure access'}</strong><small>{user ? user.email : 'Sign in to view your private account'}</small></div><div className="dash-grid"><div><span>Investor</span><b>{user?.name || 'Not signed in'}</b></div><div><span>Plan</span><b>{profile?.plan || 'Not selected'}</b></div><div><span>Verification</span><b className={profile?.verificationStatus === 'Verified' ? 'verified' : ''}>{profile?.verificationStatus || 'Pending profile'}</b></div><div><span>Financial records</span><b>Protected</b></div></div></div></section>
        <section id="faq" className="section faq"><div className="center-head"><div className="eyebrow">Questions</div><h2>{t.questions}</h2></div>{['Is a return guaranteed?','How do I create an account?','How does investor verification work?','How can I fund my account?','Can I withdraw my investment?'].map((q, i) => <div className="faq-item" key={q}><button onClick={() => setFaq(faq === i ? null : i)}><span>{q}</span><ChevronDown className={faq === i ? 'rotate' : ''}/></button>{faq === i && <p>{i === 0 ? 'No. Investment returns are not guaranteed. All investments involve risk, and actual results may vary.' : i === 1 ? 'Select Investor Login or Get Started. GlobalRise opens a secure authentication window where you can create or access an account with a supported sign-in provider. After signing in, complete your investor profile.' : i === 2 ? 'You provide the required investor information, after which the platform can record your verification status. Identity-document collection should only be enabled with appropriate secure storage and compliance controls.' : i === 3 ? 'Bank transfer is supported. The official bank account details will be displayed here once they are supplied and verified by the business.' : 'Withdrawal availability, processing times and applicable conditions should be defined in the final investment agreement and platform terms.'}</p>}</div>)}</section>
        <section className="risk"><ShieldCheck size={25}/><div><strong>Important investment risk disclosure</strong><p>Investing involves risk, including possible loss of capital. The information on this website is for general information and does not constitute personalized financial advice or a guarantee of performance. Verify all company, regulatory and payment information before making an investment.</p></div></section>
      </main>
      <footer><div className="footer-brand"><div className="brand"><div className="brand-mark">GR</div><div><strong>GlobalRise</strong><span>INVESTMENTS</span></div></div><p>Growing opportunities. Building tomorrow.</p></div><div><h4>Platform</h4><a href="#plans">Investment Plans</a><a href="#process">How It Works</a><a href="#faq">FAQ</a></div><div><h4>Legal</h4><a href="#risk">Risk Disclosure</a><a href="#">Terms & Conditions</a><a href="#">Privacy Policy</a></div><div><h4>Investor</h4>{user ? <><button onClick={() => setDashboard(true)}>My Dashboard</button><button onClick={() => void signOut()}>Sign out</button></> : <button onClick={() => void signIn()}>Investor Login</button>}<button onClick={() => setModal('deposit')}>Bank Transfer</button></div><div className="footer-bottom">© 2026 GlobalRise Investments. All rights reserved. <span>Investment values can rise or fall.</span></div></footer>
      {botOpen && <div className="bot-panel"><div className="bot-head"><Bot size={20}/><div><strong>GlobalRise AI Support</strong><small>Ask about plans, onboarding or verification</small></div><button className="bot-close" onClick={() => setBotOpen(false)}><X size={18}/></button></div><div className="bot-body">{botMessages.map((msg, i) => <div key={i} className={'bot-msg ' + msg.role}>{msg.text}</div>)}{botBusy && <div className="bot-msg bot">Thinking...</div>}</div><div className="bot-disclaimer">AI support provides general information only. It does not provide personalized financial advice or guarantee investment results.</div><div className="bot-input"><input value={botInput} onChange={e => setBotInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void askBot(); }} placeholder="Ask GlobalRise AI..."/><button onClick={() => void askBot()} aria-label="Send"><Send size={17}/></button></div></div>}
      <button className="bot-toggle" onClick={() => setBotOpen(!botOpen)} aria-label="Open AI support"><Bot size={23}/></button>
      {dashboard && <div className="modal-backdrop dashboard-backdrop" onClick={() => setDashboard(false)}><div className="dashboard-shell" onClick={e => e.stopPropagation()}><aside className="dashboard-sidebar"><div className="dash-brand"><div className="brand-mark">GR</div><div><strong>GlobalRise</strong><span>INVESTMENTS</span></div></div><div className="dash-user"><div className="avatar">{(profile?.fullName || user?.name || 'I').slice(0, 1).toUpperCase()}</div><div><b>{profile?.fullName || user?.name || 'Investor'}</b><small>{user?.email}</small></div></div><nav className="dash-menu"><button className="active"><LayoutDashboard size={17}/> Overview</button><button onClick={() => { setDashboard(false); setModal('onboard'); }}><UserRound size={17}/> Profile</button><button onClick={() => { setRequestForm({ type: 'deposit', amount: '', reference: '' }); setDashboard(false); setModal('deposit'); }}><Landmark size={17}/> Fund account</button></nav><div className="dash-side-bottom">{user?.email === 'globalriseinvetment@gmail.com' && <button className="admin-side-btn" onClick={() => { setDashboard(false); setAdminOpen(true); void loadAdminRequests(); void loadAdminProfiles(); }}><ShieldCheck size={17}/> Admin Center</button>}<button className="signout-side" onClick={() => void signOut()}><LogOut size={17}/> Sign out</button></div></aside><section className="dashboard-main"><div className="dashboard-topbar"><div><span className="dash-kicker">Investor portal</span><h2>Account overview</h2><p>Welcome back, {profile?.fullName || user?.name || 'Investor'}.</p></div><button className="close dash-close" onClick={() => setDashboard(false)}><X/></button></div><div className="verification-banner"><div className="verification-icon"><ShieldCheck size={21}/></div><div><b>{profile?.verificationStatus === 'Verified' ? 'Account verified' : 'Verification in progress'}</b><span>{profile?.verificationStatus === 'Verified' ? 'Your investor profile has been approved.' : 'Complete your profile and wait for admin review before restricted investment activity.'}</span></div><span className={'status-pill ' + (profile?.verificationStatus === 'Verified' ? 'success' : 'pending')}>{profile?.verificationStatus || 'Pending profile'}</span></div><div className="dashboard-metrics"><div className="metric-card"><span>Investment plan</span><strong>{profile?.plan || 'Not selected'}</strong><small>Selected allocation tier</small></div><div className="metric-card"><span>Account status</span><strong>{profile?.verificationStatus === 'Verified' ? 'Verified' : 'Under review'}</strong><small>Identity & profile review</small></div><div className="metric-card"><span>Requests</span><strong>{requests.length}</strong><small>{requests.filter(r => r.status === 'Pending').length} awaiting review</small></div><div className="metric-card"><span>Financial balance</span><strong>Not recorded</strong><small>No live investment ledger connected</small></div></div><div className="dashboard-grid-main"><div className="panel-card allocation-card"><div className="panel-heading"><div><span>Portfolio allocation</span><h3>{profile?.plan || 'Choose an investment plan'}</h3></div><TrendingUp size={21}/></div><div className="allocation-placeholder"><div className="allocation-ring"><span>{profile?.plan ? 'PLAN' : '—'}</span></div><div><b>{profile?.plan ? 'Allocation profile selected' : 'No allocation selected'}</b><p>{profile?.plan ? 'Your selected tier is recorded in your investor profile. Live holdings and performance require a connected investment ledger.' : 'Choose an investment tier to complete your investor profile.'}</p></div></div><div className="panel-actions"><button className="primary" onClick={() => { setDashboard(false); setModal('onboard'); }}>Manage profile <ArrowRight size={16}/></button><button className="outline" onClick={() => { setRequestForm({ type: 'deposit', amount: '', reference: '' }); setDashboard(false); setModal('deposit'); }}>Fund account</button></div></div><div className="panel-card account-summary-card"><div className="panel-heading"><div><span>Account details</span><h3>Investor information</h3></div><UserRound size={20}/></div><div className="detail-list"><div><span>Full name</span><b>{profile?.fullName || user?.name || 'Not provided'}</b></div><div><span>Email</span><b>{user?.email || 'Not available'}</b></div><div><span>Country</span><b>{profile?.country || 'Not provided'}</b></div><div><span>Account ID</span><b>{user?.userId.slice(0, 12)}…</b></div></div></div></div><div className="panel-card transactions-card"><div className="panel-heading"><div><span>Recent activity</span><h3>Deposit & withdrawal requests</h3></div><span className="activity-count">{requests.length} total</span></div>{requests.length ? <div className="transaction-table">{requests.map(r => <div className="transaction-row" key={r.id}><div className="transaction-icon"><Landmark size={16}/></div><div className="transaction-main"><b>{r.type === 'deposit' ? 'Deposit request' : 'Withdrawal request'}</b><small>{new Date(r.id ? Date.now() : Date.now()).toLocaleDateString()} {r.reference ? `· Ref ${r.reference}` : ''}</small></div><strong>${r.amount.toLocaleString()}</strong><span className={'status-pill status-' + r.status.toLowerCase()}>{r.status}</span></div>)}</div> : <div className="empty-activity"><div><Landmark size={22}/></div><b>No transactions yet</b><p>Your deposit and withdrawal requests will appear here after submission.</p><div className="panel-actions"><button className="primary" onClick={() => { setRequestForm({ type: 'deposit', amount: '', reference: '' }); setDashboard(false); setModal('deposit'); }}>Make a deposit request</button></div></div>}</div><div className="dashboard-footer-note"><CircleAlert size={16}/><span>For transparency, this dashboard does not invent balances, profits, returns or performance figures. Financial values will only appear when connected to a verified investment ledger.</span></div></section></div></div>}
      {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setModal(null)}><X/></button>{modal === 'onboard' && <><div className="modal-icon"><UserRound/></div><h2>Investor profile</h2><p>Your secure account is already authenticated. Complete this profile so GlobalRise can record your selected tier and onboarding status.</p><div className="form-grid"><label>Full name<input value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} placeholder="Your full name"/></label><label>Phone number<input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone number"/></label><label>Country of residence<input value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} placeholder="Country"/></label><label>Investment plan<select value={profileForm.plan} onChange={e => setProfileForm({ ...profileForm, plan: e.target.value })}>{plans.map(plan => <option key={plan.name}>{plan.name}</option>)}</select></label></div><div className="notice"><ShieldCheck size={18}/><span>Your profile is stored against your authenticated account. Identity documents and financial records are not requested by this form.</span></div>{authError && <div className="form-error">{authError}</div>}<button className="primary full" disabled={authBusy || !profileForm.fullName.trim() || !profileForm.country.trim()} onClick={() => void saveProfile()}>{authBusy ? 'Saving…' : 'Save investor profile'} <ArrowRight size={17}/></button></>}{modal === 'deposit' && <><div className="modal-icon"><Landmark/></div><h2>{requestForm.type === 'withdrawal' ? 'Withdrawal request' : 'Deposit request'}</h2><p>{requestForm.type === 'withdrawal' ? 'Submit a withdrawal request for admin review. You will receive an email when the status changes.' : 'Submit a deposit request after verifying the official bank instructions. The request remains pending until admin review.'}</p><div className="bank-box"><div><span>Bank name</span><b>[BANK NAME TO BE ADDED]</b></div><div><span>Account name</span><b>[ACCOUNT NAME TO BE ADDED]</b></div><div><span>Account number</span><b>[ACCOUNT NUMBER TO BE ADDED]</b></div></div><label>Investment amount<input type="number" value={requestForm.amount} onChange={e => setRequestForm({ ...requestForm, amount: e.target.value })} placeholder="Enter amount"/></label><label>Transaction/reference number<input value={requestForm.reference} onChange={e => setRequestForm({ ...requestForm, reference: e.target.value })} placeholder="Enter transfer/reference number"/></label>{authError && <div className="form-error">{authError}</div>}<button className="primary full" disabled={authBusy} onClick={() => void submitRequest()}>{authBusy ? 'Submitting…' : 'Submit request'}</button><small>Do not transfer funds until the bank details have been verified.</small></>}</div></div>}
      {user?.email === 'globalriseinvetment@gmail.com' && <button className="admin-fab" onClick={() => { setAdminOpen(true); void loadAdminRequests(); void loadAdminProfiles(); }}>Admin approvals</button>}
      {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><div className="modal admin-modal" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setAdminOpen(false)}><X/></button><div className="modal-icon"><ShieldCheck/></div><h2>Admin approvals</h2><p>Review investor accounts, deposits and withdrawals. Decisions are recorded and email notifications are sent to investors.</p><div className="email-test-box"><div><b>Email notifications</b><small>Send a live Resend test to the configured admin inbox.</small></div><button className="outline" disabled={emailTestBusy} onClick={() => void testAdminEmail()}>{emailTestBusy ? 'Sending…' : 'Send test email'}</button>{emailTestMessage && <div className="email-test-result">{emailTestMessage}</div>}</div><div className="admin-section"><h3>Investor accounts</h3>{adminProfiles.map(p => <div className="admin-request" key={p.id}><div><b>{p.fullName}</b><small>{p.email} · {p.country} · {p.plan}</small><small>Verification: {p.verificationStatus}</small></div>{p.verificationStatus !== 'Verified' && <div className="modal-actions"><button className="primary" onClick={() => void updateAdminProfile(p.id, 'Verified')}>Approve signup</button><button className="secondary" onClick={() => void updateAdminProfile(p.id, 'Rejected')}>Reject</button></div>}</div>)}{adminProfiles.length === 0 && <p>No investor profiles found.</p>}</div><div className="admin-section"><h3>Deposit & withdrawal requests</h3>{adminRequests.map(r => <div className="admin-request" key={r.id}><div><b>{r.fullName || 'Investor'}</b><small>{r.email || 'No email'} · {r.type} · ${r.amount.toLocaleString()}</small><small>{r.reference ? `Reference: ${r.reference}` : 'No reference'} · {r.status}</small></div>{r.status === 'Pending' && <div className="modal-actions"><button className="primary" onClick={() => void updateAdminRequest(r.id, 'Approved')}>Approve</button><button className="secondary" onClick={() => void updateAdminRequest(r.id, 'Rejected')}>Reject</button></div>}</div>)}{adminRequests.length === 0 && <p>No pending or historical requests found.</p>}</div></div></div>}
      {authError && !modal && <div className="auth-toast">{authError}</div>}
    </div>
  );
}
export default App;
