import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/authUtil.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const context = {
  exports: {},
  require(name) {
    if (name === '@tanstack/react-router') return { redirect: (value) => value };
    if (name === '@/constants/supervisors') {
      return { SUPERVISOR_IDS: [], SUPERVISOR_ROLE_IDS: [], SUPERVISOR_ROLE_NAMES: [] };
    }
    throw new Error(`Unexpected import: ${name}`);
  }
};
vm.runInNewContext(compiled, context);
const { canAccessRoute, requireRole } = context.exports;
const user = (name) => ({
  id: 'test-user',
  role: { id: 999, name },
  // Even an explicit permission must not grant this superadmin-only page.
  permissions: [{ url: '/admin/cap7a', sidebar_items: [] }]
});

test('Cap7A allows normalized superadmin roles', () => {
  for (const name of ['super admin', 'super_admin', 'super-admin']) {
    assert.equal(canAccessRoute(user(name), '/admin/cap7a'), true);
    assert.doesNotThrow(() => requireRole(user(name), ['super admin']));
  }
});

test('Cap7A rejects other roles even with explicit permission', () => {
  for (const name of ['admin', 'co admin', 'employee']) {
    for (const path of ['/admin/cap7a', '/admin/cap7a/', '/admin/cap7a?tab=device']) {
      assert.equal(canAccessRoute(user(name), path), false);
    }
    assert.throws(() => requireRole(user(name), ['super admin']),
      (error) => error.to === '/forbidden');
  }
});

test('Cap7A rejects anonymous users', () => {
  assert.equal(canAccessRoute(null, '/admin/cap7a'), false);
  assert.throws(() => requireRole(null, ['super admin']), (error) => error.to === '/login');
});
