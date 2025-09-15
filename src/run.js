import 'dotenv/config';
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { makeProviderPool, feeOverrides, sleep, chunk, parseDelayRange, randomDelayMs } from './utils.js';
import { fetchProofAuto } from './proof.js';

const {
  BSC_RPC_URLS,
  CLAIM_CONTRACT,
  AIRDROP_ID,
  PROOF_AUTH_HEADER = '',
  PROOF_HEADERS_EXTRA = '',
  PROOF_COOKIE = '',
  GAS_MULTIPLIER = '1.15',
  MAX_CONCURRENCY = '1',
  DELAY_RANGE_SEC = '50,100'
} = process.env;

if (!BSC_RPC_URLS || !CLAIM_CONTRACT || !AIRDROP_ID) {
  throw new Error('Fill BSC_RPC_URLS, CLAIM_CONTRACT, AIRDROP_ID in .env');
}

const pool = makeProviderPool(BSC_RPC_URLS);
const gasMult = Number(GAS_MULTIPLIER);
const maxConc = Number(MAX_CONCURRENCY);
const delayRange = parseDelayRange(DELAY_RANGE_SEC);

const CLAIM_ABI = ['function claim(uint256 amount, bytes32[] proof) external'];

async function claimForKey(pk) {
  const priv = pk.startsWith('0x') ? pk : '0x' + pk;
  let wallet;
  try { wallet = new ethers.Wallet(priv); }
  catch { return { ok: false, msg: 'bad private key' }; }

  const provider = pool.next();
  const addr = await wallet.getAddress();
  const signer = wallet.connect(provider);
  const contract = new ethers.Contract(CLAIM_CONTRACT, CLAIM_ABI, signer);

  try {
    // 1) Витягуємо [amount, proof[]] авто-пошуком endpoint’а
    const { parsed, urlTried } = await fetchProofAuto(addr, AIRDROP_ID, PROOF_AUTH_HEADER, PROOF_HEADERS_EXTRA, PROOF_COOKIE);
    const [amount, proof] = parsed;

    // 2) Claim
    const fees = await feeOverrides(provider, gasMult);
    let gasLimit;
    try {
      gasLimit = await contract.claim.estimateGas(amount, proof);
    } catch (e) {
      return { ok: false, addr, msg: `estimateGas failed via ${provider.connection?.url || 'rpc'}: ${e.message}` };
    }

    const tx = await contract.claim(amount, proof, { ...fees, gasLimit: (gasLimit * 12n) / 10n, value: 0 });
    const rc = await tx.wait();
    return { ok: true, addr, tx: tx.hash, block: rc.blockNumber, rpc: provider.connection?.url || 'rpc', proofUrl: urlTried };
  } catch (e) {
    return { ok: false, addr, msg: e.message };
  }
}

async function main() {
  const keys = readFileSync('keys.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  if (!keys.length) throw new Error('keys.txt is empty');

  console.log(`RPCs: ${pool.size} | Concurrency: ${maxConc} | Delay: ${delayRange.minSec}-${delayRange.maxSec}s`);
  console.log(`Contract: ${CLAIM_CONTRACT} | Airdrop: ${AIRDROP_ID}\n`);

  let i = 0;
  for (const batch of chunk(keys, maxConc)) {
    const res = await Promise.all(batch.map(k => claimForKey(k)));
    for (const r of res) {
      i++;
      if (r.ok) console.log(`${i}. ✅ ${r.addr} | tx ${r.tx} | block ${r.block} | via ${r.rpc} | proof: ${r.proofUrl}`);
      else console.log(`${i}. ❌ ${r.addr ?? ''} ${r.msg}`);
      if (delayRange.maxSec > 0) await sleep(randomDelayMs(delayRange));
    }
  }
  console.log('\nDone.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
