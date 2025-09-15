import { ethers } from 'ethers';

export const sleep = (ms) => new Promise(res => setTimeout(res, ms));
export const chunk = (arr, n) => arr.reduce((a, _, i) => (i % n ? a : [...a, arr.slice(i, i + n)]), []);

function createProvider(url) {
  if (url.startsWith('ws')) return new ethers.WebSocketProvider(url);
  return new ethers.JsonRpcProvider(url);
}

export function makeProviderPool(csvUrls) {
  const urls = csvUrls.split(',').map(s => s.trim()).filter(Boolean);
  if (!urls.length) throw new Error('BSC_RPC_URLS is empty');
  const providers = urls.map(createProvider);
  let i = 0;
  return {
    next() { const p = providers[i % providers.length]; i++; return p; },
    size: providers.length,
    urls
  };
}

export async function feeOverrides(provider, mult) {
  const fee = await provider.getFeeData();
  const o = {};
  if (fee.maxFeePerGas && fee.maxPriorityFeePerGas) {
    const m = BigInt(Math.ceil(mult * 100));
    o.maxFeePerGas = (fee.maxFeePerGas * m) / 100n;
    o.maxPriorityFeePerGas = (fee.maxPriorityFeePerGas * m) / 100n;
  } else if (fee.gasPrice) {
    o.gasPrice = fee.gasPrice * BigInt(Math.ceil(mult * 100)) / 100n;
  }
  return o;
}

export function parseDelayRange(s) {
  const [a, b] = (s || '').split(',').map(x => Number(x.trim())).filter(x => Number.isFinite(x));
  const min = Math.max(0, (a ?? 0));
  const max = Math.max(min, (b ?? min));
  return { minSec: min, maxSec: max };
}

export function randomDelayMs(range) {
  const sec = Math.random() * (range.maxSec - range.minSec) + range.minSec;
  return Math.round(sec * 1000);
}
