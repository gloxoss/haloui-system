# Haloui System — Refinement Plan

## Goal
Take the working ~85% system and finish it: rebuild the 7 print templates to match the client's reference samples, simplify the UI so a non-technical user (the client himself) can operate it without training, and complete the cleanup + verification work skipped in v1.

## Guiding principles for "simple for non-technical user"
1. **Plain French, no jargon.** "Brouillon" → "À finaliser". "Statut imprimé" → "Imprimé". Avoid technical terms like "valider", "audit", "ICE format" in the main flow.
2. **One screen, one job.** A page should answer one question ("what to print today?", "what was sold today?") — not five.
3. **Big targets, few choices.** Buttons ≥ 44px, only the next action prominent, secondary actions tucked behind a kebab.
4. **Fewer items in sidebar.** Most-used at top, rare under "Plus…".
5. **Keep working logic intact.** The audit confirmed the data layer is solid — don't refactor it. Only change UI components and the print templates.

---

## Stream A — UI Simplification

### Phase A1 — Reduce sidebar + visual noise
- [ ] Cut sidebar to **6 primary** items: Tableau de bord, Devis, Factures, Bons (group), Personnel, Chiffre d'affaires. Move Produits, Clients, Fournisseurs, Utilisateurs, Paramètres into a **"Plus"** menu at the bottom → Verify: sidebar fits on screen without scrolling
- [ ] Replace cream/brown gradient backgrounds with a **plain off-white surface** (`#fafaf9`) and **single accent color** (Haloui orange, e.g. `#c97a2c`). Remove all decorative gradients, color-mix backgrounds, and double borders → Verify: no `linear-gradient` left in `globals.css` except print
- [ ] Standardize spacing: 16/24/32 only. Remove ad-hoc `px-[14mm]`, `tracking-[0.18em]` etc. from non-print code → Verify: grep `tracking-\[` returns only matches inside `components/print/`
- [ ] Standardize radii: 12px (small), 20px (cards). No more 24/26/28/32 mix → Verify: grep `rounded-\[2[4-9]` returns 0 matches outside print

### Phase A2 — Plain-language labels
- [ ] French label sweep across the app. Examples:
  - `Statut: Brouillon` → `À finaliser`
  - `Statut: Validé` → `Prêt à imprimer`
  - `Statut: Imprimé` → `Terminé`
  - `Avance` → `Acompte`
  - `Remise` → `Remise (réduction)`
  - `Branche` → `Magasin` (the client's "local" maps better to "magasin" in everyday Moroccan French)
  - `Convertir en BL` → `Créer le bon de livraison`
  - `Saisir le CA` → `Entrer les recettes du jour`
  - `Audit récent` → `Historique des modifications`
  → Verify: walk through with the client list; he understands every word without explanation
- [ ] Add a **plain-French help line under every page title** explaining what to do, max 12 words → Verify: every `PageHeading` has a `description` ≤ 12 words

### Phase A3 — Stepper for new document
- [ ] Replace the single big `DocumentForm` for **new** documents with a 3-step flow: **1. Magasin & client** → **2. Articles** → **3. Vérifier & enregistrer**. Edit-mode keeps the single page (faster for power use). → Verify: clicking "Nouveau devis" walks through 3 screens with a back/next bar
- [ ] On the Articles step, show a **single tap "+ Ajouter article"** button, and present each line as a **stacked card** on mobile/tablet. Drop the wide table on small screens → Verify: line editing works on a 768px-wide window without horizontal scroll

### Phase A4 — Dashboard reduction
- [ ] Cut dashboard to **3 things only**: today's CA per magasin (big numbers), 5 latest documents, two big buttons "Nouveau devis" / "Entrer les recettes du jour". Remove "Branche phare" card, "Vue d'ensemble" hero copy → Verify: dashboard fits on a 1366×768 laptop without scrolling
- [ ] Remove the brown/cream "Vue d'ensemble" hero with placeholder copy. Replace with **company name + today's date**, that's it → Verify: top of dashboard is one line of text, not 4

### Phase A5 — Confirm-before-delete + better empty states
- [ ] All delete buttons → JS confirm dialog with the entity name in plain French ("Supprimer le produit 'Boîte de sablés' ? Cette action est définitive.") → Verify: clicking delete without confirming does nothing
- [ ] Replace empty-state placeholders ("Aucun document.") with a **call to action** ("Aucun devis pour l'instant. [Créer le premier]") → Verify: every list page has a clickable empty state

### Phase A6 — Login & first-run polish
- [ ] Login screen: large logo, single username/password card, no other text. Show "Mot de passe oublié ? Demandez à l'administrateur." → Verify: only ~5 elements visible
- [ ] First-run: detect default password `admin123` → on next login, force "Choisissez un nouveau mot de passe" before reaching dashboard → Verify: after first password change, prompt no longer appears

---

## Stream B — Print Templates rewrite (match client references)

### Phase B1 — Split per-template
- [ ] Refactor `app/print/[kind]/[id]/page.tsx` into one file per template under `app/print/[kind]/[id]/templates/{devis,facture,bl,bs,bc,fiche-personnel,attestation}.tsx`. Each renders its **own layout** — no more shared cream/brown frame for everything → Verify: changing the BL layout doesn't affect the facture layout

### Phase B2 — Bon de livraison (closest match to reference photo)
- [ ] Match the WhatsApp BL sample exactly:
  - Centered logo block (FR + AR title, chef mascot illustration)
  - Left-aligned heading block: `tanger le. DD/MM/YYYY.`, `bon de livraison n.X.`, `local Y n.Z.`, `ice.XXX.`, `address.`
  - Plain bordered 4-column table: **Désignation | Qté | PU | PT** (no TVA column on BL)
  - Stacked totals box on the right: **TOTAL / AVANCE / REST**
  - `la diréction.` left, `tanger le DD/MM/YYYY.` right
  - Bottom address bar in a rounded rectangle: `Siège social: 37, av imam mouslim Dradeb - Tanger / Tel: 05 39 93 49 87 GSM: 06 68 70 69 38 / RC: 53570 - IF: 81062511 TP: 50227788 - ICE: 001894660000040`
  → Verify: print preview placed side-by-side with the WhatsApp photo, layout matches within 5mm

### Phase B3 — Devis & Facture
- [ ] Same shell as BL but with **6-column table** (Désignation, Qté, PU HT, TVA, Total HT, Total TTC), and a totals box that breaks down HT / TVA / TTC / Remise / Acompte / Reste
- [ ] **Montant en lettres** sentence: "Arrêté(e) la (le) présent(e) {type} à la somme de {amount_in_words}."
- [ ] Facture only: legal mention "TVA acquittée selon le régime applicable. ICE: {ice}."
- [ ] Two signature areas at bottom: client / la direction → Verify: print devis #1 and facture #1 from the seeded data, both fit on one A4 page

### Phase B4 — Bon de sortie & Bon de commande
- [ ] **BS:** header shows `magasin source → magasin destination`, no client/fournisseur. Table = Désignation, Qté, Unité (no prices). Single signature: "le responsable du magasin source / le responsable du magasin destination."
- [ ] **BC:** header shows fournisseur block instead of client. Table identical to facture. Footer: "à livrer avant le DD/MM/YYYY" if notes contain a date → Verify: each prints with the right header, right column set, no leftover "client" labels

### Phase B5 — Fiche personnel (Dossier Personnel)
- [ ] Match the yellow-form reference exactly:
  - Background `#fff8c8` (yellow) — only on this template, opt-in via `?paper=jaune` query param so the user can also print on white
  - Chef-mascot logo top-left, "N° ____" top-right
  - Title `DOSSIER PERSONNEL` underlined, italic serif font
  - Photo box (220×260mm rectangle) right side
  - Field rows with **dotted underline**: Nom, Prénom, Date et lieu de Naissance, État Civil, Date d'entrée, N° d'Imm. CNSS, Adresse du Salarié, Date de Sortie, Tél
  - Bilingual address bar at bottom: French left, Arabic right (use `font-[var(--font-arabic)]`)
  → Verify: print fiche of seeded employee, side-by-side with photo — match within 5mm

### Phase B6 — Attestation de travail
- [ ] Clean white A4, no decorative borders. Centered title `ATTESTATION DE TRAVAIL` in caps, bold, underlined
- [ ] Body text in justified paragraphs, line-height 1.7, font 12pt
- [ ] Date right-aligned at top: "Tanger, le {date}"
- [ ] Signature block bottom-right: "La direction" with space for stamp
- [ ] Same bottom address bar as other documents → Verify: print attestation, looks like an official letter from a Moroccan company

### Phase B7 — Print fonts
- [ ] Add a clean pâtisserie-friendly font pair: **Lora** (serif, for titles) + **Inter** (sans, for body) loaded from `next/font` so prints look the same offline → Verify: disconnect from internet, print, fonts still render

---

## Stream C — Cleanup & Hardening

### Phase C1 — Project hygiene
- [ ] Delete leftover `haloui-scaffold/` folder → Verify: `ls` no longer shows it; `npm run dev` still works
- [ ] Remove unused `lucide-react` from `package.json` → Verify: `npm install` clean, `npm run build` passes
- [ ] Rename package "name" `haloui-scaffold` → `haloui-system` → Verify: `package.json` updated, app still builds
- [ ] Delete the stray `C:\Users\oussama\package-lock.json` (the Turbopack workspace warning) → Verify: dev.log no longer prints "We detected multiple lockfiles"
- [ ] Set `NEXTAUTH_SECRET` in `.env.local` to a random 32-byte string → Verify: env file contains it, login still works after restart
- [ ] Replace placeholder logo with the real Pâtisserie Haloui logo (PNG/SVG from client, save as `public/assets/logo.svg`) → Verify: dashboard + every print shows the real logo

### Phase C2 — Real logo asset (depends on client)
- [ ] Ask client for vector logo or high-resolution PNG. If unavailable, trace the chef-mascot from the WhatsApp photos into a clean SVG → Verify: logo at 64×64 looks crisp, at 200×200 still crisp

---

## Stream D — Verification (LAST)

### Phase D1 — Smoke test
- [ ] Login as admin with new password → add 3 produits → add 1 client → create 1 devis with 3 lines → convert to facture → print → enter today's CA on 6 magasins → check dashboard shows it. **No errors, audit log records all events.** → Verify: every step succeeds, all data visible after page refresh

### Phase D2 — Print test on the client's printer
- [ ] Print every one of the 7 templates on the actual printer used by the client. Check: colors faithful, no margin clipping, page breaks correct (no orphan totals on page 2) → Verify: physical pages match preview within 3mm tolerance

### Phase D3 — Client UAT
- [ ] Sit with the client, walk through the 5 most-common workflows: (1) make a devis, (2) facture from devis, (3) BL for nador, (4) attestation for an employee, (5) enter today's CA. Record any confusion or "where do I click?" moments → Verify: client completes all 5 without help

### Phase D4 — Backup test
- [ ] Close the app, copy `data/haloui.db` to a USB stick, restore it on another machine, launch — same data appears → Verify: data portability confirmed
- [ ] Trigger a manual VACUUM INTO via a "Sauvegarder maintenant" button on Paramètres → Verify: file dated today appears in `data/backups/`

---

## Done When
- [ ] Sidebar has 6 primary items, plain language everywhere, no decorative gradients.
- [ ] All 7 print templates match the client's reference samples within 5mm tolerance.
- [ ] Logo replaced, secret set, scaffold folder removed, lockfile warning gone.
- [ ] Smoke test green, print test green, client completes UAT unaided.
- [ ] No TypeScript errors (`tsc --noEmit` passes).

---

## Order of execution

The streams are independent **for the most part**, but recommended order:

1. **Stream C1** (cleanup) — 1 hour. Clears the deck.
2. **Stream A** (UI simplification) — 2 days. The shared components touched here are also used inside the document edit pages, so doing this first means print pages can reuse the new spacing/typography tokens.
3. **Stream B** (print templates) — 2 days. The big visual work.
4. **Stream D** (verification) — half a day, with the client.

**Total realistic estimate: 4–5 working days.**

---

## Notes
- **Don't refactor `lib/data.ts`, `lib/numerotation.ts`, `lib/totals.ts`, or `db/schema.sql`.** They're solid; touching them risks breaking working logic for cosmetic gain.
- **Print fidelity is the product.** Get the BL and Fiche personnel pixel-close before showing the client — these are the two he'll judge first.
- **Test with the client's data**, not seeded examples. Have him provide one real devis/facture from his current paperwork to verify against.
- **Keep an "advanced mode" hidden in Paramètres** for things like TVA rates per product, audit log viewer, user CRUD. The everyday user shouldn't see them.
