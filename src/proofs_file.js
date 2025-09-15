import { readFileSync } from 'fs';

export function loadProofsJsonl(path) {
  const map = new Map(); // address(lower) -> { amount, proof }
  const txt = readFileSync(path, 'utf8');
  for (const line of txt.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      const j = JSON.parse(s);
      const addr = String(j.address || j.addr || '').toLowerCase();
      let amount = j.amount ?? j.value ?? j.balance ?? j.claimAmount;
      const proof = j.proof ?? j.merkleProof ?? j.proofs ?? j.merkle_proof ?? j.address_build?.merkle_proofs;
      if (!addr || !amount || !Array.isArray(proof) || proof.length === 0) continue;
      if (typeof amount === 'string' && !amount.startsWith('0x')) amount = BigInt(amount);
      map.set(addr, { amount, proof });
    } catch {}
  }
  return map;
}
