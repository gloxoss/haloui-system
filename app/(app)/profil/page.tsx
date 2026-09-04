import { changeUserPasswordAction, saveThemeSettingsAction, updateProfileInfoAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAuth } from "@/lib/auth";
import { getActiveCompany } from "@/lib/company";
import { getUserAuditLogs, getUserById, getThemeSettings } from "@/lib/data";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { formatDateLong } from "@/lib/utils";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Palette,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";

export default async function ProfilPage() {
  const session = await requireAuth();
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const user = getUserById(session.user.id);
  const company = await getActiveCompany();
  const themeSettings = getThemeSettings();
  const auditLogs = getUserAuditLogs(session.user.id, 8);

  const roleBadge =
    session.user.role === "superadmin"
      ? {
          label: locale === "ar" ? "المسؤول العام للنظام" : "Super Administrateur",
          color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300",
          icon: ShieldCheck,
        }
      : session.user.role === "admin"
        ? {
            label: locale === "ar" ? "مدير النظام للشركة" : "Administrateur Société",
            color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
            icon: Building2,
          }
        : {
            label: locale === "ar" ? "مستخدم عادي" : "Utilisateur Standard",
            color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
            icon: User,
          };

  const RoleIcon = roleBadge.icon;
  const initialLetter = (user?.full_name || session.user.name || session.user.username || "U").charAt(0).toUpperCase();

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={locale === "ar" ? "الحساب الشخصي" : "Mon Compte"}
        title={dict.profile?.title || "Mon Profil"}
        description={dict.profile?.subtitle || "Gérez vos informations personnelles, votre sécurité et vos préférences"}
      />

      {/* Identity Overview Hero Card */}
      <Card className="relative overflow-hidden border-2 border-[var(--border-strong)] bg-gradient-to-br from-[var(--card)] via-[var(--background)] to-[var(--background-alt)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-3xl font-black text-[var(--accent-foreground)] shadow-md ring-4 ring-[var(--accent-soft)]"
            >
              {initialLetter}
            </div>

            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                  {user?.full_name || session.user.name || session.user.username}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${roleBadge.color}`}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleBadge.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {dict.profile?.activeYes || "Compte actif"}
                </span>
              </div>

              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                <span>@{user?.username || session.user.username}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {company.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 sm:border-t-0 sm:pt-0">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs shadow-2xs">
              <span className="text-[var(--muted)]">{dict.profile?.memberSince || "Membre depuis"}:</span>{" "}
              <strong className="text-[var(--foreground)]">
                {user?.created_at ? formatDateLong(user.created_at) : "Septembre 2026"}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Formulaires & Paramètres */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Informations personnelles & Sécurité */}
        <div className="grid gap-6">
          {/* Card 1: Informations Personnelles */}
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--foreground)]">
                  {dict.profile?.personalInfo || "Informations personnelles"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {dict.profile?.personalInfoDesc || "Mettez à jour vos coordonnées et détails de contact."}
                </p>
              </div>
            </div>

            <form action={updateProfileInfoAction} className="mt-5 grid gap-4">
              <Field label={dict.profile?.fullName || "Nom complet"}>
                <Input
                  name="full_name"
                  defaultValue={user?.full_name || session.user.name || ""}
                  placeholder="Ex: Mohammed Alami"
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={dict.profile?.username || "Nom d'utilisateur"}>
                  <div className="relative">
                    <Input
                      name="username_display"
                      defaultValue={user?.username || session.user.username || ""}
                      readOnly
                      className="bg-[var(--background-alt)] text-[var(--muted-strong)] cursor-not-allowed pr-8"
                    />
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-[var(--muted)]" />
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">
                    {locale === "ar" ? "اسم الدخول ثابت ومؤمن" : "Identifiant de connexion unique (lecture seule)"}
                  </span>
                </Field>

                <Field label={dict.profile?.role || "Rôle"}>
                  <div className="flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--background-alt)] px-3.5 text-xs font-bold text-[var(--foreground)]">
                    <RoleIcon className="mr-2 h-4 w-4 text-[var(--accent)]" />
                    {roleBadge.label}
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={dict.profile?.email || "Adresse email"}>
                  <div className="relative">
                    <Input
                      type="email"
                      name="email"
                      defaultValue={user?.email || ""}
                      placeholder="contact@entreprise.ma"
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-[var(--muted)]" />
                  </div>
                </Field>

                <Field label={dict.profile?.phone || "Numéro de téléphone"}>
                  <div className="relative">
                    <Input
                      type="tel"
                      name="phone"
                      defaultValue={user?.phone || ""}
                      placeholder="06 61 00 00 00"
                    />
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-[var(--muted)]" />
                  </div>
                </Field>
              </div>

              <div className="pt-2">
                <SubmitButton className="w-full sm:w-auto">
                  {dict.profile?.saveProfile || "Enregistrer les modifications"}
                </SubmitButton>
              </div>
            </form>
          </Card>

          {/* Card 2: Sécurité & Changement de mot de passe */}
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--foreground)]">
                  {dict.profile?.securityTitle || "Sécurité & Mot de passe"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {dict.profile?.securityDesc || "Modifiez votre mot de passe d'accès pour sécuriser votre compte."}
                </p>
              </div>
            </div>

            <form action={changeUserPasswordAction} className="mt-5 grid gap-4">
              <Field label={dict.profile?.currentPassword || "Mot de passe actuel"}>
                <Input
                  type="password"
                  name="current_password"
                  placeholder="••••••••••••"
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={dict.profile?.newPassword || "Nouveau mot de passe"}>
                  <Input
                    type="password"
                    name="new_password"
                    placeholder="Min. 6 caractères"
                    minLength={6}
                    required
                  />
                </Field>

                <Field label={dict.profile?.confirmPassword || "Confirmer le nouveau mot de passe"}>
                  <Input
                    type="password"
                    name="confirm_password"
                    placeholder="Min. 6 caractères"
                    minLength={6}
                    required
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--background-alt)] p-3 text-xs text-[var(--muted)]">
                {dict.profile?.passwordHint || "Le mot de passe doit comporter au moins 6 caractères pour garantir la sécurité de votre session."}
              </div>

              <div className="pt-1">
                <SubmitButton variant="secondary" className="w-full sm:w-auto">
                  {dict.profile?.updatePassword || "Mettre à jour le mot de passe"}
                </SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Préférences & Historique */}
        <div className="grid gap-6">
          {/* Card 3: Préférences de l'Espace de Travail */}
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--foreground)]">
                  {dict.profile?.preferences || "Préférences d'affichage"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {dict.profile?.preferencesDesc || "Personnalisez la densité d'affichage et l'interface de travail."}
                </p>
              </div>
            </div>

            <form action={saveThemeSettingsAction} className="mt-5 grid gap-4">
              <input type="hidden" name="theme_preset" value={themeSettings.preset} />
              <Field label={locale === "ar" ? "كثافة الشاشة (Densité)" : "Densité d'affichage"}>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition ${
                      themeSettings.density === "compact"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--background-alt)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme_density"
                      value="compact"
                      defaultChecked={themeSettings.density === "compact"}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--foreground)]">Compact</span>
                      {themeSettings.density === "compact" && <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {locale === "ar" ? "مدمج ومناسب للشاشات الكبيرة" : "Dense et optimal pour la saisie rapide"}
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition ${
                      themeSettings.density === "comfortable"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--background-alt)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme_density"
                      value="comfortable"
                      defaultChecked={themeSettings.density === "comfortable"}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--foreground)]">Confortable</span>
                      {themeSettings.density === "comfortable" && <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {locale === "ar" ? "مسافات أوسع ومريحة للقراءة" : "Espacé et aéré pour un confort visuel"}
                    </span>
                  </label>
                </div>
              </Field>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background-alt)] p-3">
                <div className="text-xs">
                  <span className="font-bold text-[var(--foreground)]">
                    {locale === "ar" ? "الشركة الحالية : " : "Société active : "}
                  </span>
                  <span className="text-[var(--muted)]">{company.name}</span>
                </div>
                <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--muted-strong)]">
                  ICE: {company.ice || "N/A"}
                </span>
              </div>

              <div className="pt-1">
                <SubmitButton variant="secondary" className="w-full">
                  {locale === "ar" ? "تطبيق تفضيلات العرض" : "Appliquer la densité"}
                </SubmitButton>
              </div>
            </form>
          </Card>

          {/* Card 4: Historique Récent de l'Utilisateur */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--foreground)]">
                    {dict.profile?.recentActivity || "Activité récente"}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {dict.profile?.recentActivityDesc || "Dernières actions enregistrées sur votre compte"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted-strong)]">
                {auditLogs.length} {locale === "ar" ? "عمليات" : "actions"}
              </span>
            </div>

            <div className="mt-4">
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-[var(--muted)]">
                  <Clock className="mb-2 h-8 w-8 opacity-40" />
                  <p>{dict.profile?.noActivity || "Aucune activité récente enregistrée."}</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background-alt)] px-3.5 py-2.5 text-xs transition hover:border-[var(--accent)]"
                    >
                      <div className="grid gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--foreground)] uppercase tracking-wide">
                            {log.action}
                          </span>
                          <span className="rounded-md bg-[var(--card)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted-strong)] border border-[var(--border)]">
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium text-[var(--muted)]">
                        {formatDateLong(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
