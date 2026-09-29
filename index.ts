import { router, json, error, requireAuth, requireAdminEmailAllowlist, ai, db, secrets } from '@appdeploy/sdk';

type InvestorProfile = { userId: string; email: string; fullName: string; phone: string; country: string; plan: string; verificationStatus: 'Pending profile' | 'Under Review' | 'Verified' | 'Rejected'; createdAt: string; updatedAt: string; adminNote?: string; };
const profileTable = 'investor_profiles';
const requestTable = 'investment_requests';
const ADMIN_EMAILS = ['globalriseinvetment@gmail.com'];

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = await secrets.readSecret('RESEND_API_KEY');
  const fromEmail = (await secrets.readSecret('RESEND_FROM_EMAIL')).trim();
  const from = `GlobalRise Investments <${fromEmail}>`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
  const body = await response.text();
  let detail = '';
  try { const parsed = JSON.parse(body) as { message?: string; name?: string }; detail = parsed.message || parsed.name || ''; } catch { detail = body.slice(0, 240); }
  if (!response.ok) throw new Error(`Resend rejected the email (${response.status})${detail ? `: ${detail}` : ''}`);
  return { ok: true };
}
async function notifyAdmin(subject: string, html: string) { await sendEmail(ADMIN_EMAILS[0], subject, html); }
async function findProfileByUserId(userId: string) { const { items } = await db.list<InvestorProfile>(profileTable, { limit: 100 }); return items.find(item => item.userId === userId) || null; }

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/ai-support': [async ({ body }) => {
    const input = body as { message?: string; language?: string };
    if (!input?.message?.trim()) return error('Message is required', 400);
    try { const result = await ai.generate({ system: 'You are the GlobalRise Investments website support assistant. Be professional, concise, and transparent. Explain investment plans, onboarding, identity verification, bank-transfer funding, dashboard navigation, and risk disclosures. Never promise profits, guarantee returns, invent regulatory licenses, invent bank details, or provide personalized financial advice. Respond in the requested language when possible. Requested language: ' + (input.language || 'English'), prompt: input.message.trim(), maxTokens: 350, temperature: 0.3, thinkingMode: 'FAST' }); return json({ reply: result.text }); } catch (err) { console.error('AI support error', err); return error('The support assistant is temporarily unavailable. Please try again.', 503); }
  }],
  'GET /api/investor/profile': [requireAuth(), async ({ user }) => { const record = await findProfileByUserId(user!.userId); return json({ profile: record ?? null }); }],
  'PUT /api/investor/profile': [requireAuth(), async ({ body, user }) => {
    const input = body as { fullName?: string; phone?: string; country?: string; plan?: string };
    if (!input.fullName?.trim() || !input.country?.trim()) return error('Full name and country are required.', 400);
    const allowedPlans = new Set(['Starter', 'Growth', 'Professional', 'Premium']);
    if (!allowedPlans.has(input.plan || '')) return error('Please select a valid investment plan.', 400);
    const existing = await findProfileByUserId(user!.userId);
    const now = new Date().toISOString();
    const profile: InvestorProfile = { userId: user!.userId, email: user!.email || '', fullName: input.fullName.trim(), phone: input.phone?.trim() || '', country: input.country.trim(), plan: input.plan || 'Starter', verificationStatus: existing?.verificationStatus || 'Pending profile', createdAt: existing?.createdAt || now, updatedAt: now };
    if (existing) { const existingId = (existing as InvestorProfile & { id: string }).id; const updated = await db.update(profileTable, [{ id: existingId, record: profile as unknown as Record<string, unknown> }]); if (!updated[0]) return error('Unable to update investor profile.', 500); }
    else { const ids = await db.add(profileTable, [profile as unknown as Record<string, unknown>]); if (!ids[0]) return error('Unable to create investor profile.', 500); try { await notifyAdmin('New GlobalRise investor signup', `<h2>New investor profile</h2><p><b>Name:</b> ${profile.fullName}</p><p><b>Email:</b> ${profile.email || 'Not available'}</p><p><b>Country:</b> ${profile.country}</p><p><b>Plan:</b> ${profile.plan}</p><p>Review this investor from the admin approvals panel.</p>`); } catch (err) { console.error('Signup admin email error', err); } }
    return json({ profile });
  }],
  'POST /api/investor/requests': [requireAuth(), async ({ body, user }) => {
    const input = body as { type?: string; amount?: number; reference?: string };
    if (!['deposit', 'withdrawal'].includes(input.type || '')) return error('Invalid request type.', 400);
    if (!Number.isFinite(input.amount) || Number(input.amount) <= 0) return error('Enter a valid amount.', 400);
    const [profile] = await db.get<InvestorProfile>(profileTable, [user!.userId]);
    if (!profile) return error('Complete your investor profile first.', 400);
    const now = new Date().toISOString();
    const request = { userId: user!.userId, email: user!.email || '', fullName: profile.fullName, type: input.type, amount: Number(input.amount), reference: input.reference?.trim() || '', status: 'Pending', createdAt: now, updatedAt: now };
    const [id] = await db.add(requestTable, [request]);
    if (!id) return error('Unable to submit request.', 500);
    try { await notifyAdmin(`GlobalRise ${input.type} request`, `<h2>New ${input.type} request</h2><p><b>Investor:</b> ${profile.fullName}</p><p><b>Email:</b> ${user!.email || 'Not available'}</p><p><b>Amount:</b> ${Number(input.amount).toLocaleString()}</p><p><b>Reference:</b> ${request.reference || 'None'}</p><p>Review this request in the GlobalRise admin panel.</p>`); } catch (err) { console.error('Admin email error', err); }
    return json({ request: { id, ...request } }, 201);
  }],
  'GET /api/investor/requests': [requireAuth(), async ({ user }) => { const { items } = await db.list(requestTable, { limit: 100 }); return json({ requests: items.filter(item => item.userId === user!.userId) }); }],
  'GET /api/admin/profiles': [requireAdminEmailAllowlist(ADMIN_EMAILS), async () => { const { items } = await db.list(profileTable, { limit: 100 }); return json({ profiles: items }); }],
  'PUT /api/admin/profiles/:id': [requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ params, body }) => {
    const input = body as { status?: string; note?: string };
    if (!['Verified', 'Rejected'].includes(input.status || '')) return error('Status must be Verified or Rejected.', 400);
    const [existing] = await db.get(profileTable, [params.id]);
    if (!existing) return error('Investor profile not found.', 404);
    const updated = { ...existing, verificationStatus: input.status === 'Verified' ? 'Verified' : 'Rejected', adminNote: input.note?.trim() || '', updatedAt: new Date().toISOString() };
    const [ok] = await db.update(profileTable, [{ id: params.id, record: updated }]);
    if (!ok) return error('Unable to update investor profile.', 500);
    if (existing.email) { try { await sendEmail(existing.email, `GlobalRise account ${input.status.toLowerCase()}`, `<h2>Your GlobalRise investor account has been ${input.status.toLowerCase()}</h2><p>Status: <b>${input.status}</b></p>${input.note ? `<p>Admin note: ${input.note}</p>` : ''}<p>Please sign in to your account for the latest status.</p>`); } catch (err) { console.error('Profile email error', err); } }
    return json({ profile: { id: params.id, ...updated } });
  }],
  'GET /api/admin/requests': [requireAdminEmailAllowlist(ADMIN_EMAILS), async () => { const { items } = await db.list(requestTable, { limit: 100 }); return json({ requests: items }); }],
  'PUT /api/admin/requests/:id': [requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ params, body }) => {
    const input = body as { status?: string; note?: string };
    if (!['Approved', 'Rejected'].includes(input.status || '')) return error('Status must be Approved or Rejected.', 400);
    const [existing] = await db.get(requestTable, [params.id]);
    if (!existing) return error('Request not found.', 404);
    const updated = { ...existing, status: input.status, adminNote: input.note?.trim() || '', updatedAt: new Date().toISOString() };
    const [ok] = await db.update(requestTable, [{ id: params.id, record: updated }]);
    if (!ok) return error('Unable to update request.', 500);
    if (existing.email) { try { await sendEmail(existing.email, `GlobalRise ${existing.type} request ${input.status.toLowerCase()}`, `<h2>Your ${existing.type} request has been ${input.status.toLowerCase()}</h2><p>Amount: ${Number(existing.amount).toLocaleString()}</p><p>Status: <b>${input.status}</b></p>${input.note ? `<p>Admin note: ${input.note}</p>` : ''}<p>Please sign in to your GlobalRise account for your latest request status.</p>`); } catch (err) { console.error('Investor email error', err); } }
    return json({ request: { id: params.id, ...updated } });
  }],
  'GET /api/admin/email-test': [requireAdminEmailAllowlist(ADMIN_EMAILS), async () => { const names = await secrets.listSecretNames(); if (!names.includes('RESEND_API_KEY')) return error('RESEND_API_KEY is not configured.', 503); try { await sendEmail(ADMIN_EMAILS[0], 'GlobalRise email delivery test', `<h2>GlobalRise email test</h2><p>This is a live delivery test from the GlobalRise Investments notification service.</p><p>If you received this message, the Resend connection is working.</p>`); return json({ sent: true, recipient: ADMIN_EMAILS[0] }); } catch (err) { console.error('Admin email test error', err); return error(err instanceof Error ? err.message : 'Email test failed.', 502); } }],
  'GET /api/admin/status': [requireAdminEmailAllowlist(ADMIN_EMAILS), async () => { const names = await secrets.listSecretNames(); return json({ adminEmail: ADMIN_EMAILS[0], emailConfigured: names.includes('RESEND_API_KEY'), fromAddress: 'onboarding@resend.dev' }); }],
});
