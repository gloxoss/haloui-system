# Haloui System — Build Plan

## Goal
Build a simple French local-only web app for **Pâtisserie Haloui** (Tanger) to manage devis, factures, bons de livraison/sortie/commande, fiches de personnel, attestations de travail, and daily chiffre d'affaires per branch — with printable color templates, a product catalog, auto price calculations, and multi-user tracking.

---

## Stack Decision

**Next.js 15 (App Router) + TypeScript + SQLite (better-sqlite3) + TailwindCSS + NextAuth (credentials)**

- Single codebase = both "desktop" and "web". Runs on `localhost:3000`, no cloud, no deployment.
- One-click Windows launcher: a `start.bat` on the desktop runs `npm start` and opens the browser.
- Print via `window.print()` + `@media print` CSS in dedicated `/print/...` routes — full color, A4.
- Multi-user via NextAuth credentials provider (username + password) stored in SQLite, with `created_by` / `updated_by` columns on every record (audit trail).
- Data stored in `./data/haloui.db`. Backup = copy that one file.

**Why not Electron?** Adds packaging overhead for zero gain — they already use Windows, and a `.bat` + browser shortcut feels native. If they ever want a wrapped desktop later, drop the same Next.js app inside Tauri in an afternoon.

---

## Seed Data (extracted from assets — all editable in Paramètres)

```
Société: Pâtisserie Haloui
Adresse: 37, av imam mouslim Dradeb - Tanger
Tél: 05 39 93 49 87
GSM: 06 68 70 69 38
RC: 53570
IF: 81062511
TP: 50227788
ICE: 001894660000040
Logo: assets/logo-placeholder.png  (replace later)

Branches (locals):
  1. Sahat Al Madina
  2. 37 Imam Mouslim (Dradeb)
  3. Mesnana
  4. Nador
  5. 34 Imam Mouslim (Dradeb)
  6. Ain Hayani
```

---

## Numbering

Simple sequential per document type, no year prefix, no padding mandatory:

```
Devis:            1, 2, 3, …
Facture:          1, 2, 3, …
Bon de livraison: 1, 2, 3, …
Bon de sortie:    1, 2, 3, …
Bon de commande:  1, 2, 3, …
```

Stored in a `numerotation` table (`type → last_number`). Atomic increment on creation.

---

## Architecture

```
haloui-system/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── devis/             [list][new][/:id/edit]
│   │   ├── factures/
│   │   ├── bons-livraison/
│   │   ├── bons-sortie/
│   │   ├── bons-commande/
│   │   ├── personnel/         (fiches + attestations)
│   │   ├── chiffre-affaires/  (daily table per branch + stats)
│   │   ├── produits/
│   │   ├── clients/
│   │   ├── fournisseurs/
│   │   ├── utilisateurs/      (admin only)
│   │   └── parametres/        (company info, branches)
│   ├── print/
│   │   ├── devis/[id]/
│   │   ├── facture/[id]/
│   │   ├── bon-livraison/[id]/
│   │   ├── bon-sortie/[id]/
│   │   ├── bon-commande/[id]/
│   │   ├── fiche-personnel/[id]/
│   │   └── attestation/[id]/
│   └── api/                   (server actions preferred, API routes for upload/print)
├── components/
│   ├── ui/                    (Button, Input, Table, Modal, NumberInput…)
│   ├── forms/DocumentForm.tsx (shared for devis/facture/BL/BS/BC)
│   └── print/PrintLayout.tsx  (A4 frame, header, footer)
├── lib/
│   ├── db.ts                  (better-sqlite3 singleton)
│   ├── auth.ts                (NextAuth config)
│   ├── numerotation.ts
│   ├── totals.ts              (HT/TVA/TTC/remise math)
│   └── number-to-words-fr.ts
├── db/
│   ├── schema.sql
│   └── seed.ts
├── public/assets/             (logo placeholder, fonts)
└── data/haloui.db             (gitignored)
```

---

## Data Model (SQLite)

```sql
users            (id, username, password_hash, full_name, role[admin|user], active, created_at)
audit_log        (id, user_id, action, entity_type, entity_id, timestamp, snapshot_json)

company          (id=1, name, address, phone, gsm, rc, if, tp, ice, logo_path)
branches         (id, name, address, phone, active)

clients          (id, name, ice, address, phone, email, created_by, updated_by, …)
fournisseurs     (id, name, ice, address, phone, email, created_by, updated_by, …)
produits         (id, ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by, …)

documents        (id, type[devis|facture|bl|bs|bc], numero, date, branch_id,
                  client_id NULL, fournisseur_id NULL,
                  total_ht, total_tva, total_ttc, remise, avance, reste,
                  notes, status, created_by, updated_by, created_at, updated_at)
document_lignes  (id, document_id, produit_id NULL, designation, quantite, unite,
                  prix_unitaire_ht, tva_rate, remise, total_ht)

employes         (id, numero, nom, prenom, date_naissance, lieu_naissance,
                  etat_civil, date_entree, date_sortie NULL, cnss, adresse, telephone,
                  salaire, photo_path, created_by, updated_by, …)

attestations     (id, employe_id, date, type, contenu_genere, created_by)

chiffre_affaires (id, branch_id, date, montant, notes, created_by, updated_by,
                  UNIQUE(branch_id, date))

numerotation     (type PRIMARY KEY, last_number)
```

---

## Print Templates (color, A4)

7 templates, all sharing a `PrintLayout` (logo top-left, Arabic+French name, address footer with RC/IF/TP/ICE):

1. **Devis** — header (n°, date, client, branch), lines table (Désignation/Qté/PU/PT), totals box (HT, remise, TVA, TTC), montant en lettres, signatures.
2. **Facture** — same as devis + "FACTURE" title + mention légale (TVA acquittée…).
3. **Bon de livraison** — matches the sample: header `tanger le. DD/MM/YYYY`, `bon de livraison n.X`, branch, ICE, address; lines table; TOTAL / AVANCE / RESTE box; "la direction" footer.
4. **Bon de sortie** — internal stock-out, source branch, destination branch.
5. **Bon de commande** — supplier instead of client.
6. **Fiche personnel (Dossier Personnel)** — replicates the yellow form (chef logo, fields: N°, Nom, Prénom, Date et lieu de naissance, État civil, Date d'entrée, N° CNSS, Adresse du salarié, Date de sortie, Tél, Photo). Bilingual footer.
7. **Attestation de travail** — generated paragraph (FR), date, stamp/signature placeholder.

---

## Tasks

### Phase 1 — Foundation
- [ ] Init `create-next-app` with TS + Tailwind + App Router → Verify: `npm run dev` opens default page
- [ ] Add better-sqlite3, write `schema.sql`, run on first boot if `data/haloui.db` missing → Verify: db file appears, all tables created
- [ ] Seed company + 6 branches + admin user (`admin` / temp password) on first boot → Verify: login screen accepts admin
- [ ] NextAuth credentials provider, session cookie, `requireAuth()` helper for server actions → Verify: visiting `/dashboard` unauthenticated redirects to `/login`
- [ ] French locale: `fr-MA` dates (`06/05/2026`), numbers (`1 234,56`), MAD currency formatting helpers → Verify: a test page prints all three correctly
- [ ] App shell: sidebar navigation (all modules), top bar with user name + logout → Verify: links navigate, logout clears session

### Phase 2 — Master Data
- [ ] Paramètres → Société: edit all company fields, upload logo → Verify: edits persist, logo shown on dashboard
- [ ] Paramètres → Branches: list, add, edit, deactivate → Verify: new branch appears in document forms immediately
- [ ] Utilisateurs (admin only): create user, set role, reset password, deactivate → Verify: non-admin cannot reach the page
- [ ] Produits: list (search by ref/désignation), add/edit/delete, fields = ref, désignation, unité, prix HT, TVA → Verify: search works, prix HT accepts decimals
- [ ] Clients & Fournisseurs CRUD → Verify: create + edit + delete from list

### Phase 3 — Documents
- [ ] `numerotation` service: atomic `nextNumber(type)` → Verify: 100 concurrent calls produce 1..100 without gaps
- [ ] Shared `DocumentForm`: header (auto n°, date, branch, client/fournisseur picker), line grid with product autocomplete, qty + PU + remise + TVA per line, live totals (HT, remise, TVA, TTC), avance/reste, notes → Verify: picking a product fills désignation/PU/TVA; totals recompute on every keystroke
- [ ] Wire form for all 5 types (devis, facture, BL, BS, BC) — same component, conditional fields (BS uses two branches, BC uses fournisseur) → Verify: each type creates and lists correctly
- [ ] List views: filter by date range, branch, client, status; sort; click-to-edit → Verify: filtering narrows results, total count matches
- [ ] Convert actions: devis → facture, devis → BL (copy lines, new n°, link parent_id) → Verify: button on devis creates facture with same lines and a new sequential number
- [ ] Status workflow: brouillon → validé → imprimé. Once "validé" lines are read-only → Verify: edit blocked after validation

### Phase 4 — Personnel
- [ ] Fiche personnel form: N° auto, all fields from the yellow sheet, photo upload → Verify: create + edit + delete; photo appears in list
- [ ] Attestation de travail generator: pick employee + type (simple, avec salaire, pour visa, pour banque), preview generated FR text using employee data and current date → Verify: text reflects real employee data; dates in `fr-MA`

### Phase 5 — Chiffre d'Affaires
- [ ] Daily entry table: rows = days of selected month, columns = active branches + total, inline-edit cells, auto-save on blur → Verify: editing a cell persists; total column updates
- [ ] Stats dashboard: KPIs (CA mois, CA année, meilleure branche), line chart (daily this month), bar chart (monthly per branch, last 12 months), table CA par branche par mois → Verify: numbers tie back to raw entries
- [ ] Export CA table to Excel/CSV → Verify: file downloads, opens in Excel with correct French formatting

### Phase 6 — Printing
- [ ] `PrintLayout` shared component: A4, `@page { size: A4 }`, `@media print` rules, color preserved, header logo + Arabic+French name, footer with RC/IF/TP/ICE/address → Verify: print preview shows full color, no UI chrome
- [ ] Each of the 7 templates rendered at `/print/<type>/<id>` → Verify: route opens, content matches client's reference samples
- [ ] Print button on every document opens `/print/...` in new tab and triggers `window.print()` → Verify: native dialog opens with correct preview
- [ ] Number-to-words FR (`montant en lettres`) → Verify: 1234.56 → "mille deux cent trente-quatre dirhams et cinquante-six centimes"

### Phase 7 — Tracking & Polish
- [ ] Audit log: every create/update/delete writes to `audit_log` with user, entity, snapshot → Verify: changing a facture writes a row visible in /utilisateurs/audit (admin)
- [ ] "Créé par X le …" / "Modifié par Y le …" shown on every document detail → Verify: matches audit log
- [ ] Global search (Ctrl+K): jumps to client / product / document by n° → Verify: typing "fac 12" jumps to facture #12
- [ ] Auto backup: copy `data/haloui.db` → `data/backups/haloui-YYYY-MM-DD.db` daily on first launch → Verify: backup file appears
- [ ] `start.bat` launcher (runs `npm start`, waits, opens `http://localhost:3000`) → Verify: double-click on a clean machine opens the app

### Phase 8 — Verification (LAST)
- [ ] End-to-end smoke: login → add product → add client → create devis → convert to facture → print → enter daily CA → see in dashboard. No errors, audit log populated.
- [ ] Print all 7 templates on the client's actual printer; visually compare against reference samples.
- [ ] UAT with the client; collect feedback; log issues.

---

## Done When
- [ ] All 7 document types create, list, edit, validate, and print in color matching the references.
- [ ] Product catalog drives line items with auto désignation, PU, TVA, totals.
- [ ] Daily CA per branch with monthly/yearly stats.
- [ ] Multi-user login + audit trail on every record.
- [ ] All company data and branches editable in Paramètres.
- [ ] Numbering is plain sequential per type (1, 2, 3…).
- [ ] One `start.bat` launches everything offline. Daily DB backup runs.
- [ ] Client signs off after UAT.

---

## Notes
- **Print fidelity is the product.** Templates get extra polish — they're what the client gives customers.
- **Logo placeholder** for now (`public/assets/logo-placeholder.png`); swap when client provides final.
- **Defer:** stock management, accounting export (Sage/CIEL), DGI e-invoicing, mobile app, cloud sync. Mention to client as v2.
- **Risk:** print color/margins vary by printer driver — plan a print-test pass on the client's actual printer before sign-off.
- **Open small questions** (low-impact, can decide during build):
  - Default TVA rate? (assume 20% if not said)
  - Show prix TTC on devis/facture or only HT+TVA+TTC totals? (assume both)
  - Does fiche personnel need to print on yellow paper, or white with template styling? (assume white)
