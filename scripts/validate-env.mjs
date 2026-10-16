import { loadConfig } from '../packages/config/src/env.mjs';
const config = loadConfig(process.env);
const timeoutMs = Number(process.env.RPC_TIMEOUT_MS || 20000);
async function rpc(method, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.chain.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: controller.signal });
    if (!response.ok) throw new Error(method + ' HTTP ' + response.status);
    const body = await response.json();
    if (body.error) throw new Error(method + ' RPC ' + body.error.code + ': ' + body.error.message);
    return body.result;
  } finally { clearTimeout(timer); }
}
const liveChain = Number(BigInt(await rpc('eth_chainId', [])));
if (liveChain !== config.chain.id) throw new Error('RPC chainId mismatch: ENV=' + config.chain.id + ', RPC=' + liveChain);
const entries = Object.entries(process.env).filter(([key, value]) => key.endsWith('_ADDRESS') && key !== 'DBUS_SESSION_BUS_ADDRESS' && value?.trim());
let verified = 0;
for (const [key, address] of entries) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/i.test(address)) throw new Error(key + ' is not a nonzero EVM address');
  const code = await rpc('eth_getCode', [address, 'latest']);
  if (!code || code === '0x' || /^0x0*$/.test(code)) throw new Error(key + ' has no bytecode on configured chain');
  verified++;
}
if (process.env.TURKDEX_CHECK_API_HEALTH === 'true') {
  const response = await fetch(config.api.health, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error('TurkDex API health HTTP ' + response.status);
  const health = await response.json();
  if (Number(health.chainId ?? health.chain?.id) !== config.chain.id) throw new Error('API chainId mismatch');
}
console.log(JSON.stringify({ chainId: liveChain, configuredContracts: entries.length, bytecodeVerified: verified, protocols: config.protocols, apiHealthChecked: process.env.TURKDEX_CHECK_API_HEALTH === 'true' }));
