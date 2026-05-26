/**
 * test-icafecloud.js
 * Quick sanity tests for the status-detection logic (no network needed).
 * Run with: npm test
 */

const assert = require('assert');
const { isPcInUse, extractPcArray } = require('../src/icafecloud');

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, `FAILED: ${name}`);
  console.log(`  ✓ ${name}`);
  passed++;
}

console.log('isPcInUse():');
ok('pc_using = 1 -> in use',            isPcInUse({ pc_using: 1 }) === true);
ok('status = 1 -> in use',              isPcInUse({ status: 1 }) === true);
ok('pc_status "using" -> in use',       isPcInUse({ pc_status: 'using' }) === true);
ok('member attached -> in use',         isPcInUse({ member_id: 4321 }) === true);
ok('session attached -> in use',        isPcInUse({ session_id: 'abc' }) === true);
ok('status = 0 -> free',                isPcInUse({ status: 0 }) === false);
ok('pc_status "free" -> free',          isPcInUse({ pc_status: 'free' }) === false);
ok('pc_status "standby" -> free',       isPcInUse({ pc_status: 'standby' }) === false);
ok('offline / empty -> free',           isPcInUse({ pc_status: 'offline', member_id: 0 }) === false);
ok('null -> free',                      isPcInUse(null) === false);

console.log('\nextractPcArray():');
ok('data.pcs array',  extractPcArray({ data: { pcs: [{}, {}] } }).length === 2);
ok('data array',      extractPcArray({ data: [{}, {}, {}] }).length === 3);
ok('top-level array', extractPcArray([{}, {}]).length === 2);
ok('data.bootPcs',    extractPcArray({ data: { bootPcs: [{}] } }).length === 1);
ok('empty/unknown',   extractPcArray({ foo: 'bar' }).length === 0);

console.log('\nintegration: count occupied out of a mixed list:');
const sample = [
  { pc_name: 'PC-01', status: 1 },
  { pc_name: 'PC-02', status: 0 },
  { pc_name: 'PC-03', pc_status: 'using' },
  { pc_name: 'PC-04', pc_status: 'free' },
  { pc_name: 'PC-05', member_id: 99 },
  { pc_name: 'PC-06', pc_status: 'standby' },
];
const inUse = sample.filter(isPcInUse).length;
ok(`3 of 6 in use (got ${inUse})`, inUse === 3);

console.log(`\nAll ${passed} tests passed ✅`);
