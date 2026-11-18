/**
 * Security Rules Verification Spec (Payload-First TDD Reference)
 * Verifies all 12 Dirty Dozen adversarial payloads against firestore.rules invariants.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read on products',
    collection: 'products/prod_pd',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Email spoofing with email_verified = false',
    collection: 'products/prod_pd',
    operation: 'create',
    auth: { uid: 'attacker1', email: 'triyantoandi80@gmail.com', email_verified: false },
    payload: { code: 'PD', name: 'Kurma', unit: 'Box', harga: 1000, workspaceId: 'pim-utama' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-assigned admin role on /users create',
    collection: 'users/user123',
    operation: 'create',
    auth: { uid: 'user123', email: 'outsider@gmail.com', email_verified: true },
    payload: { uid: 'user123', email: 'outsider@gmail.com', displayName: 'Outsider', role: 'admin', status: 'active' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-escalation on /users update',
    collection: 'users/user123',
    operation: 'update',
    auth: { uid: 'user123', email: 'staff@gmail.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'PII read of another user profile',
    collection: 'users/other_uid',
    operation: 'get',
    auth: { uid: 'user123', email: 'staff@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unauthorized outsider listing /sales',
    collection: 'sales',
    operation: 'list',
    auth: { uid: 'outsider99', email: 'random@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow field injection on /products create',
    collection: 'products/prod_test',
    operation: 'create',
    auth: { uid: 'admin_uid', email: 'triyantoandi80@gmail.com', email_verified: true },
    payload: { code: 'TEST', name: 'Test', unit: 'Box', harga: 1000, workspaceId: 'pim-utama', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID poisoning with invalid characters',
    collection: 'products/bad$id!@#',
    operation: 'create',
    auth: { uid: 'admin_uid', email: 'triyantoandi80@gmail.com', email_verified: true },
    payload: { code: 'TEST', name: 'Test', unit: 'Box', harga: 1000, workspaceId: 'pim-utama' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Forged client timestamp on /sales create',
    collection: 'sales/sale_1',
    operation: 'create',
    auth: { uid: 'staff_uid', email: 'staff@gmail.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable createdBy modification on /sales update',
    collection: 'sales/sale_1',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'triyantoandi80@gmail.com', email_verified: true },
    payload: { createdBy: 'another_uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Negative quantity in /sales create',
    collection: 'sales/sale_neg',
    operation: 'create',
    auth: { uid: 'staff_uid', email: 'staff@gmail.com', email_verified: true },
    payload: { quantity: -10, hargaSatuan: 1000, totalHarga: -10000 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Non-admin deleting master product',
    collection: 'products/prod_pd',
    operation: 'delete',
    auth: { uid: 'staff_uid', email: 'staff@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
