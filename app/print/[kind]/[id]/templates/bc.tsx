import ClassicDocumentTemplate from "@/app/print/[kind]/[id]/templates/classic-document";
import {
  extractDateFromNotes,
  formatPrintDate,
  type PrintDocumentContext,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function BonCommandeTemplate(props: PrintDocumentContext) {
  const dueDate = extractDateFromNotes(props.document.notes);

  return (
    <ClassicDocumentTemplate
      {...props}
      title="Bon de commande"
      partyTitle="Fournisseur"
      signatureLeft="Signature fournisseur"
      footerNote={dueDate ? `À livrer avant le ${formatPrintDate(dueDate)}.` : undefined}
    />
  );
}
