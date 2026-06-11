import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const FIELDS = [
  {
    section: 'Multiplayer',
    fields: [
      { key: 'multiplayer_min_players',              label: 'Min Players to Start',   type: 'number', placeholder: '2',  sub: 'Minimum players required before a room can auto-start' },
      { key: 'multiplayer_default_max_players',      label: 'Default Max Players',     type: 'number', placeholder: '10', sub: 'Default room capacity when creating a new room' },
      { key: 'multiplayer_start_threshold_percent',  label: 'Auto-start Threshold %',  type: 'number', placeholder: '80', sub: 'Room starts when this % of max capacity is reached (and min players met)' },
    ],
  },
  {
    section: 'Global',
    fields: [
      { key: 'ads_enabled', label: 'Ads Enabled', type: 'toggle', sub: 'Master switch — controls ads for all users on the server' },
    ],
  },
  {
    section: 'AdMob',
    fields: [
      { key: 'admob_banner_android', label: 'Banner Ad Unit ID (Android)', placeholder: 'ca-app-pub-XXXXXXXX/XXXXXXXXXX' },
      { key: 'admob_banner_ios', label: 'Banner Ad Unit ID (iOS)', placeholder: 'ca-app-pub-XXXXXXXX/XXXXXXXXXX' },
      { key: 'admob_interstitial_android', label: 'Interstitial Ad Unit ID (Android)', placeholder: 'ca-app-pub-XXXXXXXX/XXXXXXXXXX' },
      { key: 'admob_interstitial_ios', label: 'Interstitial Ad Unit ID (iOS)', placeholder: 'ca-app-pub-XXXXXXXX/XXXXXXXXXX' },
    ],
  },
  {
    section: 'AppLovin MAX',
    fields: [
      { key: 'applovin_sdk_key', label: 'SDK Key', placeholder: 'Your AppLovin SDK key' },
      { key: 'applovin_banner_ad_unit', label: 'Banner Ad Unit ID', placeholder: 'Your banner ad unit ID' },
      { key: 'applovin_interstitial_ad_unit', label: 'Interstitial Ad Unit ID', placeholder: 'Your interstitial ad unit ID' },
    ],
  },
];

export default function AdSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => setSettings(data.settings))
      .finally(() => setLoading(false));
  }, []);

  function setVal(key, val) { setSettings((s) => ({ ...s, [key]: val })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/admin/settings', settings);
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save settings.');
    } finally { setSaving(false); }
  }

  if (loading) return <p style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</p>;

  return (
    <>
      <div className="page-header">
        <h1>Ad Settings</h1>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave}>
        {FIELDS.map(({ section, fields }) => (
          <div className="card" key={section}>
            <p className="section-heading">{section}</p>
            {fields.map((f) =>
              f.type === 'number' ? (
                <div className="form-group" key={f.key}>
                  <label>{f.label}{f.sub && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{f.sub}</span>}</label>
                  <input
                    type="number"
                    min="1"
                    value={settings[f.key] || ''}
                    onChange={(e) => setVal(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ maxWidth: 120 }}
                  />
                </div>
              ) : f.type === 'toggle' ? (
                <div className="toggle-row" key={f.key}>
                  <div>
                    <div className="toggle-label">{f.label}</div>
                    {f.sub && <div className="toggle-sub">{f.sub}</div>}
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings[f.key] === 'true'}
                      onChange={(e) => setVal(f.key, e.target.checked ? 'true' : 'false')}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ) : (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    value={settings[f.key] || ''}
                    onChange={(e) => setVal(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              )
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </>
  );
}
