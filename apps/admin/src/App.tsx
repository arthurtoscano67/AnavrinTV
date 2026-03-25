import { useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type SimPayload = {
  operation: 'UPLOAD' | 'RENEWAL' | 'RENTAL' | 'PURCHASE' | 'TIP';
  selector: {
    userId?: string;
    creatorTier?: string;
    walletAddress?: string;
    campaignId?: string;
    creatorId?: string;
    channelId?: string;
    region?: string;
  };
  request: {
    sizeBytes: string;
    durationSeconds: number;
    basePriceMist: string;
    epochs: number;
  };
};

export function App() {
  const [target, setTarget] = useState('');
  const [patch, setPatch] = useState('{"uploadFlatMist":"0"}');
  const [preview, setPreview] = useState('');
  const payload = useMemo<SimPayload>(
    () => ({
      operation: 'UPLOAD',
      selector: {
        ...(target ? { userId: target } : {}),
      },
      request: {
        sizeBytes: '1200000000',
        durationSeconds: 180,
        basePriceMist: '0',
        epochs: 1,
      },
    }),
    [target],
  );

  async function runPreview() {
    const response = await fetch(`${API}/fee/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setPreview(JSON.stringify(json, null, 2));
  }

  async function saveOverride() {
    const parsedPatch = JSON.parse(patch) as Record<string, string | number | boolean>;
    const response = await fetch(`${API}/admin/overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'INDIVIDUAL',
        priority: 10,
        selector: { userId: target },
        patch: parsedPatch,
        reason: 'Admin direct override',
      }),
    });
    const json = await response.json();
    setPreview(JSON.stringify(json, null, 2));
  }

  return (
    <main>
      <h1>OnReel Admin Override Console</h1>
      <p>Search user/creator/wallet, assign override rules, then simulate effective fees before publishing.</p>
      <div className="grid">
        <section className="card">
          <label htmlFor="target">Target User ID</label>
          <input id="target" value={target} onChange={(event) => setTarget(event.target.value)} />
          <label htmlFor="patch">Patch JSON</label>
          <textarea id="patch" rows={8} value={patch} onChange={(event) => setPatch(event.target.value)} />
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={runPreview}>Preview Effective Fee</button>
            <button onClick={saveOverride}>Save Override</button>
          </div>
        </section>
        <section className="card">
          <h3>Result</h3>
          <pre>{preview || 'No output yet.'}</pre>
        </section>
      </div>
    </main>
  );
}
