import fetch from 'node-fetch';

function parseJson(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

// Кандидатні URL-и для Xterio BNB claim.
// Частина — із ?address= (краще для масового режиму), частина — сесійні.
function buildCandidates(appBase, apiBase, airdropId, address) {
  const urls = [];
  // GET із адресою в query (стабільний)
  urls.push(`${apiBase}/airdrop/v1/user/query/claim/${airdropId}?address=${address}`);
  urls.push(`${apiBase}/airdrop/v1/user/claim/${airdropId}?address=${address}`);
  urls.push(`${apiBase}/airdrop/v1/airdrop/${airdropId}/proof?address=${address}`);
  urls.push(`${apiBase}/airdrop/v1/proof?airdrop_id=${airdropId}&address=${address}`);
  // сесійні/фронтові
  urls.push(`${apiBase}/airdrop/v1/user/query/claim/${airdropId}`);
  urls.push(`${appBase}/api/airdrop/${airdropId}/proof?address=${address}`);
  return urls;
}

async function httpGet(url, headers) {
  const r = await fetch(url, { method: 'GET', headers });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

// Повертає { json, parsed:[amount,proof[]], urlTried }
export async function fetchProofAuto(address, airdropId, authHeader='', headersExtra='', cookie='') {
  const headers = { accept: 'application/json', ...parseJson(headersExtra) };
  if (authHeader) headers.authorization = authHeader;
  if (cookie) headers.cookie = cookie;

  const API = 'https://api.xter.io';
  const APP = 'https://app.xter.io';
  const candidates = buildCandidates(APP, API, airdropId, address);

  let lastErr = null;
  for (const url of candidates) {
    try {
      const j = await httpGet(url, headers);
      const parsed = normalizeProofResponse(j);
      if (parsed) return { json: j, parsed, urlTried: url };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`No working proof endpoint found. Last error: ${lastErr?.message || 'n/a'}`);
}

// Нормалізуємо різні формати у [amount, proof[]] під claim(uint256,bytes32[])
export function normalizeProofResponse(proofData) {
  const first = Array.isArray(proofData?.data) ? proofData.data[0] : null;

  let amount =
    first?.amount ??
    proofData.amount ?? proofData.value ?? proofData.balance ?? proofData.claimAmount;

  let proof =
    first?.address_build?.merkle_proofs ??
    proofData.proof ?? proofData.merkleProof ?? proofData.proofs ?? proofData.merkle_proof;

  if (!amount || !Array.isArray(proof) || proof.length === 0) return null;
  if (typeof amount === 'string' && !amount.startsWith('0x')) amount = BigInt(amount);
  return [amount, proof];
}
