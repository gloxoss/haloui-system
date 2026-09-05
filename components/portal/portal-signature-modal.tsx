"use client";

import React, { useEffect, useRef, useState } from "react";
import { signClientDocumentAction } from "@/app/actions";
import { formatNumber } from "@/lib/utils";
import { type PortalDocumentItem } from "@/lib/types";

interface PortalSignatureModalProps {
  document: PortalDocumentItem;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isArabic?: boolean;
}

export function PortalSignatureModal({
  document,
  clientName,
  isOpen,
  onClose,
  onSuccess,
  isArabic = false,
}: PortalSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(clientName || "");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup canvas high-DPI scaling
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signerName.trim()) {
      setError(
        isArabic
          ? "يرجى كتابة الاسم الكامل للموقع."
          : "Veuillez renseigner le nom complet du signataire."
      );
      return;
    }

    if (!hasDrawn) {
      setError(
        isArabic
          ? "يرجى رسم توقيعكم داخل الإطار المخصص."
          : "Veuillez apposer votre signature dans le cadre prévu à cet effet."
      );
      return;
    }

    if (!agreed) {
      setError(
        isArabic
          ? "يجب تأكيد الموافقة على بنود هذا الطلب."
          : "Veuillez cocher la case d'approbation avant de valider."
      );
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");

    setIsSubmitting(true);
    try {
      const res = await signClientDocumentAction({
        documentId: document.id,
        signerName: signerName.trim(),
        signatureData,
      });

      if (!res.success) {
        setError(res.error || "Une erreur est survenue lors de l'enregistrement de la signature.");
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isArabic ? "توقيع إلكتروني آمن" : "Signature Électronique Certifiée"}
            </span>
            <h3 className="text-lg font-black text-[var(--foreground)]">
              {isArabic ? `تأكيد وتوقيع طلب الشراء N° ${document.numero}` : `Bon de Commande N° ${document.numero}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Summary Box */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-[var(--border)] text-sm">
            <div>
              <span className="text-zinc-500 block text-xs font-medium">
                {isArabic ? "المبلغ الإجمالي مع الرسوم (TTC)" : "Montant total TTC"}
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatNumber(document.total_ttc)} DH
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block text-xs font-medium">
                {isArabic ? "تاريخ الإصدار" : "Date du bon"}
              </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {document.date}
              </span>
            </div>
          </div>

          {/* Signer Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              {isArabic ? "الاسم الكامل للموقع أو المفوض عنه" : "Nom complet du signataire / Représentant légal"}
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={isArabic ? "مثال: ذ. مصطفى العلوي" : "Ex: M. Mohammed Bennani"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {isArabic ? "رسم التوقيع (باليد أو اللمس)" : "Votre signature manuscrite (doigt ou souris)"}
              </label>
              {hasDrawn && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  {isArabic ? "مسح وإعادة" : "Effacer"}
                </button>
              )}
            </div>

            <div className="relative rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-medium">
                  {isArabic ? "✍️ ارسم توقيعك هنا داخل الإطار" : "✍️ Dessinez votre signature ici"}
                </div>
              )}
            </div>
          </div>

          {/* Legal Acceptance Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 border border-transparent hover:border-[var(--border)] transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
              {isArabic
                ? "أؤكد بموجب هذا التوقيع موافقتي التامة وقبولي الرسمي لبنود وأسعار هذا الطلب التجاري."
                : "« Bon pour accord ». Je confirme expressément avoir pris connaissance des conditions et donne mon accord formel d'engagement sur ce bon de commande."}
            </span>
          </label>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isArabic ? "إلغاء" : "Annuler"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasDrawn || !agreed}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  {isArabic ? "جاري التسجيل..." : "Signature en cours..."}
                </>
              ) : (
                <>
                  <span>✓</span>
                  {isArabic ? "تأكيد وتوقيع الطلب" : "Confirmer et signer"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
