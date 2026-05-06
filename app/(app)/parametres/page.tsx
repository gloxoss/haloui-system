import {
  manualBackupAction,
  resetBusinessDataAction,
  saveBranchAction,
  saveCompanyAction,
  saveFeatureFlagsAction,
} from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
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
import { APP_VERSION, FEATURE_TOGGLE_DEFINITIONS } from "@/lib/constants";
import { getCompany, getFeatureFlags, listBranches } from "@/lib/data";
import { BACKUP_DIR, DB_PATH } from "@/lib/runtime-paths";
import { cn } from "@/lib/utils";

const templateHint =
  "Variables: {{societe}}, {{employe}}, {{cnss}}, {{date_entree}}, {{salaire}}, {{date_du_jour}}";

function downloadLinkClass() {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-semibold text-[var(--foreground)] transition duration-200 hover:bg-[var(--background-alt)]",
  );
}

export default async function ParametresPage() {
  await requireSuperadmin();
  const company = getCompany();
  const branches = listBranches();
  const featureFlags = getFeatureFlags();

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Superadmin"
        title="Parametres avances"
        description="Pilotez les services, les sauvegardes et les exports."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="text-lg font-black">Informations societe</h3>
          <form action={saveCompanyAction} className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Raison sociale">
                <Input name="name" defaultValue={company.name} required />
              </Field>
              <Field label="Nom arabe">
                <Input
                  name="arabic_name"
                  defaultValue={company.arabic_name}
                  required
                  className="font-[var(--font-arabic)]"
                />
              </Field>
            </div>

            <Field label="Adresse">
              <Textarea name="address" defaultValue={company.address} className="min-h-24" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Telephone">
                <Input name="phone" defaultValue={company.phone} />
              </Field>
              <Field label="GSM">
                <Input name="gsm" defaultValue={company.gsm} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="RC">
                <Input name="rc" defaultValue={company.rc} />
              </Field>
              <Field label="IF">
                <Input name="if_number" defaultValue={company.if_number} />
              </Field>
              <Field label="TP">
                <Input name="tp" defaultValue={company.tp} />
              </Field>
              <Field label="ICE">
                <Input name="ice" defaultValue={company.ice} />
              </Field>
            </div>

            <Field label="Mention legale">
              <Textarea
                name="legal_notice"
                defaultValue={company.legal_notice}
                className="min-h-20"
              />
            </Field>

            <div className="grid gap-3 rounded-[20px] border bg-[var(--background-alt)] p-3.5">
              <div className="grid gap-1">
                <h4 className="text-base font-black">Textes des attestations</h4>
                <p className="text-xs text-[var(--muted)]">{templateHint}</p>
              </div>

              <Field label="Attestation simple" hint={templateHint}>
                <Textarea
                  name="attestation_template_simple"
                  defaultValue={company.attestation_template_simple}
                  className="min-h-28"
                />
              </Field>

              <Field label="Attestation avec salaire" hint={templateHint}>
                <Textarea
                  name="attestation_template_salary"
                  defaultValue={company.attestation_template_salary}
                  className="min-h-28"
                />
              </Field>

              <Field label="Attestation pour visa" hint={templateHint}>
                <Textarea
                  name="attestation_template_visa"
                  defaultValue={company.attestation_template_visa}
                  className="min-h-28"
                />
              </Field>

              <Field label="Attestation pour banque" hint={templateHint}>
                <Textarea
                  name="attestation_template_bank"
                  defaultValue={company.attestation_template_bank}
                  className="min-h-28"
                />
              </Field>
            </div>

            <UploadField
              name="logo_path"
              folder="logos"
              initialValue={company.logo_path}
              label="Logo"
            />

            <SubmitButton>Enregistrer les parametres</SubmitButton>
          </form>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">Services actives</h3>
              <p className="text-sm text-[var(--muted)]">
                Cochez ce que l'utilisateur voit dans l'application.
              </p>
            </div>

            <form action={saveFeatureFlagsAction} className="grid gap-3">
              <div className="grid gap-3">
                {FEATURE_TOGGLE_DEFINITIONS.map((feature) => (
                  <label
                    key={feature.key}
                    className="flex items-start gap-3 rounded-[18px] border bg-[var(--background-alt)] px-3.5 py-3"
                  >
                    <input
                      type="checkbox"
                      name={feature.key}
                      value="1"
                      defaultChecked={featureFlags[feature.key]}
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-semibold">{feature.label}</span>
                      <span className="text-xs text-[var(--muted)]">{feature.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <SubmitButton>Enregistrer les services</SubmitButton>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">Sauvegarde et export</h3>
              <p className="text-sm text-[var(--muted)]">
                Exportez les donnees pour sauvegarder ou migrer vers une autre app.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <a href="/api/export?format=sqlite" className={downloadLinkClass()}>
                  Export base SQLite
                </a>
                <a href="/api/export?format=sql" className={downloadLinkClass()}>
                  Export SQL complet
                </a>
                <a href="/api/export?format=xlsx" className={downloadLinkClass()}>
                  Export Excel complet
                </a>
                <form action={manualBackupAction}>
                  <Button type="submit" variant="secondary" className="w-full">
                    Sauvegarder maintenant
                  </Button>
                </form>
              </div>

              <div className="grid gap-2">
                <p className="text-xs font-semibold text-[var(--muted)]">Exports CSV rapides</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <a href="/api/export?format=csv&dataset=clients" className={downloadLinkClass()}>
                    CSV clients
                  </a>
                  <a href="/api/export?format=csv&dataset=produits" className={downloadLinkClass()}>
                    CSV produits
                  </a>
                  <a href="/api/export?format=csv&dataset=documents" className={downloadLinkClass()}>
                    CSV documents
                  </a>
                  <a href="/api/export?format=csv&dataset=document_lignes" className={downloadLinkClass()}>
                    CSV lignes documents
                  </a>
                  <a href="/api/export?format=csv&dataset=employes" className={downloadLinkClass()}>
                    CSV personnel
                  </a>
                  <a href="/api/export?format=csv&dataset=chiffre_affaires" className={downloadLinkClass()}>
                    CSV recettes
                  </a>
                </div>
              </div>

              <div className="rounded-[18px] border bg-[var(--background-alt)] px-3.5 py-3 text-xs text-[var(--muted)]">
                <div>Base actuelle: {DB_PATH}</div>
                <div className="mt-1">Dossier des sauvegardes: {BACKUP_DIR}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">Reinitialiser les donnees</h3>
              <p className="text-sm text-[var(--muted)]">
                Efface tous les documents, clients, produits, personnel, recettes et reglages metier.
              </p>
            </div>

            <div className="grid gap-3 rounded-[18px] border border-[#d6b3a7] bg-[#fbefeb] px-3.5 py-3">
              <div className="text-sm text-[#6e3a2a]">
                Les comptes utilisateurs sont conserves. Une sauvegarde locale est creee juste avant la reinitialisation.
              </div>
              <form action={resetBusinessDataAction}>
                <ConfirmSubmitButton
                  type="submit"
                  variant="danger"
                  className="w-full"
                  message="Reinitialiser toutes les donnees metier ? Les utilisateurs seront conserves, mais les clients, produits, documents, personnel, recettes et parametres seront remis a zero. Une sauvegarde sera creee juste avant."
                >
                  Reinitialiser la base metier
                </ConfirmSubmitButton>
              </form>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-black">Mise a jour de l'application</h3>
              <p className="text-sm text-[var(--muted)]">
                Gardez les donnees et remplacez seulement le code quand vous publiez une nouvelle version.
              </p>
            </div>

            <div className="rounded-[18px] border bg-[var(--background-alt)] px-3.5 py-3 text-sm">
              <p className="font-semibold">Version actuelle: {APP_VERSION}</p>
              <ol className="mt-3 grid gap-2 text-[13px] text-[var(--muted)]">
                <li>1. Telechargez d'abord la base SQLite ou faites une sauvegarde locale.</li>
                <li>2. Remplacez les fichiers de l'app par la nouvelle version.</li>
                <li>3. Conservez le dossier data et relancez l'application.</li>
                <li>4. Si besoin, importez les CSV ou le SQL dans un autre systeme.</li>
              </ol>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="text-lg font-black">Magasins</h3>
        <form
          action={saveBranchAction}
          className="mt-4 grid gap-4 rounded-[20px] border bg-[var(--background-alt)] p-3.5"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nom">
              <Input name="name" required />
            </Field>
            <Field label="Telephone">
              <Input name="phone" />
            </Field>
          </div>
          <Field label="Adresse">
            <Input name="address" />
          </Field>
          <input type="hidden" name="active" value="1" />
          <SubmitButton>Ajouter un magasin</SubmitButton>
        </form>

        <div className="mt-5">
          <Table>
            <THead>
              <tr>
                <TH>Magasin</TH>
                <TH>Coordonnees</TH>
                <TH>Statut</TH>
              </tr>
            </THead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <TD className="w-64">
                    <details>
                      <summary className="cursor-pointer list-none font-semibold">
                        {branch.name}
                      </summary>
                      <form
                        action={saveBranchAction}
                        className="mt-3.5 grid gap-3 rounded-xl border bg-[var(--background)] p-3"
                      >
                        <input type="hidden" name="id" value={branch.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Nom">
                            <Input name="name" defaultValue={branch.name} required />
                          </Field>
                          <Field label="Telephone">
                            <Input name="phone" defaultValue={branch.phone} />
                          </Field>
                        </div>
                        <Field label="Adresse">
                          <Input name="address" defaultValue={branch.address} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            name="active"
                            value="1"
                            defaultChecked={Boolean(branch.active)}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          Magasin actif
                        </label>
                        <SubmitButton variant="secondary">Mettre a jour</SubmitButton>
                      </form>
                    </details>
                  </TD>
                  <TD>
                    <div>{branch.address || "-"}</div>
                    <div className="text-xs text-[var(--muted)]">{branch.phone || "-"}</div>
                  </TD>
                  <TD>{branch.active ? "Active" : "Inactive"}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
