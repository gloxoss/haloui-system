"use client";

import React, { useState, useTransition } from "react";
import { Modal, Button, TextInput, NumberInput, Select, Switch, Stack, Group, Text, Alert } from "@mantine/core";
import { Coins, Check, AlertCircle } from "lucide-react";
import { saveExchangeRateAction } from "@/app/actions";
import { type CurrencyRecord } from "@/lib/types";
import { DEVISES_STANDARDS } from "@/lib/constants";

interface RateModalProps {
  opened: boolean;
  onClose: () => void;
  rate: CurrencyRecord | null;
  locale?: string;
}

export function RateModal({ opened, onClose, rate, locale = "fr" }: RateModalProps) {
  const isAr = locale === "ar";
  const [code, setCode] = useState(rate?.code || "EUR");
  const [nom, setNom] = useState(rate?.nom || "Euro");
  const [symbole, setSymbole] = useState(rate?.symbole || "€");
  const [taux, setTaux] = useState<number>(rate?.taux ? Number(rate.taux) : 10.87);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(Boolean(rate?.taux_achat || rate?.taux_vente));
  const [tauxAchat, setTauxAchat] = useState<number | undefined>(rate?.taux_achat ? Number(rate.taux_achat) : undefined);
  const [tauxVente, setTauxVente] = useState<number | undefined>(rate?.taux_vente ? Number(rate.taux_vente) : undefined);
  const [estActif, setEstActif] = useState<boolean>(rate?.est_actif !== 0);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Update when rate prop changes
  React.useEffect(() => {
    if (rate) {
      setCode(rate.code);
      setNom(rate.nom);
      setSymbole(rate.symbole);
      setTaux(Number(rate.taux) || 1);
      setTauxAchat(rate.taux_achat ? Number(rate.taux_achat) : undefined);
      setTauxVente(rate.taux_vente ? Number(rate.taux_vente) : undefined);
      setShowAdvanced(Boolean(rate.taux_achat || rate.taux_vente));
      setEstActif(rate.est_actif !== 0);
    } else {
      setCode("EUR");
      setNom("Euro");
      setSymbole("€");
      setTaux(10.87);
      setTauxAchat(undefined);
      setTauxVente(undefined);
      setShowAdvanced(false);
      setEstActif(true);
    }
    setError("");
  }, [rate, opened]);

  const handleStandardSelect = (val: string | null) => {
    if (!val) return;
    const standard = DEVISES_STANDARDS.find((d) => d.code === val);
    if (standard) {
      setCode(standard.code);
      setNom(standard.nom);
      setSymbole(standard.symbole);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nom || !taux || taux <= 0) {
      setError(isAr ? "يرجى ملء جميع الحقول المطلوبة بسعر صحيح" : "Veuillez renseigner un code, un libellé et un taux valide (> 0).");
      return;
    }

    startTransition(async () => {
      setError("");
      const res = await saveExchangeRateAction({
        code: code.toUpperCase().trim(),
        nom: nom.trim(),
        symbole: symbole.trim(),
        taux: Number(taux),
        taux_achat: showAdvanced && tauxAchat ? Number(tauxAchat) : undefined,
        taux_vente: showAdvanced && tauxVente ? Number(tauxVente) : undefined,
        source: "manuel",
        est_actif: estActif ? 1 : 0,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || (isAr ? "حدث خطأ أثناء حفظ سعر الصرف" : "Erreur lors de l'enregistrement du cours."));
      }
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Coins size={18} strokeWidth={2} />
          </div>
          <div>
            <Text fw={700} size="sm">
              {rate
                ? (isAr ? `تعديل سعر صرف ${rate.code}` : `Modifier le taux : ${rate.code}`)
                : (isAr ? "إضافة عملة أجنبية جديدة" : "Ajouter une devise étrangère")}
            </Text>
            <Text size="xs" c="dimmed">
              {isAr ? "تحديد القيمة بالدرهم المغربي (MAD)" : "Définir la valeur de référence en Dirhams marocains (MAD)"}
            </Text>
          </div>
        </Group>
      }
      radius="lg"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md" mt="xs">
          {error ? (
            <Alert color="red" icon={<AlertCircle size={16} />} radius="md">
              {error}
            </Alert>
          ) : null}

          {!rate ? (
            <Select
              label={isAr ? "اختيار عملة شائعة بسرعة" : "Choisir une devise reconnue"}
              placeholder={isAr ? "اختر من القائمة..." : "Sélectionner une devise (EUR, USD, GBP...)"}
              data={DEVISES_STANDARDS.filter((d) => d.code !== "MAD").map((d) => ({
                value: d.code,
                label: `${d.code} - ${d.nom} (${d.symbole})`,
              }))}
              onChange={handleStandardSelect}
              radius="md"
            />
          ) : null}

          <Group grow>
            <TextInput
              label={isAr ? "رمز العملة (3 أحرف)" : "Code (ex: EUR, USD)"}
              placeholder="EUR"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={Boolean(rate)}
              required
              radius="md"
            />
            <TextInput
              label={isAr ? "الرمز" : "Symbole (€, $, £)"}
              placeholder="€"
              value={symbole}
              onChange={(e) => setSymbole(e.target.value)}
              required
              radius="md"
            />
          </Group>

          <TextInput
            label={isAr ? "اسم العملة" : "Nom de la devise"}
            placeholder="Euro, Dollar américain..."
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            radius="md"
          />

          <NumberInput
            label={isAr ? `كم درهم يساوي 1 ${code || "عملة"} ؟` : `Valeur en Dirhams (1 ${code || "Devise"} = ... MAD)`}
            description={isAr ? "السعر المعتمد لتحويل الفواتير والمدفوعات" : "Taux utilisé pour convertir automatiquement vos factures en Dirhams"}
            placeholder="10.8700"
            value={taux}
            onChange={(val) => setTaux(typeof val === "number" ? val : 0)}
            decimalScale={4}
            fixedDecimalScale
            min={0.0001}
            step={0.005}
            required
            radius="md"
          />

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]/50 p-3.5 flex items-center justify-between">
            <div>
              <Text size="sm" fw={600}>
                {isAr ? "تفعيل العملة في الفواتير" : "Disponible pour la facturation"}
              </Text>
              <Text size="xs" c="dimmed">
                {isAr ? "تظهر في قائمة اختيار العملات عند إنشاء فاتورة" : "Permet de choisir cette devise lors de l'établissement d'un devis ou d'une facture"}
              </Text>
            </div>
            <Switch
              checked={estActif}
              onChange={(e) => setEstActif(e.currentTarget.checked)}
              color="emerald"
            />
          </div>

          {/* Optional Bank Rates Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1.5"
            >
              {showAdvanced
                ? (isAr ? "− إخفاء أسعار الشراء والبيع البنكية" : "− Masquer les cours bancaires détaillés")
                : (isAr ? "+ تفاصيل إضافية (سعر الشراء والبيع البنكي)" : "+ Options avancées (Cours bancaire achat / vente)")}
            </button>

            {showAdvanced && (
              <Group grow mt="xs">
                <NumberInput
                  label={isAr ? "سعر الشراء البنكي" : "Cours achat banque"}
                  placeholder="Ex: 10.76"
                  value={tauxAchat}
                  onChange={(val) => setTauxAchat(typeof val === "number" ? val : undefined)}
                  decimalScale={4}
                  radius="md"
                />
                <NumberInput
                  label={isAr ? "سعر البيع البنكي" : "Cours vente banque"}
                  placeholder="Ex: 10.97"
                  value={tauxVente}
                  onChange={(val) => setTauxVente(typeof val === "number" ? val : undefined)}
                  decimalScale={4}
                  radius="md"
                />
              </Group>
            )}
          </div>

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="default" onClick={onClose} disabled={isPending} radius="md">
              {isAr ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              type="submit"
              loading={isPending}
              leftSection={<Check size={16} />}
              radius="md"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {isAr ? "حفظ التغييرات" : "Enregistrer"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
