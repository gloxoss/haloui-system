"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@/lib/notifications";
import { MessageSquare, Send } from "lucide-react";

import { envoyerNotificationMessageAction } from "@/app/actions";
import { type MessagerieCanal, type MessagerieNotificationType } from "@/lib/types";

type Props = {
  documentId?: number;
  documentNumero: string;
  documentType: "devis" | "facture" | "livraison" | "commande";
  clientNom: string;
  clientTelephone?: string;
  totalTtc: number;
  resteAPayer?: number;
  portalUrl?: string;
  size?: "xs" | "sm" | "md";
  variant?: "filled" | "light" | "outline" | "subtle";
};

export function SendWhatsAppButton({
  documentId,
  documentNumero,
  documentType,
  clientNom,
  clientTelephone = "",
  totalTtc,
  resteAPayer = 0,
  portalUrl = "",
  size = "sm",
  variant = "light",
}: Props) {
  const [opened, setOpened] = useState(false);
  const [canal, setCanal] = useState<MessagerieCanal>("whatsapp");
  const [phone, setPhone] = useState(clientTelephone);
  const [nom, setNom] = useState(clientNom);
  const [isPending, startTransition] = useTransition();

  const getDefaultMessage = () => {
    const docLabel =
      documentType === "facture"
        ? "facture"
        : documentType === "livraison"
        ? "bon de livraison"
        : documentType === "devis"
        ? "devis"
        : "commande";

    let text = `Bonjour ${clientNom},\nVotre ${docLabel} #${documentNumero} d'un montant de ${totalTtc.toLocaleString("fr-FR")} DH est disponible.`;
    if (documentType === "facture" && resteAPayer > 0) {
      text += `\nReste à régler : ${resteAPayer.toLocaleString("fr-FR")} DH.`;
    }
    if (portalUrl) {
      text += `\nConsultez le document en ligne : ${portalUrl}`;
    }
    text += `\nMerci pour votre confiance !\n- Pâtisserie & Station Haloui`;
    return text;
  };

  const [message, setMessage] = useState(getDefaultMessage());

  const handleSend = () => {
    if (!phone.trim()) {
      notifications.show({
        color: "red",
        title: "Numéro requis",
        message: "Veuillez renseigner le numéro de téléphone / WhatsApp du client.",
      });
      return;
    }

    startTransition(async () => {
      const res = await envoyerNotificationMessageAction({
        canal,
        typeNotification: (documentType as MessagerieNotificationType) || "facture",
        documentId: documentId || null,
        documentNumero,
        destinataireNom: nom,
        destinataireTelephone: phone,
        message,
      });

      if (res.success) {
        notifications.show({
          color: "teal",
          title: "Message envoyé",
          message: canal === "whatsapp" ? "Ouverture de WhatsApp..." : "SMS envoyé avec succès.",
        });

        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, "_blank");
        }

        setOpened(false);
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Impossible d'envoyer le message.",
        });
      }
    });
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        color="teal"
        leftSection={<MessageSquare size={14} />}
        onClick={() => {
          setMessage(getDefaultMessage());
          setOpened(true);
        }}
      >
        WhatsApp
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={700}>Envoyer le document par WhatsApp / SMS</Text>}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nom du destinataire"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

          <TextInput
            label="Numéro de téléphone / WhatsApp"
            required
            placeholder="06XXXXXXXX ou +212..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Select
            label="Canal d'envoi"
            value={canal}
            onChange={(v) => setCanal((v as MessagerieCanal) || "whatsapp")}
            data={[
              { value: "whatsapp", label: "WhatsApp Business" },
              { value: "sms", label: "SMS Direct" },
            ]}
          />

          <Textarea
            label="Texte du message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpened(false)}>
              Annuler
            </Button>
            <Button
              color={canal === "whatsapp" ? "teal" : "blue"}
              leftSection={<Send size={14} />}
              loading={isPending}
              onClick={handleSend}
            >
              {canal === "whatsapp" ? "Envoyer via WhatsApp" : "Envoyer via SMS"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
