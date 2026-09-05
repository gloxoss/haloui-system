"use client";

import React, { useState, useTransition } from "react";
import {
  regeneratePortalSyncSecretAction,
  savePortalSyncSettingsAction,
  testPortalCloudConnectionAction,
  triggerPortalSyncAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type PortalSyncSettings } from "@/lib/types";
import {
  Cloud,
  Copy,
  Check,
  RefreshCw,
  Globe,
  ShieldCheck,
  Key,
  ExternalLink,
  ArrowDownUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PortalSyncCardProps {
  initialSettings: PortalSyncSettings;
  locale?: string;
}

export function PortalSyncCard({
  initialSettings,
  locale = "fr",
}: PortalSyncCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Async state
  const [isTesting, startTesting] = useTransition();
  const [isSyncing, startSyncing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isRegenerating, startRegenerating] = useTransition();

  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const isArabic = locale === "ar";

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(settings.syncSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRegenerateSecret = () => {
    if (
      !confirm(
        isArabic
          ? "هل أنت متأكد من إعادة توليد المفتاح السري ؟ سيتعين عليك تحديثه على السيرفر الخارجي."
          : "Êtes-vous sûr de vouloir régénérer la clé secrète ? Il faudra la reporter sur votre serveur déployé."
      )
    ) {
      return;
    }

    startRegenerating(async () => {
      const res = await regeneratePortalSyncSecretAction();
      if (res.success && res.syncSecret) {
        setSettings((prev) => ({ ...prev, syncSecret: res.syncSecret }));
        setTestResult(null);
      }
    });
  };

  const handleTestConnection = () => {
    setTestResult(null);
    startTesting(async () => {
      const res = await testPortalCloudConnectionAction();
      setTestResult(res);
    });
  };

  const handleSyncNow = () => {
    setSyncResult(null);
    startSyncing(async () => {
      const res = await triggerPortalSyncAction();
      setSyncResult(res);
      if (res.success && res.lastSyncedAt) {
        setSettings((prev) => ({ ...prev, lastSyncedAt: res.lastSyncedAt }));
      }
    });
  };

  const handleSaveForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const publicUrl = String(formData.get("public_url") || "").trim();
    const syncSecret = String(formData.get("sync_secret") || "").trim();

    startSaving(async () => {
      const res = await savePortalSyncSettingsAction(formData);
      if (res.success) {
        setSettings((prev) => ({ ...prev, publicUrl, syncSecret }));
        alert(isArabic ? "تم حفظ إعدادات المزامنة السحابية بنجاح." : "Paramètres de synchronisation enregistrés.");
      } else {
        alert(res.error || "Erreur lors de l'enregistrement.");
      }
    });
  };

  return (
    <Card className="border-blue-200/70 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/20 via-[var(--card)] to-indigo-50/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-[var(--foreground)]">
                {isArabic ? "مزامنة فضاء الزبون السحابي (Cloud Sync)" : "Portail Client & Cloud Sync (Desktop ↔ Web)"}
              </h3>
              <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Superadmin
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isArabic
                ? "ربط تطبيق Electron المكتبي مع فضاء الزبون المنشور على السيرفر ومزامنة الطلبيات الموقعة."
                : "Connecte votre application locale Electron avec le portail déployé sur le web pour échanger devis, factures et signatures."}
            </p>
          </div>
        </div>

        {/* Sync Trigger CTA */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            onClick={handleSyncNow}
            disabled={isSyncing || !settings.publicUrl}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            title="Lancer la synchronisation bidirectionnelle"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? (isArabic ? "جار المزامنة..." : "Synchronisation...") : (isArabic ? "مزامنة الآن 🔄" : "Synchroniser 🔄")}</span>
          </Button>
        </div>
      </div>

      {/* Sync Status Feedback */}
      {syncResult && (
        <div
          className={`mb-4 rounded-xl border p-3 text-xs flex items-start gap-2.5 transition-all ${
            syncResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          {syncResult.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold">{syncResult.success ? (isArabic ? "نجاح العملية :" : "Succès :") : (isArabic ? "خطأ :" : "Erreur :")}</span>{" "}
            {syncResult.message || syncResult.error}
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveForm} className="grid gap-4">
        {/* Public Portal URL */}
        <div>
          <Field
            label={isArabic ? "رابط فضاء الزبون المنشور على السيرفر (Public Web URL)" : "URL Publique du Portail Déployé"}
            hint={
              isArabic
                ? "الرابط الخارجي المتاح عبر الإنترنت (مثال: https://portal.votre-domaine.ma أو Vercel/VPS)."
                : "L'adresse accessible par vos clients sur Internet (ex: https://portal.votre-entreprise.ma ou https://haloui-portal.vercel.app)."
            }
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none" />
                <Input
                  name="public_url"
                  defaultValue={settings.publicUrl}
                  placeholder="https://portal.monentreprise.ma"
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestConnection}
                disabled={isTesting || !settings.publicUrl}
                className="shrink-0 gap-1.5 text-xs font-bold"
              >
                <ArrowDownUp className={`h-3.5 w-3.5 ${isTesting ? "animate-pulse" : ""}`} />
                <span>{isTesting ? (isArabic ? "فحص..." : "Test...") : (isArabic ? "فحص الاتصال" : "Tester")}</span>
              </Button>
            </div>
          </Field>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2 border ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              )}
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}
        </div>

        {/* Sync Secret Key */}
        <Field
          label={isArabic ? "المفتاح السري المشفر للمزامنة (Bearer Token)" : "Clé Secrète de Sécurité (Sync Secret)"}
          hint={
            isArabic
              ? "مفتاح أمان مشفر بـ 256-bit يمنع أي طرف غريب من الوصول أو مزامنة البيانات دون إذن."
              : "Jeton cryptographique utilisé pour sécuriser et authentifier les échanges entre l'application Desktop et le portail web."
          }
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none" />
              <Input
                name="sync_secret"
                type={showSecret ? "text" : "password"}
                defaultValue={settings.syncSecret}
                className="pl-9 pr-10 font-mono text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {showSecret ? "Masquer" : "Afficher"}
              </button>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopySecret}
              className="shrink-0 gap-1 text-xs"
              title="Copier la clé secrète"
            >
              {secretCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{secretCopied ? (isArabic ? "تم النسخ" : "Copié !") : (isArabic ? "نسخ" : "Copier")}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerateSecret}
              disabled={isRegenerating}
              className="shrink-0 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
              title="Générer une nouvelle clé"
            >
              {isArabic ? "تجديد" : "Régénérer"}
            </Button>
          </div>
        </Field>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--background-alt)] px-3.5 py-2.5 border text-xs">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${settings.publicUrl ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
            <span className="font-semibold text-[var(--foreground)]">
              {settings.publicUrl
                ? isArabic
                  ? "الربط السحابي مهيأ"
                  : "Liaison cloud configurée"
                : isArabic
                  ? "وضع محلي فقط (غير مربوط بسيرفر خارجي)"
                  : "Mode local uniquement (serveur distant non renseigné)"}
            </span>
          </div>

          <div className="text-[var(--muted)]">
            {settings.lastSyncedAt ? (
              <span>
                {isArabic ? "آخر مزامنة ناجحة :" : "Dernière synchro :"}{" "}
                <b className="text-[var(--foreground)]">{new Date(settings.lastSyncedAt).toLocaleString(isArabic ? "ar-MA" : "fr-FR")}</b>
              </span>
            ) : (
              <span>{isArabic ? "لم تتم المزامنة بعد" : "Aucune synchronisation effectuée"}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" disabled={isSaving} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>{isSaving ? (isArabic ? "جار الحفظ..." : "Enregistrement...") : (isArabic ? "حفظ الإعدادات" : "Enregistrer les paramètres")}</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
