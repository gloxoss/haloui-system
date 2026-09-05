"use client";

import React, { useEffect, useRef, useState } from "react";
import { signClientDocumentAction } from "@/app/actions";
import { formatNumber } from "@/lib/utils";
import { type PortalDocumentItem } from "@/lib/types";
import { X, RotateCcw, Check, ShieldCheck, PenTool, AlertCircle, Loader2 } from "lucide-react";

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
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const docTypeLower = document.type?.toLowerCase() || "bc";
  const isDevis = docTypeLower === "devis";
  const isBl = docTypeLower === "bl" || docTypeLower === "bon-livraison" || docTypeLower === "bons-livraison";

  const modalTitle = isDevis
    ? isArabic
      ? `توقيع والمصادقة على عرض السعر رقم ${document.numero}`
      : `Approbation du Devis N° ${document.numero}`
    : isBl
      ? isArabic
        ? `توقيع استلام وصل التسليم رقم ${document.numero}`
        : `Émargement du Bon de Livraison N° ${document.numero}`
      : isArabic
        ? `توقيع والمصادقة على طلبية الشراء رقم ${document.numero}`
        : `Validation du Bon de Commande N° ${document.numero}`;

  const agreementText = isDevis
    ? isArabic
      ? "موافق للتنفيذ : أصادق على بنود وشروط عرض السعر هذا."
      : "Bon pour accord : Je confirme l'acceptation formelle de ce devis."
    : isBl
      ? isArabic
        ? "استلام مطابق : أؤكد استلام البضائع أو الخدمات المذكورة أعلاه في حالة جيدة."
        : "Reçu conforme : Je confirme la bonne réception de l'ensemble des articles livrés."
      : isArabic
        ? "موافق للتنفيذ : أؤكد طلبي وموافقتي على الشروط التجارية المحددة."
        : "Bon pour commande : Je confirme la validation et l'engagement ferme de cette commande.";

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

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!signerName.trim()) {
      setError(isArabic ? "يرجى كتابة اسم الموقع كاملاً." : "Veuillez indiquer votre nom complet.");
      return;
    }

    if (!hasDrawn) {
      setError(isArabic ? "يرجى رسم توقيعك على الشاشة قبل التأكيد." : "Veuillez apposer votre signature sur l'écran.");
      return;
    }

    if (!agreed) {
      setError(isArabic ? "يرجى تحديد خانة الموافقة للمتابعة." : "Veuillez cocher la mention d'approbation.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL("image/png");

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await signClientDocumentAction({
        documentId: document.id,
        signerName: signerName.trim(),
        signatureData,
        documentType: document.type,
      });

      if (res && res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res?.error || "Une erreur est survenue lors de la validation.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background-alt)] text-[var(--foreground)] border border-[var(--border)]">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] leading-tight">
                {modalTitle}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5 font-medium">
                <span>{document.date}</span>
                <span>•</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {formatNumber(document.total_ttc)} DH TTC
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-alt)] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5">
          {/* Signer Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              {isArabic ? "اسم الموقع وصفته" : "Nom et prénom du signataire"}
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={isArabic ? "مثال: ذ. محمد السبتي (مدير المشتريات)" : "Ex: M. Mohammed Bennani"}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background-alt)] px-3.5 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] transition-colors"
            />
          </div>

          {/* Touch Canvas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                {isArabic ? "رسم التوقيع (باللمس أو الفأرة)" : "Signature tactile manuscrite"}
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--muted)] hover:text-rose-600 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{isArabic ? "مسح وإعادة" : "Effacer"}</span>
              </button>
            </div>

            <div className="relative h-44 w-full rounded-xl border border-[var(--border-strong)] bg-white overflow-hidden shadow-2xs touch-none cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="h-full w-full block"
              />

              {!hasDrawn && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] opacity-60">
                  <span className="text-xs font-medium">
                    {isArabic ? "وقع هنا بإصبعك أو بالفأرة" : "Apposez votre signature dans ce cadre"}
                  </span>
                  <span className="text-[10px] mt-0.5">
                    {isArabic ? "أقوى حماية إلكترونية موثقة" : "Tracé certifié et horodaté"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Legal Agreement Checkbox */}
          <label className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-alt)] p-3 cursor-pointer hover:border-[var(--accent)] transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[var(--accent)] cursor-pointer"
            />
            <span className="text-xs font-medium text-[var(--foreground)] leading-snug">
              {agreementText}
            </span>
          </label>

          {/* Error Notice */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isArabic ? "قيمة قانونية ثبوتية" : "Valeur probante certifiée"}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              {isArabic ? "إلغاء" : "Annuler"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !hasDrawn || !agreed}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>
                {isSubmitting
                  ? isArabic
                    ? "جار التأكيد..."
                    : "Enregistrement..."
                  : isArabic
                    ? "تأكيد التوقيع"
                    : "Confirmer la signature"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
