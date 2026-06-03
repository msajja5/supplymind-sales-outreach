import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Label, Btn, BtnRow } from '../components/Card';

export default function Settings() {
  const [keys, setKeys] = useState({
    groq_api_key: '',
    apollo_api_key: '',
    hunter_api_key: '',
    apify_api_key: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tool_configs').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setKeys({ groq_api_key: data.groq_api_key || '', apollo_api_key: data.apollo_api_key || '', hunter_api_key: data.hunter_api_key || '', apify_api_key: data.apify_api_key || '' });
  };

  const save = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('tool_configs').upsert({ user_id: user.id, ...keys }, { onConflict: 'user_id' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setLoading(false);
  };

  const inp = (label: string, key: keyof typeof keys, ph: string, helpUrl: string, helpText: string) => (
    <div style={{ marginBottom: 20 }}>
      <Label>{label}</Label>
      <input
        type="password"
        value={keys[key]}
        onChange={e => setKeys(k => ({ ...k, [key]: e.target.value }))}
        placeholder={ph}
        style={{ width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 4 }}
      />
      <div style={{ fontSize: 11, color: '#7a8ba6' }}>
        {helpText} <a href={helpUrl} target="_blank" rel="noreferrer" style={{ color: '#4f8ef7' }}>{helpUrl.replace('https://', '')}</a>
      </div>
    </div>
  );

  return (
    <div>
      <Card title="API Keys">
        <div style={{ background: '#1a2d1a', border: '1px solid #38c9a055', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#38c9a0', marginBottom: 20 }}>
          All keys are stored securely in your Supabase database and never shared.
        </div>

        {inp('Groq API Key (AI message generator - FREE)', 'groq_api_key', 'gsk_...', 'https://console.groq.com/keys', 'Free tier: 14,400 requests/day. Get your key at')}
        {inp('Apollo.io API Key (contact search)', 'apollo_api_key', 'apollo_...', 'https://app.apollo.io/#/settings/integrations/api', 'Free plan: 50 contacts/month. Get your key at')}
        {inp('Hunter.io API Key (email finder - FREE)', 'hunter_api_key', 'hunter_...', 'https://hunter.io/api-keys', 'Free plan: 25 searches/month. Get your key at')}
        {inp('Apify API Key (LinkedIn scraper)', 'apify_api_key', 'apify_api_...', 'https://console.apify.com/account/integrations', 'Free $5 credits/month. Get your key at')}

        <BtnRow>
          <Btn onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save API Keys'}</Btn>
          {saved && <span style={{ color: '#38c9a0', fontSize: 13, alignSelf: 'center' }}>Saved!</span>}
        </BtnRow>
      </Card>

      <Card title="Free Tier Limits">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Service', 'Free Limit', 'Paid Upgrade'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#7a8ba6', borderBottom: '1px solid #2a3348' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Groq (AI)', '14,400 req/day', '$0.05 / 1M tokens'],
              ['Apollo.io', '50 contacts/month', '$49/mo (Basic)'],
              ['Hunter.io', '25 searches/month', '$34/mo (Starter)'],
              ['Apify', '$5 free credits', '$49/mo (Starter)'],
            ].map(([svc, free, paid]) => (
              <tr key={svc} style={{ borderBottom: '1px solid #1a2035' }}>
                <td style={{ padding: '8px 12px', color: '#e8ecf4', fontWeight: 600 }}>{svc}</td>
                <td style={{ padding: '8px 12px', color: '#38c9a0' }}>{free}</td>
                <td style={{ padding: '8px 12px', color: '#7a8ba6' }}>{paid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
