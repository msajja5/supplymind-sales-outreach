import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Label, Btn, BtnRow } from '../components/Card';

export default function Settings() {
  const [keys, setKeys] = useState({
    groq_api_key: '',
    pdl_api_key: '',
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
    if (data) setKeys({
      groq_api_key: data.groq_api_key || '',
      pdl_api_key: data.pdl_api_key || '',
      hunter_api_key: data.hunter_api_key || '',
      apify_api_key: data.apify_api_key || '',
    });
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

  const apiKeys = [
    { label: 'Groq API Key (AI Generator - FREE 14,400 req/day)', key: 'groq_api_key' as const, ph: 'gsk_...', url: 'https://console.groq.com/keys', help: 'Free forever. Get key at' },
    { label: 'People Data Labs API Key (Contact Search - FREE 100 calls/mo)', key: 'pdl_api_key' as const, ph: 'pk_live_...', url: 'https://dashboard.peopledatalabs.com/api-keys', help: 'Free 100 API calls/month. Get key at' },
    { label: 'Hunter.io API Key (Email Finder - FREE 25/mo)', key: 'hunter_api_key' as const, ph: 'hunter_...', url: 'https://hunter.io/api-keys', help: 'Free 25 searches/month. Get key at' },
    { label: 'Apify API Key (LinkedIn Scraper - FREE $5 credits/mo)', key: 'apify_api_key' as const, ph: 'apify_api_...', url: 'https://console.apify.com/account/integrations', help: 'Free $5 credits/month. Get key at' },
  ];

  return (
    <div>
      <Card title="API Keys">
        <div style={{ background: '#1a2d1a', border: '1px solid #38c9a055', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#38c9a0', marginBottom: 20 }}>
          All keys stored securely in your database. All services below have generous free tiers.
        </div>
        {apiKeys.map(({ label, key, ph, url, help }) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <Label>{label}</Label>
            <input
              type="password"
              value={keys[key]}
              onChange={e => setKeys(k => ({ ...k, [key]: e.target.value }))}
              placeholder={ph}
              style={{ width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 4 }}
            />
            <div style={{ fontSize: 11, color: '#7a8ba6' }}>
              {help} <a href={url} target="_blank" rel="noreferrer" style={{ color: '#4f8ef7' }}>{url.replace('https://', '')}</a>
            </div>
          </div>
        ))}
        <BtnRow>
          <Btn onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save API Keys'}</Btn>
          {saved && <span style={{ color: '#38c9a0', fontSize: 13, alignSelf: 'center' }}>Saved!</span>}
        </BtnRow>
      </Card>

      <Card title="Free Tier Summary">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Service', 'Use', 'Free Limit', 'Sign Up'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#7a8ba6', borderBottom: '1px solid #2a3348' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[
              ['Groq', 'AI messages', '14,400 req/day', 'console.groq.com'],
              ['People Data Labs', 'Contact search', '100 calls/month', 'peopledatalabs.com'],
              ['Hunter.io', 'Email finder', '25 searches/month', 'hunter.io'],
              ['Apify', 'LinkedIn scraper', '$5 free credits/month', 'console.apify.com'],
            ].map(([svc, use, free, link]) => (
              <tr key={svc} style={{ borderBottom: '1px solid #1a2035' }}>
                <td style={{ padding: '8px 10px', color: '#e8ecf4', fontWeight: 600 }}>{svc}</td>
                <td style={{ padding: '8px 10px', color: '#7a8ba6' }}>{use}</td>
                <td style={{ padding: '8px 10px', color: '#38c9a0' }}>{free}</td>
                <td style={{ padding: '8px 10px' }}><a href={'https://' + link} target="_blank" rel="noreferrer" style={{ color: '#4f8ef7', fontSize: 12 }}>{link}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
