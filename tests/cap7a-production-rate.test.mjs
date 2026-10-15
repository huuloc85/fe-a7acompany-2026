import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/admin/cap7a/productionRate.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { appendRateSample, productionRate } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const sample = (time, ok, ng = 0, session = 'a') => ({ time, ok, ng, session });

test('rate counts OK + NG and estimates 100 products', () => {
  const rate = productionRate([sample(1000, 10), sample(11000, 28, 2)]);
  assert.equal(rate, 2);
  assert.equal(100 / rate, 50);
});
test('warmup and zero production do not invent an ETA', () => {
  assert.equal(productionRate([]), null);
  assert.equal(productionRate([sample(1000, 10), sample(9000, 12)]), null);
  assert.equal(productionRate([sample(1000, 10), sample(11000, 10)]), 0);
});
test('reset, restart, clock reversal and long gaps start new samples', () => {
  const history = [sample(1000, 10, 2)];
  for (const next of [sample(2000, 1), sample(2000, 11, 1), sample(2000, 11, 2, 'b'), sample(500, 11, 2), sample(22000, 11, 2)]) {
    assert.deepEqual(appendRateSample(history, next), [next]);
  }
});
test('duplicate telemetry does not add time or products', () => {
  const history = [sample(1000, 10)];
  assert.equal(appendRateSample(history, sample(1000, 10)), history);
});
test('window excludes samples older than 60 seconds', () => {
  const history = [sample(1000, 1), sample(21000, 21), sample(41000, 41), sample(61000, 61)];
  const next = appendRateSample(history, sample(71000, 71));
  assert.equal(next[0].time, 21000);
  assert.equal(productionRate(next), 1);
});
