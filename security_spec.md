# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants
1. **Identity & Email Verification**: Every read/write operation requires `request.auth != null` and `request.auth.token.email_verified == true`.
2. **No Self-Escalation**: A newly registered user in `/users/{userId}` can only create their profile with `role == 'user'` and `status == 'pending'` (unless matching the bootstrapped admin `triyantoandi80@gmail.com` or possessing a verified `/invites/{inviteId}` matching their verified email). Users cannot modify their own `role` or `status`.
3. **PII Isolation**: `/users/{userId}` contains `email` and `displayName` and is strictly readable only by the document owner (`request.auth.uid == userId`) or an Admin.
4. **Master Gate & Workspace Isolation**: All operational collections (`products`, `stockEntries`, `sales`, `workspaceConfigs`) belong to `workspaceId == 'pim-utama'` and require active membership in `/authorizedMembers/{uid}` or bootstrapped admin status.
5. **Immutable Audit Trail & Server Time**: `createdBy` and `createdAt` (`request.time`) are immutable after creation; `updatedAt` must equal `request.time`.
6. **Strict Field Allowlisting & Boundary Checks**: All writes must match `hasAll(...) && hasOnly(...)` and validate string lengths, regex IDs (`^[a-zA-Z0-9_\\-]+$`), and numeric non-negative bounds.
7. **Admin-Only Master Operations**: Creating/editing/deleting `products`, `stockEntries`, `invites`, `authorizedMembers`, and `workspaceConfigs` (`forecast`, `allocation`, `prices`) is restricted to Admins, while active `user` staff can record/create `sales` shipments.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: `request.auth == null` reading `/products/PD` or writing `/sales/s1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `request.auth.token.email == 'triyantoandi80@gmail.com'` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Self-Privilege Escalation on User Create**: Non-admin user creates `/users/{uid}` with `role: 'admin'` and `status: 'active'` -> `PERMISSION_DENIED`.
4. **Self-Privilege Escalation on User Update**: Non-admin user updates their `/users/{uid}` changing `role: 'admin'` -> `PERMISSION_DENIED`.
5. **Cross-User PII Read**: Non-admin user A calls `get(/users/userB)` -> `PERMISSION_DENIED`.
6. **Unauthorized External User List**: Signed-in Google user not in `/authorizedMembers` queries `/sales` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Admin creates `/products/PD` with extra ghost field `isVerified: true` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Writing document `/products/invalid$$$id_exceeding_128_chars...` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating `/sales/s1` with client-forged `createdAt: '2020-01-01'` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: Updating `/sales/s1` and changing `createdBy` or `createdAt` -> `PERMISSION_DENIED`.
11. **Negative Quantity / Price Attack**: Creating `/sales/s1` with `quantity: -50` or `hargaSatuan: -1000` -> `PERMISSION_DENIED`.
12. **Non-Admin Master Product Deletion**: Regular staff (`role: 'user'`) attempts to delete `/products/PD` or update `/workspaceConfigs/prices` -> `PERMISSION_DENIED`.
