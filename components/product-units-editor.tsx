"use client";

import * as React from "react";
import { saveProductUnitsAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { DEFAULT_PRODUCT_UNITS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { Plus, RotateCcw, Sparkles, Tag, X } from "lucide-react";

const PRESET_UNIT_GROUPS = [
  {
    nameFr: "Poids & Masse",
    nameAr: "الوزن والكتلة",
    units: ["kg", "kilo", "g", "tonne", "quintal"],
  },
  {
    nameFr: "Volume & Liquides",
    nameAr: "الحجم والسوائل",
    units: ["L", "litre", "ml", "cl", "bidon", "m³"],
  },
  {
    nameFr: "Conditionnement & Emballage",
    nameAr: "التعبئة والتعليب",
    units: ["pièce", "boîte", "carton", "pack", "plateau", "sac", "palette"],
  },
  {
    nameFr: "Longueur & Surface",
    nameAr: "الطول والمساحة",
    units: ["mètre", "m", "cm", "m²", "rouleau"],
  },
  {
    nameFr: "Unités standards & Vrac",
    nameAr: "الوحدات القياسية والخدمات",
    units: ["u", "unité", "voyage", "lot", "forfait"],
  },
];

export function ProductUnitsEditor({ initialUnits }: { initialUnits: string[] }) {
  const { locale } = useTranslation();
  const [units, setUnits] = React.useState<string[]>(
    initialUnits.length > 0 ? initialUnits : DEFAULT_PRODUCT_UNITS
  );
  const [newUnitInput, setNewUnitInput] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const handleAddUnit = (unitToAdd?: string) => {
    const raw = (unitToAdd ?? newUnitInput).trim();
    if (!raw) return;

    if (!units.includes(raw)) {
      setUnits([...units, raw]);
    }
    if (!unitToAdd) {
      setNewUnitInput("");
    }
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    if (units.length <= 1) {
      return; // Keep at least one unit
    }
    setUnits(units.filter((u) => u !== unitToRemove));
  };

  const handleResetDefaults = () => {
    setUnits([...DEFAULT_PRODUCT_UNITS]);
  };

  return (
    <form
      action={async (formData) => {
        await saveProductUnitsAction(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="units" value={units.join(",")} />

      {/* Active Units Display */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            {locale === "ar" ? "الوحدات النشطة حالياً في النظام" : "Unités actives dans le catalogue"} (
            {units.length})
          </label>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)] transition"
          >
            <RotateCcw className="h-3 w-3" />
            {locale === "ar" ? "استعادة الافتراضي" : "Rétablir par défaut"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background-alt)] p-3.5 min-h-[58px]">
          {units.map((unit) => (
            <span
              key={unit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-2xs transition hover:border-[var(--accent)] hover:shadow-xs"
            >
              <Tag className="h-3 w-3 text-[var(--accent)]" />
              <span>{unit}</span>
              <button
                type="button"
                onClick={() => handleRemoveUnit(unit)}
                className="ml-1 text-[var(--muted)] hover:text-rose-600 focus:outline-none"
                title={locale === "ar" ? "حذف هذه الوحدة" : "Supprimer cette unité"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Quick Add Custom Unit Input */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">
          {locale === "ar" ? "إضافة وحدة قياس جديدة مخصصة" : "Ajouter une nouvelle unité de mesure"}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newUnitInput}
            onChange={(e) => setNewUnitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUnit();
              }
            }}
            placeholder={
              locale === "ar"
                ? "اكتب الوحدة الجديدة (مثال: كيلو، متر، قنطار، طن، باكي...)"
                : "Ex: kilo, sac, paquet, rouleau, palette, gramme, quintal..."
            }
            className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => handleAddUnit()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-xs font-bold text-[var(--accent-foreground)] shadow-xs transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            {locale === "ar" ? "إضافة" : "Ajouter"}
          </button>
        </div>
      </div>

      {/* 1-Click Common Unit Suggestions */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--border)]">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            {locale === "ar" ? "اقتراحات سريعة بنقرة واحدة" : "Suggestions sectorielles rapides (1 clic)"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PRESET_UNIT_GROUPS.map((group, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--background-alt)] p-2.5">
              <div className="text-[11px] font-bold text-[var(--muted-strong)] mb-1.5">
                {locale === "ar" ? group.nameAr : group.nameFr}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.units.map((unit) => {
                  const alreadyAdded = units.includes(unit);
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => (alreadyAdded ? handleRemoveUnit(unit) : handleAddUnit(unit))}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        alreadyAdded
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-2xs"
                          : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span>{unit}</span>
                      {alreadyAdded ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-1">
        <SubmitButton>{locale === "ar" ? "حفظ وحدات القياس" : "Enregistrer les unités de mesure"}</SubmitButton>
        {saved && (
          <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
            {locale === "ar" ? "✓ تم حفظ الوحدات بنجاح" : "✓ Unités enregistrées avec succès"}
          </span>
        )}
      </div>
    </form>
  );
}
