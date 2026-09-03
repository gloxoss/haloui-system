import Image from "next/image";

import {
  ARABIC_ADDRESS,
  PrintLogo,
  PrintPage,
  type PrintEmployeeContext,
  dottedValue,
  formatPrintAmount,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function FichePersonnelTemplate({
  company,
  employee,
}: PrintEmployeeContext) {
  const currentDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <PrintPage className="flex flex-col justify-between h-full min-h-[inherit]">
      {/* Upper Content Area */}
      <div className="flex flex-col gap-3.5">
        {/* Header: Company on Left, Matricule & Date on Right */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-[var(--print-border-strong)] pb-3">
          {/* Company Branding & Contact */}
          <div className="flex items-start gap-4">
            <PrintLogo company={company} size="large" className="shrink-0 pt-0.5" />
            <div className="text-[11px] text-[var(--print-text-muted)] space-y-0.5 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-black uppercase tracking-tight text-[var(--print-text)]">
                  {company.name}
                </span>
                {company.arabic_name ? (
                  <span className="font-[var(--font-arabic)] text-[12px] font-bold text-[var(--print-accent-dark)]">
                    {company.arabic_name}
                  </span>
                ) : null}
              </div>
              {company.address ? <div>{company.address}</div> : null}
              {company.phone || company.gsm ? (
                <div>
                  Tél : <strong className="text-[var(--print-text)]">{company.phone || company.gsm}</strong>
                </div>
              ) : null}
              {company.ice ? (
                <div className="font-mono text-[10px]">
                  ICE : <strong className="font-sans text-[var(--print-text)]">{company.ice}</strong>
                </div>
              ) : null}
            </div>
          </div>

          {/* Document Type & Number Badge */}
          <div className="text-right space-y-1">
            <div className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--print-text-muted)]">
              Dossier du personnel
            </div>
            <div className="rounded-xl border-2 border-[var(--print-border-strong)] bg-white px-3.5 py-1.5 inline-block text-right">
              <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[var(--print-text-muted)]">
                Matricule Salarié
              </div>
              <div className="flex items-baseline justify-end gap-1.5 text-[var(--print-text)]">
                <span className="text-[13px] font-bold text-[var(--print-text-muted)]">N°</span>
                <span className="text-[22px] font-black tracking-tight leading-none text-[var(--print-accent-dark)]">
                  {String(employee.numero).padStart(3, "0")}
                </span>
              </div>
            </div>
            <div className="text-[10.5px] text-[var(--print-text-muted)] font-medium">
              Édité le : <strong className="text-[var(--print-text)]">{currentDate}</strong>
            </div>
          </div>
        </header>

        {/* Title Banner */}
        <div className="rounded-lg bg-[var(--print-accent-dark)] text-white px-4 py-2 flex items-center justify-between">
          <h1 className="text-[14px] font-black uppercase tracking-[0.08em]">
            Fiche Individuelle du Personnel
          </h1>
          <span className="font-[var(--font-arabic)] text-[13px] font-bold opacity-90">
            بطاقة معلومات المستخدم
          </span>
        </div>

        {/* Main Grid: Info Cards (Left) & Photo/Ref (Right) */}
        <div className="grid grid-cols-[1fr_64mm] gap-4 items-start">
          {/* Left Column: Civil, Job, Coordinates */}
          <div className="grid gap-3">
            {/* Section 1: Identité */}
            <SectionCard title="1. État Civil & Identité">
              <div className="grid gap-2.5">
                <FieldPair
                  left={{ label: "Nom de famille", value: employee.nom }}
                  right={{ label: "Prénom", value: employee.prenom }}
                />
                <FieldPair
                  left={{
                    label: "Date & Lieu de naissance",
                    value: [formatPrintDate(employee.date_naissance), employee.lieu_naissance].filter(Boolean).join(" à "),
                  }}
                  right={{ label: "Situation familiale", value: employee.etat_civil || "Non renseignée" }}
                />
                <FieldPair
                  left={{ label: "N° d'immatriculation CNSS", value: employee.cnss || "En cours d'immatriculation" }}
                  right={{ label: "Nationalité", value: "Marocaine" }}
                />
              </div>
            </SectionCard>

            {/* Section 2: Parcours & Situation Professionnelle */}
            <SectionCard title="2. Situation Professionnelle">
              <div className="grid gap-2.5">
                <FieldPair
                  left={{ label: "Date d'embauche (Entrée)", value: formatPrintDate(employee.date_entree) }}
                  right={{
                    label: "Date de sortie",
                    value: employee.date_sortie ? formatPrintDate(employee.date_sortie) : "En activité (Actif)",
                  }}
                />
                <FieldPair
                  left={{
                    label: "Salaire de base déclaré",
                    value: employee.salaire > 0 ? `${formatPrintAmount(employee.salaire)} MAD` : "Selon contrat",
                  }}
                  right={{ label: "Statut administratif", value: "Salarié sous contrat" }}
                />
              </div>
            </SectionCard>

            {/* Section 3: Coordonnées & Résidence */}
            <SectionCard title="3. Coordonnées & Résidence">
              <div className="grid gap-2.5">
                <FieldLine label="Téléphone mobile" value={employee.telephone} />
                <FieldBlock label="Adresse de résidence" value={employee.adresse} tall />
              </div>
            </SectionCard>
          </div>

          {/* Right Column: Photo & Administrative Meta */}
          <aside className="grid gap-3">
            {/* Photo Card */}
            <div className="rounded-xl border border-[var(--print-border-medium)] bg-white p-3.5">
              <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
                Photographie d'identité
              </div>
              <div className="flex h-[68mm] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[var(--print-border-light)] bg-[var(--surface-soft,rgba(0,0,0,0.02))]">
                {employee.photo_path ? (
                  <Image
                    src={employee.photo_path}
                    alt={`${employee.prenom} ${employee.nom}`}
                    width={300}
                    height={380}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid place-items-center px-3 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[var(--print-border-light)] flex items-center justify-center text-[var(--print-text-muted)] mb-1.5">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--print-text-muted)]">
                      Cadre réservé
                    </span>
                    <span className="mt-0.5 text-[10px] text-[var(--print-text-muted)]">
                      Photo d'identité à coller
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Verification / Archiving Card */}
            <div className="rounded-xl border border-[var(--print-border-medium)] bg-white p-3.5 space-y-2 text-[11px] leading-snug text-[var(--print-text)]">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
                Archivage &amp; Contrôle
              </div>
              <div className="text-[11px] text-[var(--print-text-muted)]">
                Document interne établi pour le suivi administratif et la gestion du personnel.
              </div>
              <div className="pt-1 border-t border-[var(--print-border-light)] flex justify-between text-[11px]">
                <span className="text-[var(--print-text-muted)]">Ville :</span>
                <span className="font-bold text-[var(--print-text)]">Tanger</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--print-text-muted)]">Service :</span>
                <span className="font-bold text-[var(--print-text)]">Ressources Humaines</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Official Signatures & Validations (Fills the document naturally) */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Employee Signature */}
          <div className="rounded-xl border border-[var(--print-border-medium)] bg-white p-3 flex flex-col justify-between min-h-[32mm]">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
                Émargement du Salarié
              </div>
              <div className="text-[10px] text-[var(--print-text-muted)] italic mt-1">
                « Je soussigné(e), certifie l'exactitude des renseignements ci-dessus. »
              </div>
            </div>
            <div className="text-[10.5px] text-[var(--print-text-muted)] pt-6">
              Date &amp; Signature :
            </div>
          </div>

          {/* Management Stamp & Signature */}
          <div className="rounded-xl border border-[var(--print-border-medium)] bg-white p-3 flex flex-col justify-between min-h-[32mm]">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
                Visa &amp; Cachet de la Direction
              </div>
              <div className="text-[10px] text-[var(--print-text-muted)] italic mt-1">
                Pour la Direction / Service Ressources Humaines
              </div>
            </div>
            <div className="text-[10.5px] text-[var(--print-text-muted)] pt-6 flex justify-between items-end">
              <span>Cachet &amp; Signature autorisée :</span>
              <span className="font-mono text-[9px] opacity-40">[ HALOUI RH ]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Legal Footer */}
      <footer className="mt-4 border-t-2 border-[var(--print-border-strong)] pt-2.5">
        <div className="grid grid-cols-[1.25fr_0.75fr] gap-4 items-center">
          <div className="text-[9.5px] leading-relaxed text-[var(--print-text)]">
            <div className="font-black text-[var(--print-text)] uppercase tracking-wide">
              {company.name}
            </div>
            <div className="text-[var(--print-text-muted)]">{company.address}</div>
            <div className="text-[var(--print-text-muted)] mt-0.5">
              Tél : <strong className="text-[var(--print-text)]">{company.phone || "-"}</strong> | GSM :{" "}
              <strong className="text-[var(--print-text)]">{company.gsm || "-"}</strong>
              {company.ice ? (
                <> | ICE : <strong className="font-mono text-[var(--print-text)]">{company.ice}</strong></>
              ) : null}
            </div>
          </div>
          <div className="text-right font-[var(--font-arabic)] text-[10px] leading-relaxed text-[var(--print-text)]">
            <div className="font-bold text-[var(--print-accent-dark)]">
              {company.arabic_name || ARABIC_ADDRESS}
            </div>
            <div className="text-[var(--print-text-muted)]">{ARABIC_ADDRESS}</div>
            <div className="text-[8.5px] text-[var(--print-text-muted)] mt-0.5 font-sans">
              RC: {company.rc || "-"} | IF: {company.if_number || "-"} | TP: {company.tp || "-"}
            </div>
          </div>
        </div>
      </footer>
    </PrintPage>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--print-border-medium)] bg-white px-3.5 py-2.5 shadow-none">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
        {title}
      </div>
      {children}
    </section>
  );
}

function FieldPair({
  left,
  right,
}: {
  left: { label: string; value: string | null | undefined };
  right: { label: string; value: string | null | undefined };
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FieldBlock label={left.label} value={left.value} />
      <FieldBlock label={right.label} value={right.value} />
    </div>
  );
}

function FieldLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return <FieldBlock label={label} value={value} />;
}

function FieldBlock({
  label,
  value,
  tall = false,
}: {
  label: string;
  value: string | null | undefined;
  tall?: boolean;
}) {
  return (
    <div className="grid gap-0.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--print-text-muted)]">
        {label}
      </div>
      <div
        className={`border-b border-dotted border-[var(--print-border-medium)] text-[12.5px] font-bold leading-snug text-[var(--print-text)] ${
          tall ? "min-h-[14mm] pb-1" : "min-h-[6.5mm]"
        }`}
      >
        {dottedValue(value)}
      </div>
    </div>
  );
}
