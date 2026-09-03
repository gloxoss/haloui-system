"use client";

import * as React from "react";
import { saveThemeSettingsAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { THEME_DENSITY_DEFINITIONS, THEME_PRESET_DEFINITIONS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type ThemeDensity, type ThemePreset, type ThemeSettings } from "@/lib/types";

const THEME_AR: Record<string, { label: string; desc: string }> = {
  "slate-minimal": { label: "رمادي أردواز كلاسيكي", desc: "تصميم هادئ ونظيف بخلفية بيضاء ورمادي عصري." },
  "corporate-navy": { label: "أزرق ملكي للشركات", desc: "أزرق احترافي فخم مع تباين قوي ومريح للعين." },
  "emerald-luxe": { label: "زمردي حديث", desc: "أخضر مالي وراقي كيعطي انطباع بالاستقرار والثقة." },
  "indigo-royal": { label: "إنديجو ملكي", desc: "ألوان عصرية مائلة للبنفسجي بتقنية حديثة." },
  "crimson-executive": { label: "بوردي وعنابي للإدارة", desc: "أحمر داكن مميز للمدراء والشركات الكبرى." },
  "ocean-cyan": { label: "أزرق محيطي سيان", desc: "أزرق بحري مع سيان منعش وديناميكي." },
  "sunset-amber": { label: "نحاسي وأمبر دافئ", desc: "ألوان ترابية ودافئة مريحة للمصانع والورشات." },
  "violet-plum": { label: "برقوقي وبنفسجي مميز", desc: "درجات ألوان راقية تعبر عن الإبداع والتميز." },
  "monochrome-black": { label: "أبيض وأسود رسمي", desc: "أسلوب بسيط ودقيق: أبيض وأسود صافي وواضح." },
};

const DENSITY_AR: Record<string, { label: string; desc: string }> = {
  compact: { label: "مظهر مدمج وسريع (Compact)", desc: "عرض أكبر كمية من البيانات في الشاشة الواحدة." },
  comfortable: { label: "مظهر مريح ومتباعد (Confortable)", desc: "مسافات أوسع وخطوط واضحة للمطالعة المريحة." },
};

export function ThemeSelectorForm({ initialSettings }: { initialSettings: ThemeSettings }) {
  const { t, locale } = useTranslation();
  const [currentPreset, setCurrentPreset] = React.useState<ThemePreset>(initialSettings.preset);
  const [currentDensity, setCurrentDensity] = React.useState<ThemeDensity>(initialSettings.density);
  const [applied, setApplied] = React.useState(false);

  const handlePresetChange = (preset: ThemePreset) => {
    setCurrentPreset(preset);
    // Instant live preview
    document.documentElement.setAttribute("data-ui-theme", preset);
    document.body.setAttribute("data-ui-theme", preset);
    document.querySelectorAll("[data-ui-theme]").forEach((el) => {
      el.setAttribute("data-ui-theme", preset);
    });
  };

  const handleDensityChange = (density: ThemeDensity) => {
    setCurrentDensity(density);
    document.documentElement.setAttribute("data-ui-density", density);
    document.querySelectorAll("[data-ui-density]").forEach((el) => {
      el.setAttribute("data-ui-density", density);
    });
  };

  return (
    <form
      action={async (formData) => {
        await saveThemeSettingsAction(formData);
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
      }}
      className="grid gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_PRESET_DEFINITIONS.map((theme) => {
          const isChecked = currentPreset === theme.key;
          const themeLabel = locale === "ar" && THEME_AR[theme.key] ? THEME_AR[theme.key].label : theme.label;
          const themeDesc = locale === "ar" && THEME_AR[theme.key] ? THEME_AR[theme.key].desc : theme.description;

          return (
            <label
              key={theme.key}
              onClick={() => handlePresetChange(theme.key as ThemePreset)}
              className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-all duration-200 hover:border-[var(--accent)] hover:shadow-xs has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--surface-soft)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--accent)]/20"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Color Swatch Previews */}
                <div className="flex items-center gap-1.5">
                  {theme.swatches?.map((color, idx) => (
                    <span
                      key={idx}
                      className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                <input
                  type="radio"
                  name="theme_preset"
                  value={theme.key}
                  checked={isChecked}
                  onChange={() => handlePresetChange(theme.key as ThemePreset)}
                  className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="mt-2.5">
                <span className="text-sm font-extrabold text-[var(--foreground)] group-hover:text-[var(--accent)]">
                  {themeLabel}
                </span>
                <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">
                  {themeDesc}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_DENSITY_DEFINITIONS.map((density) => {
          const densityLabel = locale === "ar" && DENSITY_AR[density.key] ? DENSITY_AR[density.key].label : density.label;
          const densityDesc = locale === "ar" && DENSITY_AR[density.key] ? DENSITY_AR[density.key].desc : density.description;

          return (
            <label
              key={density.key}
              onClick={() => handleDensityChange(density.key as ThemeDensity)}
              className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 transition-all duration-200 hover:border-[var(--accent)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--surface-soft)]"
            >
              <input
                type="radio"
                name="theme_density"
                value={density.key}
                checked={currentDensity === density.key}
                onChange={() => handleDensityChange(density.key as ThemeDensity)}
                className="mt-1 h-4 w-4 accent-[var(--accent)] cursor-pointer"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-bold text-[var(--foreground)]">{densityLabel}</span>
                <span className="text-xs text-[var(--muted)]">{densityDesc}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{t.settings.applyTheme}</SubmitButton>
        {applied ? (
          <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
            {t.settings.themeSaved}
          </span>
        ) : null}
      </div>
    </form>
  );
}
