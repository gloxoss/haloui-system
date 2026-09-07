"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@/lib/notifications";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Delete,
  Fingerprint,
  LogIn,
  LogOut,
  QrCode,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { pointerHeureAction } from "@/app/actions";
import { type EmployeeRecord, type PointageRecord, type PointageStatsJournalieres } from "@/lib/types";

type Props = {
  employes: EmployeeRecord[];
  pointagesJour: PointageRecord[];
  stats: PointageStatsJournalieres;
};

export function PointeuseKiosk({
  employes,
  pointagesJour: initialPointages,
  stats: initialStats,
}: Props) {
  const [pointages, setPointages] = useState(initialPointages);
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState<string | null>("pin");
  const [pinCode, setPinCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [selectedEmploye, setSelectedEmploye] = useState<EmployeeRecord | null>(null);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Horloge en direct
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(
        now.toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setPinCode("");
    } else if (val === "DEL") {
      setPinCode((prev) => prev.slice(0, -1));
    } else if (pinCode.length < 6) {
      setPinCode((prev) => prev + val);
    }
  };

  const handlePointer = (params: {
    employeId?: number;
    pin?: string;
    qrToken?: string;
    typePointage?: "auto" | "arrivee" | "depart";
    methode?: "tactile" | "pin" | "qr_code";
  }) => {
    startTransition(async () => {
      const res = await pointerHeureAction({
        employeId: params.employeId,
        pin: params.pin,
        qrToken: params.qrToken,
        typePointage: params.typePointage || "auto",
        methode: params.methode || "tactile",
      });

      if (res.success && res.pointage) {
        notifications.show({
          color: res.action === "arrivee" ? "teal" : "blue",
          title: res.action === "arrivee" ? "Arrivée Enregistrée !" : "Départ Enregistré !",
          message: res.message,
          icon: res.action === "arrivee" ? <LogIn size={18} /> : <LogOut size={18} />,
          autoClose: 4000,
        });

        // Mettre à jour la liste locale
        setPointages((prev) => {
          const filtered = prev.filter((p) => p.id !== res.pointage.id);
          return [res.pointage, ...filtered];
        });

        // Réinitialiser
        setPinCode("");
        setQrToken("");
        setConfirmModalOpened(false);
        setSelectedEmploye(null);
      } else {
        notifications.show({
          color: "red",
          title: "Pointage non validé",
          message: res.error || "Identifiant introuvable ou erreur de pointage.",
        });
      }
    });
  };

  const getEmployeStatus = (empId: number) => {
    const ptg = pointages.find((p) => p.employe_id === empId);
    if (!ptg) return { statut: "absent", label: "Non pointé", color: "gray" };
    if (ptg.statut === "en_cours") return { statut: "present", label: "Présent", color: "teal", heure: ptg.heure_arrivee };
    return { statut: "parti", label: "Parti", color: "blue", heure: ptg.heure_depart };
  };

  return (
    <Stack gap="lg">
      {/* Header Borne */}
      <Card withBorder radius="lg" p="lg" className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white shadow-lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs">
              <Clock className="text-teal-400 animate-pulse" size={24} />
              <Title order={3} className="text-white">
                Pointeuse Virtuelle & Présence
              </Title>
            </Group>
            <Text c="dimmed" size="xs" mt={2}>
              Horloge certifiée d'entreprise • Pâtisserie & Station Haloui
            </Text>
          </div>

          <div className="text-right">
            <Text className="font-mono text-3xl font-black text-teal-300 tracking-wider">
              {currentTime || "--:--:--"}
            </Text>
            <Text size="xs" className="capitalize text-neutral-300">
              {currentDate || "Chargement..."}
            </Text>
          </div>
        </Group>
      </Card>

      {/* KPI Stats Journée */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Actuellement Présents
            </Text>
            <UserCheck size={18} className="text-teal-500" />
          </Group>
          <Title order={2} mt="xs" c="teal">
            {pointages.filter((p) => p.statut === "en_cours").length}
          </Title>
          <Text size="xs" c="dimmed">
            sur {employes.length} collaborateurs
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Journées Clôturées
            </Text>
            <LogOut size={18} className="text-blue-500" />
          </Group>
          <Title order={2} mt="xs" c="blue">
            {pointages.filter((p) => p.statut === "valide").length}
          </Title>
          <Text size="xs" c="dimmed">
            Pointages complets
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Total Heures Aujourd'hui
            </Text>
            <Clock size={18} className="text-indigo-500" />
          </Group>
          <Title order={2} mt="xs">
            {Math.round(pointages.reduce((acc, p) => acc + (p.total_heures || 0), 0) * 10) / 10} h
          </Title>
          <Text size="xs" c="dimmed">
            Cumul de présence
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Heures Supplémentaires
            </Text>
            <Badge color="orange">Majorées 125%</Badge>
          </Group>
          <Title order={2} mt="xs" c="orange">
            {Math.round(pointages.reduce((acc, p) => acc + (p.heures_sup || 0), 0) * 10) / 10} h
          </Title>
          <Text size="xs" c="dimmed">
            Au-delà de 8h/jour
          </Text>
        </Card>
      </SimpleGrid>

      {/* Interface Principale de Pointage */}
      <Grid>
        {/* Colonne Gauche : Borne de Saisie */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="lg" p="md">
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List mb="md" grow>
                <Tabs.Tab value="pin" leftSection={<Fingerprint size={16} />}>
                  Clavier PIN
                </Tabs.Tab>
                <Tabs.Tab value="tactile" leftSection={<Users size={16} />}>
                  Sélection Salarié
                </Tabs.Tab>
                <Tabs.Tab value="qr" leftSection={<QrCode size={16} />}>
                  Scan Badge / QR Code
                </Tabs.Tab>
              </Tabs.List>

              {/* TAB 1: CLAVIER PIN */}
              <Tabs.Panel value="pin">
                <Stack align="center" gap="md" py="xs">
                  <Text size="sm" c="dimmed">
                    Entrez votre code PIN personnel à 4 chiffres :
                  </Text>

                  {/* Affichage des points PIN */}
                  <Group gap="sm" my="xs">
                    {[0, 1, 2, 3].map((i) => (
                      <Paper
                        key={i}
                        withBorder
                        radius="md"
                        w={50}
                        h={55}
                        className="flex items-center justify-center font-mono text-2xl font-bold bg-neutral-50 dark:bg-neutral-900"
                      >
                        {pinCode[i] ? "●" : ""}
                      </Paper>
                    ))}
                  </Group>

                  {/* Pavé Numérique 3x4 */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"].map((key) => (
                      <Button
                        key={key}
                        size="lg"
                        radius="md"
                        variant={key === "C" || key === "DEL" ? "light" : "default"}
                        color={key === "C" ? "red" : key === "DEL" ? "orange" : "gray"}
                        className="h-14 text-xl font-bold"
                        onClick={() => handleKeypadPress(key)}
                      >
                        {key === "DEL" ? <Delete size={20} /> : key}
                      </Button>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    radius="md"
                    color="teal"
                    fullWidth
                    style={{ maxWidth: 280 }}
                    loading={isPending}
                    disabled={pinCode.length < 4}
                    leftSection={<CheckCircle2 size={18} />}
                    onClick={() => handlePointer({ pin: pinCode, methode: "pin" })}
                  >
                    Valider le Pointage
                  </Button>
                </Stack>
              </Tabs.Panel>

              {/* TAB 2: SÉLECTION TACTILE */}
              <Tabs.Panel value="tactile">
                <Stack gap="sm">
                  <Text size="xs" c="dimmed">
                    Touchez votre profil pour pointer votre entrée ou votre départ :
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {employes.map((emp) => {
                      const status = getEmployeStatus(emp.id);
                      return (
                        <Card
                          key={emp.id}
                          withBorder
                          radius="md"
                          p="sm"
                          className="cursor-pointer hover:border-teal-500 hover:shadow-md transition-all"
                          onClick={() => {
                            setSelectedEmploye(emp);
                            setConfirmModalOpened(true);
                          }}
                        >
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Avatar color="teal" radius="xl">
                                {emp.prenom[0]}
                                {emp.nom[0]}
                              </Avatar>
                              <div>
                                <Text fw={600} size="sm">
                                  {emp.prenom} {emp.nom}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {emp.numero ? `Matricule : ${emp.numero}` : "Salarié"}
                                </Text>
                              </div>
                            </Group>
                            <Badge color={status.color} size="sm">
                              {status.label}
                            </Badge>
                          </Group>
                        </Card>
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>

              {/* TAB 3: SCAN QR CODE */}
              <Tabs.Panel value="qr">
                <Stack align="center" gap="md" py="md">
                  <div className="w-24 h-24 rounded-2xl bg-teal-500/10 border-2 border-dashed border-teal-500/40 flex items-center justify-center">
                    <QrCode size={48} className="text-teal-500" />
                  </div>
                  <Text size="sm" ta="center">
                    Présentez votre badge QR Code devant le lecteur ou la caméra
                  </Text>
                  <TextInput
                    placeholder="Numéro de badge ou scan douchette..."
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    style={{ width: 280 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && qrToken.trim()) {
                        handlePointer({ qrToken, methode: "qr_code" });
                      }
                    }}
                  />
                  <Button
                    color="teal"
                    disabled={!qrToken.trim()}
                    loading={isPending}
                    onClick={() => handlePointer({ qrToken, methode: "qr_code" })}
                  >
                    Valider le Badge
                  </Button>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Grid.Col>

        {/* Colonne Droite : Journal du Jour */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" mb="md">
              <Text fw={700} size="sm">
                Pointages du Jour ({pointages.length})
              </Text>
              <Badge variant="dot" color="teal">
                En direct
              </Badge>
            </Group>

            <Stack gap="xs" style={{ maxHeight: 420, overflowY: "auto" }}>
              {pointages.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="xl">
                  Aucun pointage enregistré aujourd'hui.
                </Text>
              ) : (
                pointages.map((p) => (
                  <Paper key={p.id} withBorder radius="md" p="xs" className="text-xs">
                    <Group justify="space-between" align="center">
                      <div>
                        <Text fw={600}>
                          {p.employe_prenom} {p.employe_nom}
                        </Text>
                        <Group gap="xs" mt={2}>
                          <Text size="xs" c="teal" className="font-mono">
                            ↓ {p.heure_arrivee}
                          </Text>
                          {p.heure_depart && (
                            <Text size="xs" c="blue" className="font-mono">
                              ↑ {p.heure_depart}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed">
                            • {p.methode_pointage}
                          </Text>
                        </Group>
                      </div>

                      <div className="text-right">
                        {p.statut === "en_cours" ? (
                          <Badge color="teal" size="sm">
                            En cours
                          </Badge>
                        ) : (
                          <Group gap={4}>
                            <Badge color="blue" size="sm">
                              {p.total_heures} h
                            </Badge>
                            {p.heures_sup > 0 && (
                              <Badge color="orange" size="sm">
                                +{p.heures_sup}h sup
                              </Badge>
                            )}
                          </Group>
                        )}
                      </div>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Modale de Confirmation Tactile */}
      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title={<Text fw={700}>Confirmer le Pointage</Text>}
        centered
      >
        {selectedEmploye && (
          <Stack gap="md">
            <Group>
              <Avatar size="lg" color="teal" radius="xl">
                {selectedEmploye.prenom[0]}
                {selectedEmploye.nom[0]}
              </Avatar>
              <div>
                <Text fw={700} size="lg">
                  {selectedEmploye.prenom} {selectedEmploye.nom}
                </Text>
                <Text size="xs" c="dimmed">
                  Matricule : {selectedEmploye.numero || "N/A"}
                </Text>
              </div>
            </Group>

            <Text size="sm">
              Choisissez l'action à enregistrer à <strong>{currentTime}</strong> :
            </Text>

            <Group grow>
              <Button
                size="md"
                color="teal"
                leftSection={<LogIn size={18} />}
                loading={isPending}
                onClick={() =>
                  handlePointer({
                    employeId: selectedEmploye.id,
                    typePointage: "arrivee",
                    methode: "tactile",
                  })
                }
              >
                Pointer Arrivée
              </Button>

              <Button
                size="md"
                color="blue"
                leftSection={<LogOut size={18} />}
                loading={isPending}
                onClick={() =>
                  handlePointer({
                    employeId: selectedEmploye.id,
                    typePointage: "depart",
                    methode: "tactile",
                  })
                }
              >
                Pointer Départ
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
