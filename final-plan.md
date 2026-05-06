# Haloui System — Final Plan (ship the last 8%)

## Goal
Take the system from "92% — works, builds, looks clean" to "shipped — print templates match the client's existing paperwork, logo is wired, client can run all five core workflows unaided."

Total estimate: **~3 working days**.

---

## Order of execution (matters)

1. **Logo first** (5 min) — every print template renders the logo, so wire it before designing templates against it.
2. **Print templates** (2 days) — the visual work.
3. **Verification** (½ day) — smoke + print + UAT.
4. **Tiny cleanup** (½ hour) — `as any` casts.

---

## Stream 1 — Wire the real logo

### Phase 1.1
- [ ] Get a clean logo file from the client (SVG preferred, otherwise high-res PNG with transparent background) → Verify: file exists, opens, no white box around it
- [ ] Drop it as `public/assets/logo.png` (or `.svg`) → Verify: file is at the path, ≤ 200 KB
- [ ] Open the app → Paramètres → upload field → save → click "Enregistrer les paramètres" → Verify: `company.logo_path` in the DB now points to `/uploads/logos/...png` (the existing orphan upload is fine to use too — just save the form). Run: `node -e "import('better-sqlite3').then(({default:D})=>{const d=new D('data/haloui.db',{readonly:true});console.log(d.prepare('SELECT logo_path FROM company WHERE id=1').get())})"`
- [ ] Refresh dashboard, confirm the new logo shows in the sidebar header → Verify: logo visible, not a generic placeholder

---

## Stream 2 — Print templates rewrite

### Phase 2.1 — Foundation
- [ ] Create folder `app/print/[kind]/[id]/templates/` → Verify: folder exists
- [ ] Move the rendering logic out of `app/print/[kind]/[id]/page.tsx` into 7 files: `devis.tsx`, `facture.tsx`, `bl.tsx`, `bs.tsx`, `bc.tsx`, `fiche-personnel.tsx`, `attestation.tsx`. Each exports a default React component receiving `{ company, document, employee?, attestation? }` props as needed → Verify: page.tsx now just dispatches to the right template based on `kind`; print routes still return 200
- [ ] Refactor `components/print/print-layout.tsx` into a thin **passive** A4 frame: just `@page { size: A4; margin: 12mm }` + body classes. Strip the cream/brown header — each template builds its own header now → Verify: facture print preview no longer shows the brown bar; if a template doesn't add a header, the page is blank-headed (intentional)
- [ ] Add fonts via `next/font/google` in `app/layout.tsx`: `Lora` (serif, weights 400/600/700) for print titles, keep `Manrope` for UI. Expose as `--font-print-serif` → Verify: Lora loads on `/print/...` routes (Network tab shows `lora.woff2`); disconnect from internet, restart server, fonts still render (next/font self-hosts)

### Phase 2.2 — Bon de livraison (HIGHEST PRIORITY — match the WhatsApp photo)
Reference: `assets/WhatsApp Image 2026-05-05 at 11.54.26 PM.jpeg`

Layout spec:
```
┌─────────────────────────────────────────┐
│        [logo]   حلويات الحلوي            │  ← centered, FR + AR
│        Pâtisserie Haloui                │
│                                         │
│  tanger le. 04/05/2026.                 │  ← left-aligned plain text
│  bon de livraison n.X.                  │
│  local {magasin} n.{branch_id}          │
│  ice.001894660000040.                   │
│  {client_address}                       │
│                                         │
│  ┌──────────────┬─────┬──────┬──────┐  │
│  │ Désignation  │ Qté │ PU   │ PT   │  │  ← 4 columns only, no TVA
│  ├──────────────┼─────┼──────┼──────┤  │
│  │ ...lines...  │     │      │      │  │
│  └──────────────┴─────┴──────┴──────┘  │
│                          ┌──────────┐   │
│                          │ TOTAL    │   │  ← stacked totals
│                          │ AVENCE   │   │
│                          │ REST     │   │
│                          └──────────┘   │
│                                         │
│  la diréction.       tanger le.{date}.  │
│                                         │
│  ╭─────────────────────────────────╮   │  ← rounded address bar
│  │ Siège social: 37, av imam ...   │   │
│  │ Tel: ... GSM: ...               │   │
│  │ RC: 53570 - IF: ... TP: ...     │   │
│  ╰─────────────────────────────────╯   │
└─────────────────────────────────────────┘
```

- [ ] Build `templates/bl.tsx` with the layout above. Use serif Lora for titles, sans Manrope for body. Border: 1px solid black around the table. No TVA column. → Verify: print preview side-by-side with the WhatsApp photo, layout within 5mm
- [ ] Compute and display `TOTAL` (= total_ttc), `AVENCE` (= avance), `REST` (= reste) in the stacked box → Verify: numbers match the document edit page
- [ ] Bottom address bar: rounded rectangle with `Siège social`, `Tel/GSM`, `RC/IF/TP/ICE` — three lines, centered, small font → Verify: matches the photo

### Phase 2.3 — Devis & Facture
Same shell as BL but with **6-column table** (`Désignation, Qté, PU HT, TVA, Total HT, Total TTC`) and a totals box that breaks down HT / Remise / TVA / TTC / Acompte / Reste.

- [ ] Build `templates/devis.tsx` and `templates/facture.tsx` (sharing a `DocumentClassic` helper if useful) → Verify: each prints, totals tie back to document data
- [ ] Add **Montant en lettres** sentence below the table: `Arrêté(e) la (le) présent(e) {type} à la somme de {amount_in_words}.` → Verify: 1234.56 prints "mille deux cent trente-quatre dirhams et cinquante-six centimes"
- [ ] On `facture.tsx` only: legal mention line `TVA acquittée selon le régime applicable. ICE: {ice}.` → Verify: appears on facture, not on devis
- [ ] Two signature areas at bottom: left `Signature client`, right `La direction` → Verify: enough whitespace for a real signature

### Phase 2.4 — Bon de sortie & Bon de commande
- [ ] `templates/bs.tsx`: header shows `Magasin de départ → Magasin d'arrivée`, no client/fournisseur. 3-column table: `Désignation, Qté, Unité` (no prices). Two signature areas: `Responsable {magasin source} / Responsable {magasin destination}` → Verify: print BS, no prices visible, both magasins shown
- [ ] `templates/bc.tsx`: header shows fournisseur block (name, ICE, address) instead of client. Same 6-col table as facture. Footer line: `À livrer avant le {due_date}` if `notes` contains a date → Verify: print BC, fournisseur shown, no leftover "client" labels

### Phase 2.5 — Fiche personnel (yellow form)
Reference: `assets/WhatsApp Image 2026-05-05 at 11.54.25 PM (1).jpeg`

- [ ] Build `templates/fiche-personnel.tsx`:
  - Background `#fff8c8` (yellow), opt-out via `?paper=blanc` query param → Verify: default print is yellow; with `?paper=blanc` it's white
  - Top-left: chef-mascot logo + **N°**: {numero} top-right
  - Title `DOSSIER PERSONNEL` italic serif, underlined
  - Photo box right side: 220px × 260px, 1px border, "Photo" placeholder if `photo_path` empty
  - Field rows with **dotted underline** (`border-bottom: 1.5px dotted`):
    - `Nom: ____` `Prénom: ____`
    - `Date et lieu de Naissance: ____`
    - `État Civil: ____`
    - `Date d'entrée: ____`
    - `N° d'Imm. C.N.S.S: ____`
    - `Adresse du Salarié: ____`
    - `Date de Sortie: ____`
    - `Tél: ____`
  - Bottom bar: French address left, Arabic address right (use `font-[var(--font-arabic)]`)
  → Verify: print preview side-by-side with the photo, layout within 5mm

### Phase 2.6 — Attestation de travail
- [ ] Build `templates/attestation.tsx`:
  - White background, no decorative borders
  - Top-right: `Tanger, le {date}`
  - Centered title `ATTESTATION DE TRAVAIL`, serif, bold, underlined, 18pt
  - Body in justified Lora 12pt, line-height 1.7
  - Bottom-right signature block: `La direction` with 60mm vertical space for stamp/signature
  - Same address bar at bottom as other templates
  → Verify: print attestation, looks like an official letter

### Phase 2.7 — Print page break safety
- [ ] In `print-layout.tsx`, add CSS:
  ```css
  @media print {
    table { page-break-inside: avoid; }
    .totals-box { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
  ```
  → Verify: a devis with 30 lines doesn't orphan the totals box on page 2

---

## Stream 3 — Tiny cleanup

### Phase 3.1
- [ ] Replace the 2 `as any` casts in `app/(app)/chiffre-affaires/page.tsx:61,76` with proper types. Add return-type annotations to `getRevenueStats` so `daily`, `monthlyByBranch`, `pivot` are typed → Verify: `tsc --noEmit` passes, no `any` in that file

---

## Stream 4 — Verification (LAST)

### Phase 4.1 — Smoke test
- [ ] Login as admin (set new password if first time) → Verify: redirects to dashboard
- [ ] Add 3 produits in `/produits` → Verify: appear in catalogue list
- [ ] Add 1 client in `/clients` → Verify: appears in repertoire
- [ ] Create 1 devis with 3 lines using product picker → Verify: line totals + TTC computed live, document saved with auto numero
- [ ] Convert devis → facture → Verify: facture appears with same lines, parent_document_id set
- [ ] Click "Imprimer / PDF" on the facture → Verify: `/print/facture/{id}` opens, native print dialog appears, preview matches the new template
- [ ] Enter today's CA on all 6 magasins via `/chiffre-affaires` → Verify: dashboard "Recettes par magasin" shows them
- [ ] Generate one attestation for the seeded employee → Verify: attestation prints, FR text uses real employee data
- [ ] Open `/utilisateurs/audit` → Verify: every action above appears in the audit log with the correct user

### Phase 4.2 — Print on the client's actual printer
- [ ] Print one of each: devis, facture, BL, BS, BC, fiche-personnel, attestation → Verify physically: colors match preview, no margin clipping, no orphaned totals on page 2, fonts render
- [ ] If yellow paper available, print fiche personnel on yellow → Verify: dotted lines aligned with paper rules

### Phase 4.3 — Client UAT
- [ ] Sit with the client. Have him do, in this order, with no help from you:
  1. Make a devis for a real customer
  2. Convert it to facture
  3. Make a BL for a real magasin
  4. Generate an attestation for one of his employees
  5. Enter today's recettes for all 6 magasins
- [ ] After each step, ask "what was confusing?" → Verify: log of issues, decide which are blocking vs v1.1
- [ ] If he completes all 5 unaided → ship it

### Phase 4.4 — Backup drill
- [ ] Close the app, copy `data/haloui.db` to a USB stick, restore on another machine (or the same after deleting), launch — same data appears → Verify: data portability confirmed
- [ ] Check `data/backups/haloui-{today}.db` exists after launch → Verify: daily backup ran

---

## Done When

- [ ] Real Haloui logo appears on dashboard, sidebar, and every printed page.
- [ ] All 7 print templates match their client references within 5mm tolerance.
- [ ] BL specifically: visually side-by-side with the WhatsApp photo, layout matches.
- [ ] Fiche personnel: yellow paper, dotted-line fields, photo box, bilingual footer.
- [ ] No `as any` in non-third-party code (recharts excepted if needed).
- [ ] `npm run build` passes (currently does — must stay clean).
- [ ] Smoke test: 5 happy-path actions, all green, audit log records everything.
- [ ] Print test: all 7 templates printed on the client's actual printer, colors and margins right.
- [ ] Client UAT: client completes 5 workflows unaided.

---

## Notes & risks

- **The logo's quality determines print quality.** A 200×200 pixelated PNG will look bad on A4. Push for SVG.
- **Page-break behavior varies by browser.** Test print preview in Chrome (the default) — that's what `start.bat` opens. Edge tends to add extra padding around `@page`.
- **Yellow background for fiche personnel** — most printer drivers offer "ignore background colors" by default. Tell the client to enable "background graphics" in the print dialog, OR keep `?paper=blanc` as the recommended default and only print on actual yellow paper for the formal yellow look.
- **Don't refactor the data layer**, even if tempted. The audit confirmed `lib/data.ts`, `lib/totals.ts`, `lib/numerotation.ts`, `db/schema.sql` are solid.
- **If the client provides a different sample** (e.g., a current devis or facture he likes), prioritize matching that over the WhatsApp photos.

---

## Rough day-by-day

**Day 1 morning** — Stream 1 + Stream 2 Phase 2.1 (logo + print foundation, fonts, page split)
**Day 1 afternoon** — Stream 2 Phase 2.2 (BL — the hardest match)
**Day 2 morning** — Stream 2 Phases 2.3 + 2.4 (devis/facture/BS/BC)
**Day 2 afternoon** — Stream 2 Phases 2.5 + 2.6 (fiche personnel + attestation), Phase 2.7 page-break CSS
**Day 3 morning** — Stream 3 cleanup + Stream 4 Phase 4.1 smoke test, fix anything found
**Day 3 afternoon** — Stream 4 Phases 4.2 + 4.3 (print test + UAT) with the client

**Buffer day if needed** — Day 4 for client feedback fixes and v1.0.0 tag.
