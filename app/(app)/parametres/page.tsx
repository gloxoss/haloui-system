import {
  deleteBranchAction,
  manualBackupAction,
  resetBusinessDataAction,
  saveBranchAction,
  saveCompanyAction,
  saveFeatureFlagsAction,
} from "@/app/actions";
import { AttestationTemplateEditor } from "@/components/attestation-template-editor";
import { PageHeading } from "@/components/page-heading";
import { ThemeSelectorForm } from "@/components/theme-selector-form";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requireSuperadmin } from "@/lib/auth";
import {
  APP_VERSION,
  FEATURE_TOGGLE_DEFINITIONS,
} from "@/lib/constants";
import { getActiveCompany } from "@/lib/company";
import { getFeatureFlags, getThemeSettings, listBranches } from "@/lib/data";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { BACKUP_DIR, DB_PATH } from "@/lib/runtime-paths";
import { cn } from "@/lib/utils";

function downloadLinkClass() {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-semibold text-[var(--foreground)] transition duration-200 hover:bg-[var(--background-alt)]",
  );
}

const FEATURE_LOCALES_AR: Record<string, { label: string; description: string }> = {
  devis: { label: "الدوڤيات (Devis)", description: "تفعيل إنشاء وعرض عروض الأسعار والدوڤيات." },
  factures: { label: "الفواتير (Factures)", description: "تفعيل إنشاء وعرض الفواتير التجارية الرسمية." },
  bons_livraison: { label: "بونات التوصيل (BL)", description: "تفعيل بونات التسليم وخروج السلعة للكليان." },
  bons_sortie: { label: "بونات الخروج (BS)", description: "تفعيل بونات خروج السلعة وتحويلها بين المحلات." },
  bons_commande: { label: "بونات الكوموند (BC)", description: "تفعيل بونات الطلب وشراء السلعة من الفورنيسور." },
  produits: { label: "السلعة والمنتوجات", description: "تفعيل كتالوج السلعة، الأثمنة والتعديل الجماعي." },
  clients: { label: "الكليان والزبناء", description: "تفعيل دليل وحسابات الكليان وأرقام ICE." },
  fournisseurs: { label: "الفورنيسور والموردين", description: "تفعيل دليل الموردين وحسابات الشراء." },
  chiffre_affaires: { label: "المداخيل ولاكيس", description: "تفعيل تتبع ومقارنة مداخيل الصندوق والمبيعات." },
  personnel: { label: "المستخدمين والعمال", description: "تفعيل ملفات المستخدمين، الأجور والتتبع." },
  attestations: { label: "شهادات العمل", description: "تفعيل إصدار وطباعة شهادات العمل الرسمية." },
  multi_societes: { label: "الشركات المتعددة (Multi-Sociétés)", description: "تفعيل التبديل بين عدة شركات ومحطات قانونية في أعلى الصفحة." },
  multi_branches: { label: "المحلات والمحطات المتعددة (Multi-Magasins)", description: "تفعيل إدارة وتحديد نقاط البيع والمحلات في الفواتير والتقارير." },
  multi_langue: { label: "تغيير اللغة (فرنسية / عربية)", description: "تفعيل زر التبديل بين اللغتين في رأس الصفحة." },
  utilisateurs: { label: "حسابات المستخدمين", description: "تفعيل إدارة الحسابات، الصلاحيات وسجل العمليات (خاص بالسوبر أدمين)." },
};

const CATEGORY_META: Record<
  "commercial" | "caisse" | "rh" | "multientite" | "systeme",
  { fr: string; ar: string; badge: string }
> = {
  commercial: {
    fr: "Ventes, Achats & Documents Commerciaux",
    ar: "المبيعات، الشراء والوثائق التجارية",
    badge: "8 modules",
  },
  caisse: {
    fr: "Suivi Financier & Caisse Quotidienne",
    ar: "التتبع المالي والصندوق اليومي",
    badge: "1 module",
  },
  rh: {
    fr: "Ressources Humaines & Attestations",
    ar: "الموارد البشرية وشهادات العمل",
    badge: "2 modules",
  },
  multientite: {
    fr: "Multi-Sociétés & Multi-Magasins",
    ar: "الشركات ونقاط البيع المتعددة",
    badge: "2 modules",
  },
  systeme: {
    fr: "Système, Langue & Utilisateurs",
    ar: "النظام، اللغة والمستخدمين",
    badge: "2 modules",
  },
};

export default async function ParametresPage() {
  await requireSuperadmin();

  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const company = await getActiveCompany();
  const branches = listBranches({ companyId: company.id });
  const featureFlags = getFeatureFlags();
  const themeSettings = getThemeSettings();

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={dict.settings.superadminSection}
        title={dict.settings.title}
        description={dict.settings.subtitle}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="text-lg font-black">{dict.settings.companyInfo}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {dict.settings.companyInfoDesc}
          </p>
          <form action={saveCompanyAction} className="mt-4 grid gap-4">
            <input type="hidden" name="id" value={company.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={dict.settings.raisonSociale}>
                <Input name="name" defaultValue={company.name} required />
              </Field>
              <Field label={dict.settings.arabicName}>
                <Input
                  name="arabic_name"
                  defaultValue={company.arabic_name}
                  required
                  className="font-[var(--font-arabic)]"
                />
              </Field>
            </div>

            <Field label={dict.settings.address}>
              <Textarea name="address" defaultValue={company.address} className="min-h-24" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={dict.settings.phone}>
                <Input name="phone" defaultValue={company.phone} />
              </Field>
              <Field label={dict.settings.gsm}>
                <Input name="gsm" defaultValue={company.gsm} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label={dict.settings.rc}>
                <Input name="rc" defaultValue={company.rc} />
              </Field>
              <Field label={dict.settings.ifNumber}>
                <Input name="if_number" defaultValue={company.if_number} />
              </Field>
              <Field label={dict.settings.tp}>
                <Input name="tp" defaultValue={company.tp} />
              </Field>
              <Field label={dict.settings.ice}>
                <Input name="ice" defaultValue={company.ice} />
              </Field>
            </div>

            <Field label={dict.settings.legalNotice}>
              <Textarea
                name="legal_notice"
                defaultValue={company.legal_notice}
                className="min-h-20"
              />
            </Field>

            <AttestationTemplateEditor initialValues={company} />

            <UploadField
              name="logo_path"
              folder="logos"
              initialValue={company.logo_path}
              label={dict.settings.logo}
            />

            <SubmitButton>{dict.settings.saveCompanyInfo}</SubmitButton>
          </form>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">{dict.settings.themes}</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.themesDesc}
              </p>
            </div>

            <ThemeSelectorForm initialSettings={themeSettings} />
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">{dict.settings.modules}</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.modulesDesc}
              </p>
            </div>

            <form action={saveFeatureFlagsAction} className="grid gap-4">
              {(["commercial", "caisse", "rh", "multientite", "systeme"] as const).map((catKey) => {
                const categoryFeatures = FEATURE_TOGGLE_DEFINITIONS.filter((f) => f.category === catKey);
                if (!categoryFeatures.length) return null;
                const meta = CATEGORY_META[catKey];

                return (
                  <div key={catKey} className="grid gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-xs">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                        {locale === "ar" ? meta.ar : meta.fr}
                      </span>
                      <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--muted-strong)]">
                        {meta.badge}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      {categoryFeatures.map((feature) => {
                        const localizedMeta =
                          locale === "ar" && FEATURE_LOCALES_AR[feature.key]
                            ? FEATURE_LOCALES_AR[feature.key]
                            : { label: feature.label, description: feature.description };

                        return (
                          <label
                            key={feature.key}
                            className="flex cursor-pointer items-start gap-3 rounded-[14px] border bg-[var(--background-alt)] px-3 py-2.5 transition hover:border-[var(--accent)] hover:shadow-xs"
                          >
                            <input
                              type="checkbox"
                              name={feature.key}
                              value="1"
                              defaultChecked={featureFlags[feature.key]}
                              className="mt-1 h-4 w-4 accent-[var(--accent)]"
                            />
                            <span className="grid gap-0.5">
                              <span className="text-sm font-semibold text-[var(--foreground)]">{localizedMeta.label}</span>
                              <span className="text-xs text-[var(--muted)]">{localizedMeta.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                <SubmitButton className="w-full">{dict.settings.saveModules}</SubmitButton>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">{dict.settings.backups}</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.backupsDesc}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <a href="/api/export?format=sqlite" className={downloadLinkClass()}>
                  {dict.settings.sqliteExport}
                </a>
                <a href="/api/export?format=sql" className={downloadLinkClass()}>
                  {dict.settings.sqlExport}
                </a>
                <a href="/api/export?format=xlsx" className={downloadLinkClass()}>
                  {dict.settings.excelExport}
                </a>
                <form action={manualBackupAction}>
                  <Button type="submit" variant="secondary" className="w-full">
                    {dict.settings.backupNow}
                  </Button>
                </form>
              </div>

              <div className="grid gap-2">
                <p className="text-xs font-semibold text-[var(--muted)]">{dict.settings.quickCsv}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <a href="/api/export?format=csv&dataset=clients" className={downloadLinkClass()}>
                    {dict.settings.csvClients}
                  </a>
                  <a href="/api/export?format=csv&dataset=produits" className={downloadLinkClass()}>
                    {dict.settings.csvProducts}
                  </a>
                  <a href="/api/export?format=csv&dataset=documents" className={downloadLinkClass()}>
                    {dict.settings.csvDocuments}
                  </a>
                  <a href="/api/export?format=csv&dataset=document_lignes" className={downloadLinkClass()}>
                    {dict.settings.csvLines}
                  </a>
                  <a href="/api/export?format=csv&dataset=employes" className={downloadLinkClass()}>
                    {dict.settings.csvPersonnel}
                  </a>
                  <a href="/api/export?format=csv&dataset=chiffre_affaires" className={downloadLinkClass()}>
                    {dict.settings.csvRevenue}
                  </a>
                </div>
              </div>

              <div className="rounded-[18px] border bg-[var(--background-alt)] px-3.5 py-3 text-xs text-[var(--muted)]">
                <div>{dict.settings.currentDb} {DB_PATH}</div>
                <div className="mt-1">{dict.settings.backupFolder} {BACKUP_DIR}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black text-[var(--danger)]">{dict.settings.dangerZone}</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.dangerZoneDesc}
              </p>
            </div>

            <div className="grid gap-3 rounded-[18px] border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-3">
              <div className="text-sm text-[var(--danger)]">
                {dict.settings.dangerWarning}
              </div>
              <form action={resetBusinessDataAction}>
                <ConfirmSubmitButton
                  type="submit"
                  variant="danger"
                  className="w-full"
                  message={dict.settings.confirmResetMessage}
                >
                  {dict.settings.resetDatabase}
                </ConfirmSubmitButton>
              </form>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">{dict.settings.systemInfo}</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.systemInfoDesc}
              </p>
            </div>

            <div className="rounded-[18px] border bg-[var(--background-alt)] px-3.5 py-3 text-sm">
              <p className="font-semibold">{dict.settings.currentVersion} {APP_VERSION}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {dict.settings.systemPurpose}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Magasins / Emplacements Management Card */}
      {featureFlags.multi_branches ? (
        <Card>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">{dict.settings.storesTitle} — {company.name} ({branches.length})</h3>
              <p className="text-sm text-[var(--muted)]">
                {dict.settings.storesDesc}
              </p>
            </div>
          </div>

          {/* Add Branch Form */}
          <form
            action={saveBranchAction}
            className="mt-4 grid gap-3.5 rounded-[20px] border border-[var(--border)] bg-[var(--background-alt)] p-4"
          >
            <input type="hidden" name="company_id" value={company.id} />
            <div className="text-sm font-bold text-[var(--foreground)]">{dict.settings.addNewStore}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={dict.settings.storeName}>
                <Input name="name" placeholder={locale === "ar" ? "مثال: محل المدينة / Centre-Ville" : "Ex: Boutique Centre-Ville"} required />
              </Field>
              <Field label={dict.settings.storePhone}>
                <Input name="phone" placeholder="Ex: 0539 00 00 00" />
              </Field>
            </div>
            <Field label={dict.settings.storeAddress}>
              <Input name="address" placeholder={locale === "ar" ? "مثال: شارع الحسن الثاني، طنجة" : "Ex: Angle Boulevard Hassan II, Tanger"} />
            </Field>
            <input type="hidden" name="active" value="1" />
            <div>
              <SubmitButton>{dict.settings.createStore}</SubmitButton>
            </div>
          </form>

          {/* Existing Branches List */}
          <div className="mt-5">
            <Table>
              <THead>
                <tr>
                  <TH>{dict.settings.storeCol}</TH>
                  <TH>{dict.settings.coordsCol}</TH>
                  <TH>{dict.settings.statusCol}</TH>
                  <TH className={locale === "ar" ? "text-left" : "text-right"}>{dict.settings.actionsCol}</TH>
                </tr>
              </THead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-b border-[var(--border)]">
                    <TD className="w-72">
                      <details className="group">
                        <summary className="cursor-pointer list-none font-bold text-[var(--foreground)] transition hover:text-[var(--accent)]">
                          <span className="inline-flex items-center gap-2">
                            <span>{branch.name}</span>
                            <span className="text-xs text-[var(--muted)] underline group-open:hidden">
                              {dict.settings.editStore}
                            </span>
                          </span>
                        </summary>
                        <form
                          action={saveBranchAction}
                          className="mt-3.5 grid gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] p-3.5 shadow-sm"
                        >
                          <input type="hidden" name="id" value={branch.id} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label={dict.settings.storeName}>
                              <Input name="name" defaultValue={branch.name} required />
                            </Field>
                            <Field label={dict.settings.storePhone}>
                              <Input name="phone" defaultValue={branch.phone} />
                            </Field>
                          </div>
                          <Field label={dict.settings.storeAddress}>
                            <Input name="address" defaultValue={branch.address} />
                          </Field>
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              name="active"
                              value="1"
                              defaultChecked={Boolean(branch.active)}
                              className="h-4 w-4 accent-[var(--accent)]"
                            />
                            {dict.settings.storeActiveLabel}
                          </label>
                          <div className="flex items-center gap-2 pt-1">
                            <SubmitButton variant="secondary">{dict.settings.updateStore}</SubmitButton>
                          </div>
                        </form>
                      </details>
                    </TD>
                    <TD>
                      <div className="font-medium">{branch.address || (locale === "ar" ? "لا يوجد عنوان" : "Aucune adresse")}</div>
                      <div className="text-xs text-[var(--muted)]">{branch.phone || (locale === "ar" ? "لا يوجد هاتف" : "Aucun téléphone")}</div>
                    </TD>
                    <TD>
                      {branch.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {dict.settings.activeStatus}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          {dict.settings.inactiveStatus}
                        </span>
                      )}
                    </TD>
                    <TD className={locale === "ar" ? "text-left" : "text-right"}>
                      <form action={deleteBranchAction} className="inline-block">
                        <input type="hidden" name="id" value={branch.id} />
                        <ConfirmSubmitButton
                          type="submit"
                          variant="ghost"
                          className="text-xs text-rose-600 hover:bg-rose-50"
                          message={`${dict.settings.deleteStoreConfirm} (${branch.name})`}
                        >
                          {dict.settings.deleteStore}
                        </ConfirmSubmitButton>
                      </form>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      {/* Attestations Template Studio (when personnel and attestations active) */}
      {featureFlags.personnel && featureFlags.attestations ? (
        <AttestationTemplateEditor initialValues={company} />
      ) : null}
    </div>
  );
}
