const checks = [
  ['/health', v => v.status === 'ok' && v.database === 'connected'],
  ['/api/v1', v => v.application === 'BloodBridge'],
  ['/api/v1/locations/provinces', v => Array.isArray(v.data) && v.data.length > 0],
  ['/api/v1/locations/districts?provinceCode=WP', v => Array.isArray(v.data)],
  ['/api/v1/camps', v => Array.isArray(v.data)],
];
let bad = 0;
for (const [path, pass] of checks) {
  try {
    const r = await fetch('http://localhost:4000' + path,{ signal: AbortSignal.timeout(5000) });
    const json = await r.json();
    const ok = r.ok && pass(json);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${path} (${r.status})`);
    if(!ok) bad++;
  } catch(e) { console.error(`FAIL ${path}: ${e.message}`);bad++; }
}
if(bad){console.error(`${bad} smoke checks failed. Check docker compose logs.`);process.exitCode=1;}
else console.log('Basic smoke checks passed. Run full business workflow tests separately.');
