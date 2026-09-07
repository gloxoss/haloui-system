"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@/lib/notifications";
import {
  Check,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Smartphone,
  X,
} from "lucide-react";

import {
  envoyerNotificationMessageAction,
  updateMessagerieConfigAction,
} from "@/app/actions";
import {
  type EntityRecord,
  type MessagerieCanal,
  type MessagerieConfigRecord,
  type MessagerieLogRecord,
  type MessagerieNotificationType,
} from "@/lib/types";
import { formatDateLong } from "@/lib/utils";

type Props = {
  config: MessagerieConfigRecord;
  logs: MessagerieLogRecord[];
  clients: EntityRecord[];
};

export function MessagerieHub({ config: initialConfig, logs: initialLogs, clients }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [logs, setLogs] = useState(initialLogs);
  const [activeTab, setActiveTab] = useState<string | null>("logs");
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [canalFilter, setCanalFilter] = useState<string | null>("all");

  // Send Message Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [destNom, setDestNom] = useState("");
  const [destTel, setDestTel] = useState("");
  const [canal, setCanal] = useState<MessagerieCanal>("whatsapp");
  const [typeNotif, setTypeNotif] = useState<MessagerieNotificationType>("libre");
  const [messageText, setMessageText] = useState("");

  // Templates Editor
  const [templates, setTemplates] = useState(config.templates_json || {});
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>("commande");

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchCanal = canalFilter === "all" || !canalFilter || l.canal === canalFilter;
      const matchSearch =
        !search ||
        l.destinataire_nom.toLowerCase().includes(search.toLowerCase()) ||
        l.destinataire_telephone.includes(search) ||
        l.message.toLowerCase().includes(search.toLowerCase()) ||
        (l.document_numero && l.document_numero.toLowerCase().includes(search.toLowerCase()));
      return matchCanal && matchSearch;
    });
  }, [logs, search, canalFilter]);

  const handleClientSelect = (clientIdStr: string | null) => {
    setSelectedClient(clientIdStr);
    if (!clientIdStr) return;
    const client = clients.find((c) => String(c.id) === clientIdStr);
    if (client) {
      setDestNom(client.name);
      setDestTel(client.phone || "");
    }
  };

  const handleSend = () => {
    if (!destTel.trim() || !messageText.trim()) {
      notifications.show({
        color: "red",
        title: "Champs requis",
        message: "Veuillez saisir un numéro de téléphone et un message.",
      });
      return;
    }

    startTransition(async () => {
      const res = await envoyerNotificationMessageAction({
        canal,
        typeNotification: typeNotif,
        destinataireNom: destNom || "Client",
        destinataireTelephone: destTel,
        message: messageText,
      });

      if (res.success) {
        notifications.show({
          color: "teal",
          title: "Message envoyé",
          message: canal === "whatsapp" ? "Notification WhatsApp transmise avec succès." : "SMS envoyé.",
        });

        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, "_blank");
        }

        setModalOpen(false);
        setMessageText("");
      } else {
        notifications.show({
          color: "red",
          title: "Erreur d'envoi",
          message: res.error || "Impossible d'envoyer le message.",
        });
      }
    });
  };

  const handleSaveConfig = () => {
    startTransition(async () => {
      const res = await updateMessagerieConfigAction({
        ...config,
        templates_json: templates,
      });

      if (res.success && res.config) {
        setConfig(res.config);
        notifications.show({
          color: "teal",
          title: "Configuration enregistrée",
          message: "Les paramètres de messagerie ont été mis à jour.",
        });
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Impossible d'enregistrer la configuration.",
        });
      }
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Title order={2} className="tracking-tight">
            Messagerie Intégrée & WhatsApp Business
          </Title>
          <Text c="dimmed" size="sm">
            Notifications automatisées de commandes, confirmations de livraison et envoi de factures
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<Send size={16} />}
            color="teal"
            onClick={() => setModalOpen(true)}
          >
            Nouveau message
          </Button>
        </Group>
      </Group>

      {/* KPI Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card padding="md" radius="md" withBorder className="bg-emerald-500/5 border-emerald-500/20">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                WhatsApp Business
              </Text>
              <Badge color={config.whatsapp_actif ? "teal" : "gray"}>
                {config.whatsapp_actif ? "Connecté" : "Désactivé"}
              </Badge>
            </Group>
            <Title order={3} mt="xs">
              {logs.filter((l) => l.canal === "whatsapp").length} envois
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              Direct Cloud API & liens wa.me
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card padding="md" radius="md" withBorder className="bg-blue-500/5 border-blue-500/20">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Passerelle SMS
              </Text>
              <Badge color={config.sms_actif ? "blue" : "gray"}>
                {config.sms_actif ? "Actif" : "Inactif"}
              </Badge>
            </Group>
            <Title order={3} mt="xs">
              {logs.filter((l) => l.canal === "sms").length} SMS
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              Expéditeur : {config.sms_sender_id || "HALOUI"}
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card padding="md" radius="md" withBorder className="bg-violet-500/5 border-violet-500/20">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Taux de Délivrabilité
            </Text>
            <Title order={3} mt="xs">
              {logs.length > 0
                ? `${Math.round((logs.filter((l) => l.statut !== "echec").length / logs.length) * 100)} %`
                : "100 %"}
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              {logs.filter((l) => l.statut === "echec").length} échecs constatés
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card padding="md" radius="md" withBorder className="bg-amber-500/5 border-amber-500/20">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Automatisations
            </Text>
            <Title order={3} mt="xs">
              {[config.auto_notify_commande, config.auto_notify_livraison, config.auto_notify_facture].filter(Boolean).length} / 3
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              Commandes, BL et Factures
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Card withBorder radius="md" padding="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="logs" leftSection={<MessageSquare size={16} />}>
              Historique des Envois ({logs.length})
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<Smartphone size={16} />}>
              Modèles de Messages
            </Tabs.Tab>
            <Tabs.Tab value="config" leftSection={<Settings size={16} />}>
              Passerelle & Configuration API
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: LOGS */}
          <Tabs.Panel value="logs">
            <Stack gap="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Rechercher par destinataire, téléphone, document..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 320 }}
                />
                <Select
                  value={canalFilter}
                  onChange={setCanalFilter}
                  data={[
                    { value: "all", label: "Tous les canaux" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "sms", label: "SMS" },
                  ]}
                  style={{ width: 180 }}
                />
              </Group>

              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Canal</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Destinataire</Table.Th>
                    <Table.Th>Téléphone</Table.Th>
                    <Table.Th>Document</Table.Th>
                    <Table.Th>Message</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredLogs.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9} className="text-center py-6 text-neutral-400">
                        Aucun message envoyé pour le moment.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredLogs.map((l) => (
                      <Table.Tr key={l.id}>
                        <Table.Td>
                          <Badge color={l.canal === "whatsapp" ? "teal" : "blue"} variant="light">
                            {l.canal === "whatsapp" ? "WhatsApp" : "SMS"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="outline" size="sm">
                            {l.type_notification}
                          </Badge>
                        </Table.Td>
                        <Table.Td className="font-semibold">{l.destinataire_nom}</Table.Td>
                        <Table.Td className="font-mono text-xs">{l.destinataire_telephone}</Table.Td>
                        <Table.Td>
                          {l.document_numero ? (
                            <Badge variant="dot" color="indigo">
                              {l.document_numero}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 280 }}>
                          <Text size="xs" lineClamp={2} title={l.message}>
                            {l.message}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              l.statut === "envoye" || l.statut === "delivre"
                                ? "teal"
                                : l.statut === "echec"
                                ? "red"
                                : "yellow"
                            }
                            size="sm"
                          >
                            {l.statut}
                          </Badge>
                        </Table.Td>
                        <Table.Td className="text-xs text-neutral-500 whitespace-nowrap">
                          {formatDateLong(l.created_at)}
                        </Table.Td>
                        <Table.Td>
                          {l.canal === "whatsapp" && (
                            <ActionIcon
                              variant="subtle"
                              color="teal"
                              title="Ouvrir WhatsApp Web"
                              onClick={() => {
                                const url = `https://wa.me/${l.destinataire_telephone}?text=${encodeURIComponent(l.message)}`;
                                window.open(url, "_blank");
                              }}
                            >
                              <ExternalLink size={14} />
                            </ActionIcon>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: TEMPLATES */}
          <Tabs.Panel value="templates">
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Modèles Automatiques
                  </Text>
                  {[
                    { key: "commande", label: "Confirmation de Commande (BC)" },
                    { key: "livraison", label: "Avis d'Expédition / Livraison (BL)" },
                    { key: "facture", label: "Facture Client & Lien de Paiement" },
                    { key: "devis", label: "Devis Personnalisé" },
                  ].map((t) => (
                    <Button
                      key={t.key}
                      variant={activeTemplateKey === t.key ? "filled" : "light"}
                      color="indigo"
                      justify="flex-start"
                      onClick={() => setActiveTemplateKey(t.key)}
                    >
                      {t.label}
                    </Button>
                  ))}
                  <Card withBorder radius="md" p="xs" mt="md" className="bg-neutral-50 dark:bg-neutral-900">
                    <Text size="xs" fw={700} c="dimmed">
                      Variables disponibles :
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      • <code>{"{client_nom}"}</code> : Nom complet du client<br />
                      • <code>{"{numero_document}"}</code> : N° Facture, BL ou Devis<br />
                      • <code>{"{total_ttc}"}</code> : Montant total TTC en DH<br />
                      • <code>{"{reste}"}</code> : Solde restant dû<br />
                      • <code>{"{lien_document}"}</code> : Lien direct de consultation<br />
                      • <code>{"{company_name}"}</code> : Nom de votre établissement
                    </Text>
                  </Card>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 8 }}>
                <Card withBorder radius="md" p="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600}>
                        Édition du message : {activeTemplateKey.toUpperCase()}
                      </Text>
                    </Group>

                    <Textarea
                      rows={6}
                      value={templates[activeTemplateKey] || ""}
                      onChange={(e) =>
                        setTemplates({
                          ...templates,
                          [activeTemplateKey]: e.target.value,
                        })
                      }
                      placeholder="Saisissez le texte du modèle..."
                    />

                    <Card withBorder radius="md" p="md" className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30">
                      <Text size="xs" fw={700} c="teal" tt="uppercase">
                        Aperçu simulé sur WhatsApp :
                      </Text>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }} mt="xs">
                        {(templates[activeTemplateKey] || "")
                          .replace(/{client_nom}/g, "Société Skoura Voyage")
                          .replace(/{numero_document}/g, "FAC-2026-0042")
                          .replace(/{total_ttc}/g, "14 500.00")
                          .replace(/{reste}/g, "4 500.00")
                          .replace(/{lien_document}/g, "https://haloui.ma/portal/p/token")
                          .replace(/{company_name}/g, "Pâtisserie & Station Haloui")}
                      </Text>
                    </Card>

                    <Group justify="flex-end">
                      <Button loading={isPending} onClick={handleSaveConfig} color="indigo">
                        Enregistrer les modèles
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          {/* TAB 3: CONFIG */}
          <Tabs.Panel value="config">
            <Stack gap="lg" style={{ maxWidth: 680 }}>
              <Card withBorder radius="md" p="md">
                <Title order={4} mb="md">
                  Configuration WhatsApp Business
                </Title>
                <Stack gap="md">
                  <Switch
                    label="Activer l'envoi WhatsApp Business"
                    checked={config.whatsapp_actif}
                    onChange={(e) => setConfig({ ...config, whatsapp_actif: e.currentTarget.checked })}
                  />
                  <TextInput
                    label="Phone Number ID (Meta Graph API)"
                    placeholder="ex: 104829104928192"
                    value={config.whatsapp_phone_number_id || ""}
                    onChange={(e) => setConfig({ ...config, whatsapp_phone_number_id: e.target.value })}
                  />
                  <TextInput
                    label="System User Access Token (Permanent)"
                    type="password"
                    placeholder="EAAG..."
                    value={config.whatsapp_access_token || ""}
                    onChange={(e) => setConfig({ ...config, whatsapp_access_token: e.target.value })}
                  />
                  <TextInput
                    label="WhatsApp Business Account ID (WABA ID)"
                    placeholder="ex: 9840281940284"
                    value={config.whatsapp_business_account_id || ""}
                    onChange={(e) => setConfig({ ...config, whatsapp_business_account_id: e.target.value })}
                  />
                  <Text size="xs" c="dimmed">
                    Note : Si les identifiants API ne sont pas configurés, le système ouvre automatiquement un lien <code>wa.me</code> optimisé avec le texte pré-rempli pour envoi en 1 clic.
                  </Text>
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md">
                <Title order={4} mb="md">
                  Passerelle SMS
                </Title>
                <Stack gap="md">
                  <Switch
                    label="Activer l'envoi direct de SMS"
                    checked={config.sms_actif}
                    onChange={(e) => setConfig({ ...config, sms_actif: e.currentTarget.checked })}
                  />
                  <TextInput
                    label="Nom d'expéditeur (Sender ID)"
                    placeholder="ex: HALOUI"
                    value={config.sms_sender_id || ""}
                    onChange={(e) => setConfig({ ...config, sms_sender_id: e.target.value })}
                  />
                  <TextInput
                    label="Clé d'API SMS (Twilio / SMS Gateway Maroc)"
                    type="password"
                    placeholder="api_key_live_..."
                    value={config.sms_api_key || ""}
                    onChange={(e) => setConfig({ ...config, sms_api_key: e.target.value })}
                  />
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md">
                <Title order={4} mb="md">
                  Déclencheurs Automatiques
                </Title>
                <Stack gap="sm">
                  <Switch
                    label="Notifier automatiquement lors de la validation d'une commande (BC)"
                    checked={config.auto_notify_commande}
                    onChange={(e) => setConfig({ ...config, auto_notify_commande: e.currentTarget.checked })}
                  />
                  <Switch
                    label="Notifier automatiquement lors de l'expédition d'un bon de livraison (BL)"
                    checked={config.auto_notify_livraison}
                    onChange={(e) => setConfig({ ...config, auto_notify_livraison: e.currentTarget.checked })}
                  />
                  <Switch
                    label="Notifier automatiquement avec lien de consultation lors de l'émission d'une facture"
                    checked={config.auto_notify_facture}
                    onChange={(e) => setConfig({ ...config, auto_notify_facture: e.currentTarget.checked })}
                  />
                </Stack>
              </Card>

              <Group justify="flex-end">
                <Button loading={isPending} onClick={handleSaveConfig} color="teal">
                  Sauvegarder les paramètres
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Modal Envoi Message Direct */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Envoyer une notification client</Text>}
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Choisir un client enregistré"
            placeholder="Sélectionner un client..."
            searchable
            clearable
            value={selectedClient}
            onChange={handleClientSelect}
            data={clients.map((c) => ({
              value: String(c.id),
              label: `${c.name} (${c.phone || "Pas de tél"})`,
            }))}
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Nom du destinataire"
                required
                value={destNom}
                onChange={(e) => setDestNom(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="N° Téléphone / WhatsApp"
                placeholder="06XXXXXXXX ou +212..."
                required
                value={destTel}
                onChange={(e) => setDestTel(e.target.value)}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Canal d'envoi"
                value={canal}
                onChange={(v) => setCanal((v as MessagerieCanal) || "whatsapp")}
                data={[
                  { value: "whatsapp", label: "WhatsApp Business" },
                  { value: "sms", label: "SMS Direct" },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Type de notification"
                value={typeNotif}
                onChange={(v) => setTypeNotif((v as MessagerieNotificationType) || "libre")}
                data={[
                  { value: "libre", label: "Message Libre" },
                  { value: "commande", label: "Confirmation Commande" },
                  { value: "livraison", label: "Confirmation Livraison" },
                  { value: "facture", label: "Facture & Lien" },
                  { value: "devis", label: "Devis" },
                  { value: "rappel", label: "Rappel d'échéance" },
                ]}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Message à envoyer"
            required
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Écrivez votre message ici..."
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              color={canal === "whatsapp" ? "teal" : "blue"}
              leftSection={<Send size={16} />}
              loading={isPending}
              onClick={handleSend}
            >
              {canal === "whatsapp" ? "Envoyer par WhatsApp" : "Envoyer par SMS"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
