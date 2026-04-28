# MasterFlow: audit findings and required changes

## Purpose

This file documents the weak spots found during the project review and describes the required changes in implementation order.

The priority is:

1. close security and integrity gaps;
2. centralize duplicated business rules;
3. improve maintainability and UX consistency.

---

## 1. Main findings

### 1.1 Incomplete CSRF protection

The project uses `proxy.ts` plus `validateCsrfFormData()` in many server actions, but the protection is not applied consistently across all mutating actions.

This is dangerous because:

- `proxy.ts` allows requests with `next-action`;
- some server actions perform create/update/delete logic without explicit CSRF validation;
- destructive operations are therefore not protected uniformly.

### Affected files to review first

- `app/(dashboard)/clients/actions.ts`
- `app/(dashboard)/services/actions.ts`
- `app/(dashboard)/orders/actions.ts`
- `app/(dashboard)/expenses/actions.ts`
- `app/(dashboard)/orders/[id]/photos/actions.ts`
- `app/(dashboard)/orders/[id]/signature/actions.ts`
- `app/(dashboard)/settings/sumup/actions.ts`
- any other `app/**/actions.ts` file that mutates data but does not call `validateCsrfFormData()`

### Required change

All mutating server actions must use one unified CSRF contract.

That includes:

- create
- update
- delete
- restore
- export actions with side effects
- sync/import actions
- file upload and file delete actions

---

### 1.2 Invoice archive invariants are not enforced consistently

The application is clearly designed around immutable invoice snapshots, but some related assets can still be deleted after invoice lock.

This breaks the archival model.

### Problem

- `uploadPhotoAction()` blocks changes after `invoice_number || invoice_locked_at`
- `saveSignatureAction()` blocks changes after `invoice_number || invoice_locked_at`
- but:
  - `deletePhotoAction()` does not enforce the same lock
  - `deleteSignatureAction()` does not enforce the same lock

As a result, archive-relevant assets may be removed after invoice issuance.

### Affected files

- `app/(dashboard)/orders/[id]/photos/actions.ts`
- `app/(dashboard)/orders/[id]/signature/actions.ts`
- review also:
  - `app/(dashboard)/orders/[id]/pdf/actions.ts`
  - `app/(dashboard)/orders/[id]/page.tsx`

### Required change

Introduce a single server-side rule:

- if order has `invoice_number` or `invoice_locked_at`, then:
  - no photo upload
  - no photo delete
  - no signature save
  - no signature delete
  - no direct edit of original invoice-relevant order data

UI hiding alone is not enough. The server action itself must reject the operation.

---

### 1.3 Business rules are duplicated across multiple files

Critical logic is repeated in several places with partial differences:

- invoice lock checks
- order price resolution
- service/default/custom/item price fallback
- effective date logic for statistics
- invoice snapshot handling

### Affected files

- `app/(dashboard)/orders/actions.ts`
- `app/(dashboard)/orders/[id]/pdf/actions.ts`
- `app/(dashboard)/orders/[id]/page.tsx`
- `app/(dashboard)/invoices/page.tsx`
- `lib/stats/calculate.ts`

### Risk

- future bugs from inconsistent changes
- hard-to-maintain pricing logic
- hidden divergence between UI, PDF generation and analytics

### Required change

Move shared domain rules into common modules in `lib/`.

Recommended split:

- `lib/orders/invoice-lock.ts`
- `lib/orders/pricing.ts`
- `lib/orders/policy.ts`

---

### 1.4 `orders` is overloaded as a model

The `orders` table/entity currently acts as:

- operational order
- invoice source
- correction source
- payment metadata container
- PDF/archive state container
- soft-delete entity

This is workable now, but high-risk for future growth.

### Risk

- every feature affects too many code paths
- invoice rules leak into standard CRUD
- correction flow increases complexity of ordinary order operations

### Required change

Short-term:

- do not redesign the DB immediately;
- isolate rules in shared modules first.

Long-term:

- consider separating invoice-oriented domain logic from general order CRUD,
  at least at service/module level even if DB schema stays unchanged.

---

### 1.5 Settings/profile flow is too strict for ordinary profile edits

`updateProfileAction()` currently rejects saving unless invoice-required fields are complete.

### Problem

This means users cannot save a simple profile update like:

- phone
- bank name
- business email

unless full invoice data is already complete.

### Affected file

- `app/(dashboard)/settings/actions.ts`

### Required change

Choose one of these approaches:

1. allow partial profile saves and show invoice readiness separately;
2. split settings into:
   - general profile
   - invoice data / billing profile

Recommended: allow partial saves and keep the readiness check informational.

---

### 1.6 Inconsistent language and error handling style

The project mixes Russian, German and English messages in code and UI logic.

### Examples

- `app/(dashboard)/clients/actions.ts`
- `app/(dashboard)/services/[id]/page.tsx`
- `app/(dashboard)/settings/actions.ts`
- `app/(dashboard)/orders/actions.ts`

### Risk

- inconsistent UX
- harder maintenance
- duplicated text logic in multiple places

### Required change

- normalize user-facing messages through the existing i18n layer;
- avoid hardcoded mixed-language strings in actions;
- decide on one convention for internal comments and errors.

---

## 2. Required implementation plan

## Phase 1: Security and archive integrity

This phase should be implemented first.

### 2.1 Unify CSRF in all mutating actions

Tasks:

- audit all `app/**/actions.ts`
- add `validateCsrfFormData(formData)` where missing
- standardize how actions receive `FormData` when mutation happens
- verify delete/restore/sync actions are protected too

Expected result:

- every state-changing action requires valid CSRF token

### 2.2 Enforce invoice lock on all archive-relevant mutations

Tasks:

- add a shared helper for order invoice lock checks
- reuse it in:
  - photo upload
  - photo delete
  - signature save
  - signature delete
  - direct order edit flows

Expected result:

- once invoice is issued/locked, archive-relevant content cannot be changed or removed

### 2.3 Standardize authorization and ownership guards

Tasks:

- verify every mutation checks authenticated user
- verify every mutation checks ownership by `user_id`
- ensure invariant failures return consistent errors

Expected result:

- all write operations follow one security model

---

## Phase 2: Extract shared domain logic

### 2.4 Create shared order/invoice rule modules

Recommended new files:

- `lib/orders/invoice-lock.ts`
- `lib/orders/pricing.ts`
- `lib/orders/policy.ts`

### 2.5 Move duplicated logic into these modules

Candidates:

- `is invoice locked`
- `can edit order`
- `can mutate archive assets`
- `resolve order price`
- `resolve effective order date`

### 2.6 Rewire main consumers

Update these files to use shared helpers:

- `app/(dashboard)/orders/actions.ts`
- `app/(dashboard)/orders/[id]/pdf/actions.ts`
- `app/(dashboard)/orders/[id]/page.tsx`
- `app/(dashboard)/invoices/page.tsx`
- `lib/stats/calculate.ts`

Expected result:

- one source of truth for pricing and invoice-lock behavior

---

## Phase 3: UX and maintainability cleanup

### 2.7 Relax profile saving rules

Tasks:

- refactor `app/(dashboard)/settings/actions.ts`
- keep invoice completeness check as readiness indicator, not global save blocker

Expected result:

- user can save ordinary profile changes even with incomplete invoice data

### 2.8 Normalize language usage

Tasks:

- remove mixed-language hardcoded messages from action files
- route messages through i18n helpers where practical
- align UI labels in pages/components

Expected result:

- cleaner and more consistent UX

### 2.9 Review action response patterns

Current code mixes:

- thrown errors
- returned `{ ok: false, error }`
- returned form state
- redirects

Tasks:

- define a convention by action type
- keep forms returning form state
- keep imperative button actions returning `{ ok, error }`
- use throws only where boundary behavior is intended

Expected result:

- more predictable error handling

---

## 3. Concrete change list by file

## High priority

### `app/(dashboard)/clients/actions.ts`

- add CSRF validation to delete flow
- normalize error/message style

### `app/(dashboard)/services/actions.ts`

- add CSRF validation to delete flow
- normalize error/message style

### `app/(dashboard)/orders/actions.ts`

- audit every mutating action for CSRF coverage
- centralize invoice-lock checks
- centralize policy checks for editable vs locked order state

### `app/(dashboard)/expenses/actions.ts`

- verify all non-form destructive actions use CSRF
- align mutation guards and error style

### `app/(dashboard)/orders/[id]/photos/actions.ts`

- add invoice-lock check to delete flow
- if needed, reuse a common helper instead of duplicating the condition

### `app/(dashboard)/orders/[id]/signature/actions.ts`

- add invoice-lock check to delete flow
- reuse common helper

### `app/(dashboard)/settings/sumup/actions.ts`

- verify delete/sync paths remain fully protected by CSRF
- standardize mutation response behavior

---

## Medium priority

### `lib/orders/invoice-lock.ts` (new)

Suggested responsibilities:

- `isOrderInvoiceLocked(order)`
- `assertOrderInvoiceEditable(order)`
- `assertOrderArchiveAssetsMutable(order)`

### `lib/orders/pricing.ts` (new)

Suggested responsibilities:

- resolve order total from:
  - snapshot
  - order items
  - custom price
  - service default price

### `lib/orders/policy.ts` (new)

Suggested responsibilities:

- higher-level business decisions:
  - can edit original order
  - can create correction
  - can mutate invoice-related assets

---

## Lower priority but important

### `app/(dashboard)/settings/actions.ts`

- allow partial save of profile
- keep invoice readiness as informational warning

### `app/(dashboard)/services/[id]/page.tsx`

- normalize language usage

### `app/(dashboard)/clients/actions.ts`

- remove mixed-language inline comments/messages

### `app/(dashboard)/orders/actions.ts`

- move hardcoded bilingual text selection closer to i18n layer if practical

---

## 4. Recommended order of execution

Implement in this order:

1. add missing CSRF checks;
2. enforce invoice lock on photo/signature delete paths;
3. extract common invoice-lock helper;
4. extract common pricing helper;
5. refactor order/invoice/statistics consumers to use helpers;
6. relax settings/profile save policy;
7. normalize message and i18n consistency.

---

## 5. Definition of done

This work can be considered complete when:

- every mutating server action is CSRF-protected;
- invoice-locked orders reject any archive-relevant asset mutation on the server;
- duplicate invoice-lock and pricing logic is centralized;
- settings profile can be saved partially without blocking unrelated edits;
- user-facing messages no longer mix languages unpredictably;
- recently touched files pass lint without introducing new diagnostics.
