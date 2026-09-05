"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  Banknote,
  Barcode,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Delete,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { enregistrerTicketCaisseAction } from "@/app/actions";
import {
  type CaisseModeReglement,
  type CaisseSessionRecord,
  type CaisseTicketRecord,
  type RapportZData,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { MouvementCaisseModal } from "./mouvement-caisse-modal";
import { SessionClotureModal } from "./session-cloture-modal";
import { SessionOuvertureModal } from "./session-ouverture-modal";

export interface PosProductItem {
  id: number;
  ref: string;
  designation: string;
  code_barre: string;
  prix_ht: number;
  prix_ttc: number;
  tva_rate: number;
  unite: string;
  categorie: string;
  stock_actuel: number;
  nature_produit?: string;
}

interface CartItem {
  produitId?: number;
  ref: string;
  designation: string;
  prixUnitaireHt: number;
  prixUnitaireTtc: number;
  quantite: number;
  tvaRate: number;
  remisePourcent: number;
}

interface HeldTicket {
  id: string;
  label: string;
  clientId: number | null;
  clientNom: string;
  items: CartItem[];
  remiseGlobale: number;
}

interface PosTerminalProps {
  initialSession: CaisseSessionRecord | null;
  branches: Array<{ id: number; name: string }>;
  products: PosProductItem[];
  clients: Array<{ id: number; name: string }>;
  companyName: string;
  currentUserId: number;
  currentUserName: string;
}

export function PosTerminal({
  initialSession,
  branches,
  products,
  clients,
  companyName,
  currentUserId,
  currentUserName,
}: PosTerminalProps) {
  // --- SESSION DE CAISSE ---
  const [activeSession, setActiveSession] = useState<CaisseSessionRecord | null>(initialSession);
  const [isOuvertureModalOpen, setIsOuvertureModalOpen] = useState(!initialSession);
  const [isClotureModalOpen, setIsClotureModalOpen] = useState(false);
  const [isMouvementModalOpen, setIsMouvementModalOpen] = useState(false);

  // --- BRANCH ACTIVE ---
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    initialSession?.branch_id || branches[0]?.id || 1
  );

  // --- PLEIN ÉCRAN ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- HORLOGE TEMPS RÉEL ---
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- TICKETS MULTIPLES (EN ATTENTE) ---
  const [tickets, setTickets] = useState<HeldTicket[]>([
    {
      id: "ticket-1",
      label: "Ticket 1 (Comptoir)",
      clientId: null,
      clientNom: "Client Comptoir",
      items: [],
      remiseGlobale: 0,
    },
  ]);
  const [activeTicketId, setActiveTicketId] = useState<string>("ticket-1");

  const currentTicket = useMemo(() => {
    return tickets.find((t) => t.id === activeTicketId) || tickets[0];
  }, [tickets, activeTicketId]);

  // --- SÉLECTION LIGNE DU PANIER (POUR NUMPAD) ---
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [numpadTarget, setNumpadTarget] = useState<"qty" | "discount" | "tender">("qty");
  const [numpadBuffer, setNumpadBuffer] = useState<string>("");

  // --- RECHERCHE ET DOUCHETTE CODE-BARRES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [barcodeScanSuccess, setBarcodeScanSuccess] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- MODALE DE PAIEMENT & ENCAISSEMENT ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<CaisseModeReglement>("especes");
  const [tenderAmount, setTenderAmount] = useState<number | string>("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [lastCompletedTicket, setLastCompletedTicket] = useState<CaisseTicketRecord | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Extraire les catégories uniques
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" || !selectedCategory || p.categorie === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.code_barre && p.code_barre.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // --- TOTAUX FINANCIERS DU TICKET EN COURS ---
  const ticketTotals = useMemo(() => {
    let ht = 0;
    let ttc = 0;
    currentTicket.items.forEach((item) => {
      const lineTotalTtc =
        item.quantite * item.prixUnitaireTtc * (1 - (item.remisePourcent || 0) / 100);
      const lineTotalHt =
        item.quantite * item.prixUnitaireHt * (1 - (item.remisePourcent || 0) / 100);
      ttc += lineTotalTtc;
      ht += lineTotalHt;
    });

    const netTtc = Math.max(0, Math.round((ttc - currentTicket.remiseGlobale) * 100) / 100);
    const netHt = Math.max(0, Math.round((ht - currentTicket.remiseGlobale) * 100) / 100);
    const tva = Math.max(0, Math.round((netTtc - netHt) * 100) / 100);

    return {
      brutTtc: Math.round(ttc * 100) / 100,
      totalHt: netHt,
      totalTva: tva,
      totalTtc: netTtc,
      totalItems: currentTicket.items.reduce((sum, item) => sum + item.quantite, 0),
    };
  }, [currentTicket]);

  // Calcul du rendu de monnaie
  const changeDue = useMemo(() => {
    const tender = Number(tenderAmount) || 0;
    return Math.max(0, Math.round((tender - ticketTotals.totalTtc) * 100) / 100);
  }, [tenderAmount, ticketTotals.totalTtc]);

  // --- GESTION DU PLEIN ÉCRAN ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // --- AJOUT D'ARTICLE AU TICKET EN COURS ---
  const handleAddProduct = (prod: PosProductItem) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== activeTicketId) return t;

        const existingIdx = t.items.findIndex((item) => item.produitId === prod.id);
        if (existingIdx >= 0) {
          // Incrémenter la quantité
          const updatedItems = [...t.items];
          updatedItems[existingIdx] = {
            ...updatedItems[existingIdx],
            quantite: updatedItems[existingIdx].quantite + 1,
          };
          return { ...t, items: updatedItems };
        } else {
          // Nouvelle ligne
          const newItem: CartItem = {
            produitId: prod.id,
            ref: prod.ref,
            designation: prod.designation,
            prixUnitaireHt: prod.prix_ht,
            prixUnitaireTtc: prod.prix_ttc,
            quantite: 1,
            tvaRate: prod.tva_rate || 20,
            remisePourcent: 0,
          };
          return { ...t, items: [...t.items, newItem] };
        }
      })
    );
  };

  // --- ÉCOUTEUR GLOBAL DE SCANNER CODE-BARRES ---
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ne pas intercepter si l'utilisateur est dans un textarea ou modal
      if (isPaymentModalOpen || isOuvertureModalOpen || isClotureModalOpen || isMouvementModalOpen) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.trim().length >= 3) {
          e.preventDefault();
          const scannedCode = barcodeBuffer.trim();
          barcodeBuffer = "";

          // Chercher le produit par code-barres exact ou référence
          const matchedProd = products.find(
            (p) =>
              (p.code_barre && p.code_barre.toLowerCase() === scannedCode.toLowerCase()) ||
              p.ref.toLowerCase() === scannedCode.toLowerCase()
          );

          if (matchedProd) {
            handleAddProduct(matchedProd);
            setBarcodeScanSuccess(true);
            setTimeout(() => setBarcodeScanSuccess(false), 800);
            if (searchInputRef.current) searchInputRef.current.value = "";
            setSearchQuery("");
          }
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, isPaymentModalOpen, isOuvertureModalOpen, isClotureModalOpen, isMouvementModalOpen]);

  // --- MODIFICATION D'UNE LIGNE DU PANIER ---
  const handleUpdateItemQty = (idx: number, delta: number) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== activeTicketId) return t;
        const updated = [...t.items];
        const newQty = Math.max(1, updated[idx].quantite + delta);
        updated[idx] = { ...updated[idx], quantite: newQty };
        return { ...t, items: updated };
      })
    );
  };

  const handleRemoveItem = (idx: number) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== activeTicketId) return t;
        return { ...t, items: t.items.filter((_, i) => i !== idx) };
      })
    );
    if (selectedLineIndex === idx) setSelectedLineIndex(null);
  };

  const handleClearCart = () => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== activeTicketId) return t;
        return { ...t, items: [], remiseGlobale: 0 };
      })
    );
    setSelectedLineIndex(null);
  };

  // --- TICKETS MULTIPLES ---
  const handleNewTicketTab = () => {
    const nextNum = tickets.length + 1;
    const newId = `ticket-${Date.now()}`;
    const newT: HeldTicket = {
      id: newId,
      label: `Ticket #${nextNum}`,
      clientId: null,
      clientNom: "Client Comptoir",
      items: [],
      remiseGlobale: 0,
    };
    setTickets((prev) => [...prev, newT]);
    setActiveTicketId(newId);
  };

  const handleCloseTicketTab = (tId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tickets.length <= 1) {
      handleClearCart();
      return;
    }
    const remaining = tickets.filter((t) => t.id !== tId);
    setTickets(remaining);
    if (activeTicketId === tId) {
      setActiveTicketId(remaining[0].id);
    }
  };

  // --- NUMPAD TACTILE INTERACTIF ---
  const handleNumpadPress = (char: string) => {
    if (selectedLineIndex === null && numpadTarget !== "tender") return;

    if (char === "C") {
      setNumpadBuffer("");
      if (numpadTarget === "tender") setTenderAmount("");
      return;
    }

    const nextVal = numpadBuffer + char;
    setNumpadBuffer(nextVal);
    const parsedNum = parseFloat(nextVal) || 0;

    if (numpadTarget === "qty" && selectedLineIndex !== null) {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== activeTicketId) return t;
          const updated = [...t.items];
          if (updated[selectedLineIndex]) {
            updated[selectedLineIndex] = { ...updated[selectedLineIndex], quantite: Math.max(1, parsedNum) };
          }
          return { ...t, items: updated };
        })
      );
    } else if (numpadTarget === "discount" && selectedLineIndex !== null) {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== activeTicketId) return t;
          const updated = [...t.items];
          if (updated[selectedLineIndex]) {
            updated[selectedLineIndex] = {
              ...updated[selectedLineIndex],
              remisePourcent: Math.min(100, Math.max(0, parsedNum)),
            };
          }
          return { ...t, items: updated };
        })
      );
    } else if (numpadTarget === "tender") {
      setTenderAmount(parsedNum);
    }
  };

  // --- RACCOURCIS RAPIDES DE MONNAIE (BILLETS MAROCAINS) ---
  const handleQuickTenderPreset = (val: number | "exact") => {
    if (val === "exact") {
      setTenderAmount(ticketTotals.totalTtc);
    } else {
      setTenderAmount(val);
    }
  };

  // --- OUVRIR LA MODALE D'ENCAISSEMENT ---
  const handleOpenPayment = (mode: CaisseModeReglement) => {
    if (currentTicket.items.length === 0) return;
    setPaymentMode(mode);
    setTenderAmount(ticketTotals.totalTtc);
    setIsPaymentModalOpen(true);
  };

  // --- ENREGISTREMENT ET VALIDATION FINALE DU TICKET ---
  const handleFinalizeTicket = async () => {
    if (!activeSession) {
      setIsOuvertureModalOpen(true);
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const res = await enregistrerTicketCaisseAction({
        sessionId: activeSession.id,
        branchId: selectedBranchId,
        clientId: currentTicket.clientId,
        clientNom: currentTicket.clientNom,
        lignes: currentTicket.items.map((i) => ({
          produitId: i.produitId,
          ref: i.ref,
          designation: i.designation,
          prixUnitaireHt: i.prixUnitaireHt,
          prixUnitaireTtc: i.prixUnitaireTtc,
          quantite: i.quantite,
          tvaRate: i.tvaRate,
          remisePourcent: i.remisePourcent,
        })),
        remiseGlobale: currentTicket.remiseGlobale,
        modeReglement: paymentMode,
        montantPaye: Number(tenderAmount) || ticketTotals.totalTtc,
      });

      if (res.success && res.ticket) {
        setLastCompletedTicket(res.ticket);
        setIsPaymentModalOpen(false);
        setShowSuccessModal(true);

        // Vider le panier du ticket courant
        handleClearCart();

        // Mettre à jour l'état local de la session
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                total_ventes_ttc: prev.total_ventes_ttc + res.ticket.total_ttc,
                nb_tickets: prev.nb_tickets + 1,
              }
            : null
        );
      } else {
        alert(res.error || "Échec de l'enregistrement du ticket.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Raccourci pour imprimer le ticket thermique
  const handlePrintTicket = (ticketId: number) => {
    window.open(`/print/pos/ticket/${ticketId}`, "_blank");
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[9999]" : ""
      }`}
    >
      {/* 1. BARRE SUPÉRIEURE : STATUT SESSION & RACCOURCIS RAPIDES */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-400" />
            <span className="font-black text-sm tracking-wide text-white uppercase hidden sm:inline">
              Haloui Caisse
            </span>
          </div>

          <Divider orientation="vertical" />

          {/* Statut de la Session */}
          {activeSession ? (
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {activeSession.numero_session}
              </span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                · Fond : {formatNumber(activeSession.fond_caisse_ouverture)} DH
              </span>
            </div>
          ) : (
            <Button
              size="compact-sm"
              color="teal"
              leftSection={<Store size={14} />}
              onClick={() => setIsOuvertureModalOpen(true)}
            >
              Ouvrir Caisse
            </Button>
          )}

          {/* Dépôt / Magasin */}
          <span className="text-xs text-slate-400 font-medium hidden lg:inline">
            📍 {branches.find((b) => b.id === selectedBranchId)?.name}
          </span>
        </div>

        {/* Onglets Tickets Multiples */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[45%] py-1">
          {tickets.map((t) => {
            const isActive = t.id === activeTicketId;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTicketId(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span>{t.label}</span>
                {t.items.length > 0 && (
                  <Badge size="xs" circle color={isActive ? "indigo.9" : "dark"}>
                    {t.items.length}
                  </Badge>
                )}
                {tickets.length > 1 && (
                  <X
                    size={12}
                    className="hover:text-red-400 ml-1 opacity-70 hover:opacity-100"
                    onClick={(e) => handleCloseTicketTab(t.id, e)}
                  />
                )}
              </div>
            );
          })}
          <ActionIcon
            size="sm"
            variant="light"
            color="indigo"
            radius="md"
            onClick={handleNewTicketTab}
            title="Nouveau Ticket en attente"
          >
            <Plus size={14} />
          </ActionIcon>
        </div>

        {/* Horloge & Boutons d'Action Clôture / Mouvements */}
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-1 text-xs text-slate-400 font-mono">
            <Clock size={14} className="text-indigo-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {activeSession && (
              <>
                <Button
                  size="compact-xs"
                  variant="light"
                  color="blue"
                  leftSection={<DollarSign size={13} />}
                  onClick={() => setIsMouvementModalOpen(true)}
                >
                  Mouvement
                </Button>

                <Button
                  size="compact-xs"
                  variant="light"
                  color="teal"
                  leftSection={<FileText size={13} />}
                  onClick={() => setIsClotureModalOpen(true)}
                >
                  Rapport X
                </Button>

                <Button
                  size="compact-xs"
                  color="red"
                  variant="filled"
                  leftSection={<Lock size={13} />}
                  onClick={() => setIsClotureModalOpen(true)}
                >
                  Clôture Z
                </Button>
              </>
            )}

            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={toggleFullscreen}
              title="Plein Écran"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </ActionIcon>
          </div>
        </div>
      </header>

      {/* 2. CORPS PRINCIPAL DIVISÉ : GAUCHE (CATALOGUE & DOUCHETTE) / DROITE (PANIER & ENCAISSEMENT) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* === SECTION GAUCHE : CATALOGUE PRODUITS & SCANNER (7 COLS) === */}
        <div className="col-span-7 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          {/* Barre de Recherche & Douchette Code-barres */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 shrink-0">
            <div className="relative">
              <TextInput
                ref={searchInputRef}
                placeholder="Scanner un code-barres (douchette) ou taper réf/nom..."
                leftSection={<Search size={18} className="text-slate-400" />}
                rightSection={
                  barcodeScanSuccess ? (
                    <Badge color="teal" size="xs" variant="filled">
                      Scanné !
                    </Badge>
                  ) : (
                    <Barcode size={20} className="text-indigo-400" />
                  )
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="md"
                radius="lg"
                styles={{
                  input: {
                    backgroundColor: "#0f172a",
                    borderColor: barcodeScanSuccess ? "#10b981" : "#334155",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                  },
                }}
              />
            </div>

            {/* Filtres Catégories Rapides */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 no-scrollbar">
              <Button
                size="compact-xs"
                radius="xl"
                variant={selectedCategory === "all" ? "filled" : "subtle"}
                color="indigo"
                onClick={() => setSelectedCategory("all")}
              >
                Tous ({products.length})
              </Button>
              {categories.map((c) => (
                <Button
                  key={c}
                  size="compact-xs"
                  radius="xl"
                  variant={selectedCategory === c ? "filled" : "subtle"}
                  color="indigo"
                  onClick={() => setSelectedCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          {/* Grille Tactile des Produits */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((prod) => {
                const inCart = currentTicket.items.find((i) => i.produitId === prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between min-h-[105px] select-none active:scale-95 ${
                      inCart
                        ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/20"
                        : "bg-slate-800/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                  >
                    {/* Badge de quantité déjà dans le panier */}
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                        {inCart.quantite}
                      </span>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 truncate max-w-[65%]">
                          {prod.ref}
                        </span>
                        {prod.stock_actuel !== undefined && (
                          <span
                            className={`text-[9px] font-bold px-1 rounded ${
                              prod.stock_actuel > 0
                                ? "bg-slate-700 text-emerald-400"
                                : "bg-red-950 text-red-400"
                            }`}
                          >
                            Stk: {prod.stock_actuel}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-xs text-white line-clamp-2 mt-1 leading-snug">
                        {prod.designation}
                      </h3>
                    </div>

                    <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-700/50">
                      <span className="text-[10px] text-slate-400 uppercase">TTC</span>
                      <span className="font-black text-sm text-emerald-400">
                        {formatNumber(prod.prix_ttc)}{" "}
                        <span className="text-[10px] font-bold text-slate-300">DH</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === SECTION DROITE : PANIER TICKET & FAST CHECKOUT (5 COLS) === */}
        <div className="col-span-5 bg-slate-950 flex flex-col overflow-hidden">
          {/* Sélecteur Client & Actions Panier */}
          <div className="p-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex-1">
              <Select
                placeholder="Client"
                leftSection={<UserRound size={14} className="text-slate-400" />}
                data={[
                  { value: "0", label: "Client Comptoir (Standard)" },
                  ...clients.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
                value={currentTicket.clientId ? String(currentTicket.clientId) : "0"}
                onChange={(val) => {
                  const cId = val && val !== "0" ? Number(val) : null;
                  const cNom = clients.find((c) => c.id === cId)?.name || "Client Comptoir";
                  setTickets((prev) =>
                    prev.map((t) =>
                      t.id === activeTicketId ? { ...t, clientId: cId, clientNom: cNom } : t
                    )
                  );
                }}
                size="xs"
                radius="md"
                styles={{
                  input: { backgroundColor: "#0f172a", borderColor: "#334155", color: "#ffffff" },
                }}
              />
            </div>

            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<Trash2 size={13} />}
              onClick={handleClearCart}
              disabled={currentTicket.items.length === 0}
            >
              Vider
            </Button>
          </div>

          {/* Lignes du Panier */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {currentTicket.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                <ShoppingCart size={40} className="stroke-[1.2] mb-2 opacity-50" />
                <p className="text-xs font-semibold">Le ticket est actuellement vide.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Scannez un code-barres ou touchez un produit pour l&apos;ajouter.
                </p>
              </div>
            ) : (
              currentTicket.items.map((item, idx) => {
                const isSelected = selectedLineIndex === idx;
                const lineTotal =
                  item.quantite * item.prixUnitaireTtc * (1 - (item.remisePourcent || 0) / 100);

                return (
                  <div
                    key={`${item.ref}-${idx}`}
                    onClick={() => {
                      setSelectedLineIndex(idx);
                      setNumpadBuffer("");
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-slate-800 border-indigo-500 ring-1 ring-indigo-500"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate max-w-[70%]">
                          {item.designation}
                        </span>
                        {item.remisePourcent > 0 && (
                          <Badge size="xs" color="orange" variant="filled">
                            -{item.remisePourcent}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatNumber(item.prixUnitaireTtc)} DH × {item.quantite}
                      </div>
                    </div>

                    {/* Steppers de quantité */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                      >
                        <Minus size={12} />
                      </ActionIcon>
                      <span className="text-xs font-bold w-6 text-center">{item.quantite}</span>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                      >
                        <Plus size={12} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleRemoveItem(idx)}
                        ml={4}
                      >
                        <Trash2 size={13} />
                      </ActionIcon>
                    </div>

                    {/* Total de la ligne */}
                    <div className="text-right shrink-0 min-w-[70px]">
                      <div className="font-black text-xs text-white">
                        {formatNumber(lineTotal)} <span className="text-[10px] text-slate-400">DH</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clavier Tactile Numpad pour modifications rapides */}
          {selectedLineIndex !== null && currentTicket.items[selectedLineIndex] && (
            <div className="p-2 bg-slate-900 border-t border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[50%]">
                  Ligne : {currentTicket.items[selectedLineIndex].designation}
                </span>

                <SegmentedControl
                  size="xs"
                  value={numpadTarget}
                  onChange={(v: any) => {
                    setNumpadTarget(v);
                    setNumpadBuffer("");
                  }}
                  data={[
                    { label: "Qté", value: "qty" },
                    { label: "Remise %", value: "discount" },
                  ]}
                  color="indigo"
                />
              </div>

              <div className="grid grid-cols-6 gap-1">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "C"].map((k) => (
                  <button
                    key={k}
                    onClick={() => handleNumpadPress(k)}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center transition"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Totaux Financiers du Ticket */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Sous-total HT</span>
                <span className="font-semibold text-slate-200">{formatNumber(ticketTotals.totalHt)} DH</span>
              </div>
              <div className="flex justify-between">
                <span>TVA estimée</span>
                <span className="font-semibold text-slate-200">{formatNumber(ticketTotals.totalTva)} DH</span>
              </div>
              {currentTicket.remiseGlobale > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>Remise globale</span>
                  <span>- {formatNumber(currentTicket.remiseGlobale)} DH</span>
                </div>
              )}
            </div>

            {/* TOTAL À PAYER GÉANT */}
            <div className="mt-2.5 p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/50 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                  NET À PAYER ({ticketTotals.totalItems} art.)
                </span>
                <span className="text-2xl font-black text-white leading-tight">
                  {formatNumber(ticketTotals.totalTtc)}{" "}
                  <span className="text-sm font-bold text-indigo-300">DH</span>
                </span>
              </div>

              {/* Raccourci rapide Espèces / Carte */}
              <div className="flex gap-1.5">
                <Button
                  size="md"
                  radius="lg"
                  color="teal"
                  leftSection={<Banknote size={18} />}
                  onClick={() => handleOpenPayment("especes")}
                  disabled={currentTicket.items.length === 0}
                  className="shadow-lg shadow-teal-900/30 font-bold"
                >
                  Espèces
                </Button>

                <Button
                  size="md"
                  radius="lg"
                  color="indigo"
                  leftSection={<CreditCard size={18} />}
                  onClick={() => handleOpenPayment("carte")}
                  disabled={currentTicket.items.length === 0}
                  className="shadow-lg shadow-indigo-900/30 font-bold"
                >
                  Carte
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODALE D'ENCAISSEMENT & RENDU DE MONNAIE */}
      <Modal
        opened={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon color="teal" size="lg" radius="md">
              <Banknote size={20} />
            </ThemeIcon>
            <div>
              <Text fw={800} size="sm">
                Règlement & Encaissement Caisse
              </Text>
              <Text size="xs" c="dimmed">
                Total à percevoir : <strong>{formatNumber(ticketTotals.totalTtc)} DH</strong>
              </Text>
            </div>
          </Group>
        }
        size="md"
        radius="lg"
        centered
      >
        <Stack gap="md">
          {/* Sélection Mode de Règlement */}
          <div>
            <Text size="xs" fw={700} mb={6}>
              Mode de paiement :
            </Text>
            <SimpleGrid cols={4} spacing="xs">
              {[
                { id: "especes", label: "Espèces", icon: Banknote, color: "teal" },
                { id: "carte", label: "Carte TPE", icon: CreditCard, color: "blue" },
                { id: "cheque", label: "Chèque", icon: Receipt, color: "orange" },
                { id: "virement", label: "Virement", icon: FileSpreadsheet, color: "indigo" },
              ].map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={paymentMode === m.id ? "filled" : "light"}
                  color={m.color}
                  onClick={() => setPaymentMode(m.id as CaisseModeReglement)}
                  leftSection={<m.icon size={16} />}
                >
                  {m.label}
                </Button>
              ))}
            </SimpleGrid>
          </div>

          {/* Raccourcis de Billets si Espèces */}
          {paymentMode === "especes" && (
            <div>
              <Text size="xs" fw={700} mb={6} c="dimmed">
                Raccourcis Coupures Reçues :
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="outline"
                  color="teal"
                  onClick={() => handleQuickTenderPreset("exact")}
                >
                  Montant Exact ({formatNumber(ticketTotals.totalTtc)} DH)
                </Button>
                {[20, 50, 100, 200, 500].map((b) => (
                  <Button
                    key={b}
                    size="xs"
                    variant={Number(tenderAmount) === b ? "filled" : "light"}
                    color="teal"
                    onClick={() => handleQuickTenderPreset(b)}
                  >
                    {b} DH
                  </Button>
                ))}
              </Group>
            </div>
          )}

          {/* Montant Reçu & Rendu de monnaie */}
          <SimpleGrid cols={2} spacing="xs">
            <NumberInput
              label="Montant Reçu / Donné"
              value={tenderAmount}
              onChange={setTenderAmount}
              min={0}
              size="md"
              radius="md"
              prefix="DH "
              styles={{ input: { fontSize: "1.2rem", fontWeight: 800 } }}
            />

            <Paper
              p="xs"
              radius="md"
              withBorder
              bg={changeDue > 0 ? "amber.0" : "gray.0"}
              className="flex flex-col justify-center"
            >
              <Text size="xs" c="dimmed" fw={600}>
                Monnaie à Rendre :
              </Text>
              <Text
                size="xl"
                fw={900}
                c={changeDue > 0 ? "amber.9" : "dark.7"}
                className="leading-tight"
              >
                {formatNumber(changeDue)} <span className="text-xs">DH</span>
              </Text>
            </Paper>
          </SimpleGrid>

          <Button
            fullWidth
            size="lg"
            radius="md"
            color="teal"
            leftSection={<CheckCircle2 size={20} />}
            loading={isSubmittingTicket}
            onClick={handleFinalizeTicket}
            mt="xs"
          >
            Valider l&apos;encaissement ({formatNumber(ticketTotals.totalTtc)} DH)
          </Button>
        </Stack>
      </Modal>

      {/* 4. MODALE DE SUCCÈS APRÈS VENTE AVEC BOUTON D'IMPRESSION DIRECT TICKET */}
      <Modal
        opened={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={
          <Group gap="xs">
            <ThemeIcon color="teal" size="md" radius="xl">
              <Check size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Vente Validée avec Succès
            </Text>
          </Group>
        }
        size="sm"
        radius="lg"
        centered
      >
        <Stack gap="md" align="center" ta="center">
          <ThemeIcon color="teal" size={56} radius="xl" variant="light">
            <Receipt size={32} />
          </ThemeIcon>

          <div>
            <Title order={3} fw={900} c="dark.8">
              Ticket N° {lastCompletedTicket?.numero_ticket}
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              Total TTC : <strong>{formatNumber(lastCompletedTicket?.total_ttc || 0)} DH</strong>
            </Text>
            {lastCompletedTicket?.montant_rendu && lastCompletedTicket.montant_rendu > 0 ? (
              <Badge size="lg" color="amber" variant="filled" mt="xs">
                Monnaie rendue : {formatNumber(lastCompletedTicket.montant_rendu)} DH
              </Badge>
            ) : null}
          </div>

          <Group grow w="100%">
            <Button
              size="md"
              radius="md"
              color="indigo"
              leftSection={<Printer size={18} />}
              onClick={() => {
                if (lastCompletedTicket) handlePrintTicket(lastCompletedTicket.id);
              }}
            >
              Imprimer Ticket (80mm)
            </Button>
            <Button
              size="md"
              radius="md"
              variant="default"
              onClick={() => setShowSuccessModal(false)}
            >
              Nouveau Client
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 5. MODALES D'OUVERTURE, DE CLÔTURE ET DE MOUVEMENTS */}
      <SessionOuvertureModal
        opened={isOuvertureModalOpen}
        onClose={() => setIsOuvertureModalOpen(false)}
        branchId={selectedBranchId}
        branchName={branches.find((b) => b.id === selectedBranchId)?.name || "Point de Vente"}
        onSessionOpened={(sess) => {
          setActiveSession(sess);
          setIsOuvertureModalOpen(false);
        }}
      />

      {activeSession && (
        <>
          <SessionClotureModal
            opened={isClotureModalOpen}
            onClose={() => setIsClotureModalOpen(false)}
            session={activeSession}
            onSessionClosed={(rapportZ) => {
              setActiveSession(null);
              setIsClotureModalOpen(false);
            }}
          />

          <MouvementCaisseModal
            opened={isMouvementModalOpen}
            onClose={() => setIsMouvementModalOpen(false)}
            sessionId={activeSession.id}
            branchId={selectedBranchId}
            onMouvementEnregistre={(mvt) => {
              setActiveSession((prev) =>
                prev
                  ? {
                      ...prev,
                      total_sorties:
                        mvt.type === "sortie" ? prev.total_sorties + mvt.montant : prev.total_sorties,
                      total_entrees:
                        mvt.type === "entree" ? prev.total_entrees + mvt.montant : prev.total_entrees,
                    }
                  : null
              );
            }}
          />
        </>
      )}
    </div>
  );
}
