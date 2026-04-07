# INTEX 2 — Gap Analysis & TODO
_Last updated: 2026-04-07_

---

## IS 413 — Enterprise App Dev

### Backend (API Endpoints) — Incomplete
- [x] **Residents / cases** — `CaseController` removed; read API is `GET /api/residents` (+ sub-routes for process recordings, visitations, conferences). Create/update/delete residents via API is still not implemented.
- [x] **Process Recordings / Visitations / Conferences** — `GET /api/residents/{id}/process-recordings`, `visitations`, `conferences` wired; frontend consumes them.
- [x] **Donors/Supporters directory** — `GET /api/supporters` and `GET /api/supporters/{id}` (Admin + Staff). `DonorController` still handles donation history/impact for Donor role; supporter **CRUD** is still not implemented.
- [x] **Staff/Users list** — `GET /api/admin/users` and `DELETE /api/admin/users/{id}` (Admin only).
- [x] **Public impact** — `GET /api/public/impact` (anonymous) reads published `public_impact_snapshots` JSON for landing/impact pages.
- [ ] **Education, Health, Intervention Plans** — no endpoints for any resident sub-data
- [ ] **Social Media** — `/social` page is a complete stub, no backend
- [ ] **Reports** — export/generate buttons are stubs; no actual data aggregation endpoints

### Frontend — Incomplete/Missing
- [ ] **Resident create/edit form** — page exists but not wired to a working API
- [x] **Resident sub-pages** (process recordings, visitations, conferences) — wired to `/api/residents/...` endpoints
- [x] **Donor list/profile** — wired to `/api/supporters`
- [x] **Dashboard** — wired to `/api/admin/dashboard`
- [x] **Users page** — wired to `/api/admin/users` (Admin-only UI)
- [ ] **Settings/profile changes** — don't persist to API
- [ ] **Password change** — stub link, no endpoint
- [ ] **Pagination** — required for tables; check if implemented on donors/residents lists
- [ ] **Social media page** — full stub

### General Quality
- [ ] Page titles, favicons, consistent look-and-feel — verify all pages have proper `<title>` tags
- [ ] Loading/error states on all data-fetching pages
- [ ] Form validation on all create/edit forms

---

## IS 414 — Security

### Required (Graded)
- [ ] **HSTS** — `UseHttpsRedirection()` is in, but HSTS (`app.UseHsts()`) needs to be verified/enabled — worth points and listed as an additional feature
- [ ] **GDPR cookie consent "fully functional"** — banner exists and sets a cookie, but verify it actually *gates* non-essential cookies (not just cosmetic). Rubric asks you to be specific about this in the video
- [ ] **Donor role scoping** — currently `GET /api/donors/history` returns *all* donations to any donor. Should only return *that donor's* records. Need to link donor accounts to supporter records
- [ ] **Confirmation required to delete data** — `ConfirmDeleteModal` component exists, but verify it's actually wired into every delete action (resident delete, donor delete, etc.)

### Additional Security Features (2 pts available — pick some)
- [ ] **Third-party auth** (Google/GitHub OAuth) — not implemented
- [ ] **MFA/2FA** — toggle exists in Settings but is purely cosmetic, no TOTP or similar
- [ ] **Browser-accessible cookie for user settings** — e.g., light/dark mode stored in a non-httpOnly cookie read by React — not implemented
- [ ] **Data sanitization** — incoming data sanitization on backend or output encoding on frontend — not verified
- [ ] **HSTS header** — may count as additional feature depending on deployment config
- [ ] **CSP `'unsafe-inline'`** — currently allowed for scripts/styles; tightening this (nonces, remove inline) would be a meaningful improvement

---

## IS 455 — Machine Learning

### Everything is missing
- [ ] **`MLPipelines/Pipelines/` is completely empty** — no `.ipynb` files exist at all
- [ ] Need **at least 2 complete ML pipelines**, each covering:
  1. Problem framing (predictive vs. explanatory, justified)
  2. Data acquisition, prep & exploration (distributions, correlations, missing values, feature engineering)
  3. Modeling + feature selection (compare multiple approaches)
  4. Evaluation (train/test split, metrics interpreted in business terms)
  5. Causal/relationship analysis section
  6. Deployment notes (how it integrates into the app)
- [ ] The **Insights page** currently shows hardcoded mock data — needs to be backed by real trained models served via API endpoints
- [ ] Notebooks must be **fully executable** top-to-bottom

### Suggested pipelines (data is in MLPipelines/Data/):
- Donor churn / lapse risk classifier (supporters + donations tables)
- Reintegration readiness predictor (residents + process_recordings + education + health)
- Donation amount predictor (explanatory — what drives larger gifts)
- Social media engagement predictor (social_media_posts table)

---

## Submission Checklist (Due Friday April 10 @ 10am)
- [ ] Video for IS 413 — demo all pages and functionality
- [ ] Video for IS 414 — show CSP header in DevTools, HTTPS, password policy, RBAC, cookie consent, credentials handling, any additional features
- [ ] Video for IS 455 — walk through each pipeline notebook end-to-end
- [ ] GitHub repo set to **Public**
- [ ] ML notebooks in `ml-pipelines/` folder (the submission form asks for direct links to `.ipynb` files)
- [ ] Submit form with correct URLs (site, GitHub branch, ipynb files, videos)
- [ ] Provide 3 user credentials: admin (no MFA), donor (no MFA, with donation history), one account with MFA enabled

---

## Priority Order (given presentation is Friday)
1. **ML pipelines** — completely missing, highest risk
2. **Resident create/update/delete API** — read paths exist; writes still missing
3. **Donor scope fix** — donors seeing all donations is a security/RBAC bug
4. **Supporters CRUD** — distinct from donations management (list/detail read exists)
6. **Pick 1-2 additional security features** for the 2 extra points
7. **Verify delete confirmation** is wired everywhere
8. **Accessibility** — Lighthouse score ≥ 90 on every page (IS 401 requirement)
