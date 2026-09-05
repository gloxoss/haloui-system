"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Printer,
  Route,
} from "lucide-react";
import { PickingListRecord } from "@/lib/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  pickingList: PickingListRecord | null;
}

export function PickingViewModal({ opened, onClose, pickingList }: Props) {
  const [pickedItems, setPickedItems] = useState<Set<number>>(new Set());

  if (!pickingList) return null;

  const togglePicked = (index: number) => {
    const next = new Set(pickedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setPickedItems(next);
  };

  const allPicked = pickedItems.size === pickingList.items.length && pickingList.items.length > 0;

  const handlePrint = () => {
    window.open(`/print/picking/${pickingList.document_id}`, "_blank");
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Route size={18} />
          <Text fw={700}>Feuille de Préparation & Picking Optimisé (S-Shape)</Text>
        </Group>
      }
      size="xl"
      radius="lg"
    >
      <Stack gap="md">
        {/* Document details summary */}
        <Paper p="sm" radius="md" withBorder bg="var(--muted-surface)">
          <Group justify="space-between" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Document Cible
              </Text>
              <Text fw={800} size="lg" c="indigo">
                {pickingList.document_numero}
              </Text>
              <Text size="xs" c="dimmed">
                Destinataire : <strong>{pickingList.client_ou_destinataire}</strong>
              </Text>
            </div>

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Dépôt Source
              </Text>
              <Text fw={700} size="sm">
                {pickingList.depot_source_nom}
              </Text>
              <Text size="xs" c="dimmed">
                Date : {pickingList.date_document}
              </Text>
            </div>

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Articles à Prélever
              </Text>
              <Text fw={800} size="lg" c="teal">
                {pickingList.total_articles} <Text span size="xs" fw={500} c="dimmed">unités ({pickingList.total_lignes} lignes)</Text>
              </Text>
              <Text size="xs" c="dimmed">
                Progression : {pickedItems.size} / {pickingList.items.length} prélevés
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Route explanation banner */}
        <Paper p="xs" radius="md" withBorder style={{ borderColor: "var(--color-teal-6, #0ca678)" }}>
          <Group gap="xs">
            <ThemeIcon size="sm" color="teal" variant="light">
              <Route size={14} />
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              <strong>Circuit Serpentin (S-Shape) :</strong> Les articles sont ordonnés pour traverser les allées impaires de l&apos;avant vers le fond, et les allées paires du fond vers l&apos;avant, éliminant les allers-retours inutiles.
            </Text>
          </Group>
        </Paper>

        {/* Items Table */}
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead style={{ background: "var(--muted-surface)" }}>
            <Table.Tr>
              <Table.Th style={{ width: 50, textAlign: "center" }}>Ordre</Table.Th>
              <Table.Th>Emplacement WMS</Table.Th>
              <Table.Th>Article & Référence</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Qté Demandée</Table.Th>
              <Table.Th style={{ width: 80, textAlign: "center" }}>Prélevé</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pickingList.items.map((item, idx) => {
              const isPicked = pickedItems.has(idx);
              const isUnassigned = item.emplacement_code === "NON-ASSIGNE";

              return (
                <Table.Tr
                  key={idx}
                  style={{
                    opacity: isPicked ? 0.6 : 1,
                    textDecoration: isPicked ? "line-through" : undefined,
                    background: isPicked ? "var(--muted-accent)" : undefined,
                  }}
                >
                  <Table.Td style={{ textAlign: "center" }}>
                    <Badge size="sm" variant="filled" color={isUnassigned ? "gray" : "indigo"}>
                      #{item.ordre_picking}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Group gap="xs">
                      <MapPin size={14} color={isUnassigned ? "gray" : "teal"} />
                      <Text fw={700} size="sm" c={isUnassigned ? "dimmed" : "teal"}>
                        {item.emplacement_code}
                      </Text>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={600} size="sm">
                        {item.produit_designation}
                      </Text>
                      <Group gap="xs">
                        <Badge size="xs" variant="outline" color="gray">
                          {item.produit_ref}
                        </Badge>
                        {item.code_barre && (
                          <Text size="xs" c="dimmed">
                            EAN: {item.code_barre}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </Table.Td>

                  <Table.Td style={{ textAlign: "center" }}>
                    <Text fw={800} size="sm" c="indigo">
                      {item.quantite_demandee} {item.unite}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: "center" }}>
                    <Checkbox
                      checked={isPicked}
                      onChange={() => togglePicked(idx)}
                    />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

        <Group justify="space-between" mt="md">
          <Button variant="default" onClick={onClose}>
            Fermer
          </Button>
          <Group gap="xs">
            <Button
              color="indigo"
              variant="outline"
              leftSection={<Printer size={16} />}
              onClick={handlePrint}
            >
              Imprimer la Picking List
            </Button>
            <Button
              color="teal"
              leftSection={<ClipboardCheck size={16} />}
              disabled={!allPicked}
              onClick={onClose}
            >
              Préparation Terminée ({pickedItems.size}/{pickingList.items.length})
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
