import ClassicDocumentTemplate from "@/app/print/[kind]/[id]/templates/classic-document";
import { type PrintDocumentContext } from "@/app/print/[kind]/[id]/templates/shared";

export default function DevisTemplate(props: PrintDocumentContext) {
  return <ClassicDocumentTemplate {...props} title="Devis" partyTitle="Client" />;
}
