import ClassicDocumentTemplate from "@/app/print/[kind]/[id]/templates/classic-document";
import { type PrintDocumentContext } from "@/app/print/[kind]/[id]/templates/shared";

export default function FactureTemplate(props: PrintDocumentContext) {
  return (
    <ClassicDocumentTemplate
      {...props}
      title="Facture"
      partyTitle="Client"
      footerNote={`TVA acquittée selon le régime applicable. ICE: ${props.company.ice}.`}
    />
  );
}
