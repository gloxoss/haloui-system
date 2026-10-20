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
  Menu,
} from "@mantine/core";
import {
  AlertCircle,
  Award,
  Banknote,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  Delete,
  DollarSign,
  Droplets,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gift,
  Layers,
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
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Split,
  Store,
  Tag,
  Trash2,
  Undo2,
  User,
  UserCheck,
  UserRound,
  Utensils,
  Coffee,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  enregistrerTicketCaisseAction,
  synchroniserTicketsHorsLigneAction,
  validerBonAchatAction,
} from "@/app/actions";
import {
  type CaisseModeReglement,
  type CaisseSessionRecord,
  type CaisseTicketRecord,
  type OfflineTicketRecord,
  type PaiementPartiel,
  type RapportZData,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { parseScaleBarcode } from "@/lib/scale-barcode";
import {
  enqueueOfflineTicket,
  getOfflineQueueCount,
  getQueuedOfflineTickets,
  registerPosServiceWorker,
  removeOfflineTicket,
  saveOfflineCatalog,
} from "@/lib/pos-offline";
import { BalanceModal } from "./balance-modal";
import { MouvementCaisseModal } from "./mouvement-caisse-modal";
import { RetourModal } from "./retour-modal";
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
  vendu_au_poids?: number;
  code_plu?: string;
  image_url?: string;
}

// Génère un monogramme clair de 2 lettres pour les articles sans photo
function getProductMonogram(designation: string, ref: string): string {
  const clean = (designation || "").replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (ref || "PR").slice(0, 2).toUpperCase();
}

// Thème visuel subtil selon la catégorie pour cartes sans photo
function getCategoryVisualTheme(cat: string): {
  gradient: string;
  badgeBg: string;
  badgeText: string;
} {
  const c = (cat || "").toLowerCase();
  if (c.includes("boisson") || c.includes("alimentaire") || c.includes("frais")) {
    return {
      gradient: "from-emerald-50 via-teal-50 to-emerald-100/70",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      badgeText: "text-emerald-700",
    };
  }
  if (c.includes("café") || c.includes("epicerie") || c.includes("épicerie")) {
    return {
      gradient: "from-amber-50 via-yellow-50 to-orange-100/70",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
      badgeText: "text-amber-700",
    };
  }
  if (c.includes("carburant") || c.includes("fuel")) {
    return {
      gradient: "from-sky-50 via-cyan-50 to-blue-100/70",
      badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
      badgeText: "text-sky-700",
    };
  }
  if (c.includes("lubrifiant") || c.includes("huile") || c.includes("vidange")) {
    return {
      gradient: "from-blue-50 via-indigo-50 to-blue-100/70",
      badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
      badgeText: "text-blue-700",
    };
  }
  if (c.includes("auto") || c.includes("batterie") || c.includes("pièce") || c.includes("piece")) {
    return {
      gradient: "from-purple-50 via-violet-50 to-pink-100/70",
      badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
      badgeText: "text-purple-700",
    };
  }
  return {
    gradient: "from-slate-50 via-gray-50 to-indigo-50/70",
    badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
    badgeText: "text-slate-700",
  };
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
  commercialId?: number | null;
  items: CartItem[];
  remiseGlobale: number;
}

interface PosTerminalProps {
  initialSession: CaisseSessionRecord | null;
  branches: Array<{ id: number; name: string }>;
  products: PosProductItem[];
  clients: Array<{
    id: number;
    name: string;
    fidelite_points?: number;
    fidelite_palier?: string;
    categorie_tarifaire?: string;
  }>;
  commerciaux?: Array<{
    id: number;
    name: string;
    code?: string;
  }>;
  companyName: string;
  currentUserId: number;
  currentUserName: string;
}

export function PosTerminal({
  initialSession,
  branches,
  products,
  clients,
  commerciaux,
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
      commercialId: null,
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

  // --- MULTI-PAIEMENTS (RÈGLEMENTS MIXTES) ---
  const [splitPayments, setSplitPayments] = useState<PaiementPartiel[]>([]);
  const [splitModeDraft, setSplitModeDraft] = useState<"especes" | "carte" | "bon_achat" | "cheque" | "virement">("carte");
  const [splitMontantDraft, setSplitMontantDraft] = useState<number | string>("");
  const [splitRefDraft, setSplitRefDraft] = useState<string>("");
  const [bonAchatReference, setBonAchatReference] = useState<string>("");

  // --- BALANCE CONNECTÉE & PRODUITS AU POIDS ---
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [balanceTargetProduct, setBalanceTargetProduct] = useState<PosProductItem | null>(null);
  const [scaleBarcodeScanNotice, setScaleBarcodeScanNotice] = useState<string>("");

  // --- GESTION DES RETOURS & BONS D'ACHAT ---
  const [isRetourModalOpen, setIsRetourModalOpen] = useState(false);
  const [bonAchatCheckStatus, setBonAchatCheckStatus] = useState<{
    loading: boolean;
    checkedCode?: string;
    valid?: boolean;
    message?: string;
    montantRestant?: number;
    clientNom?: string;
  }>({ loading: false });

  // --- MODE HORS-LIGNE (OFFLINE FIRST PWA) ---
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string>("");

  // Initialisation Réseau, Service Worker et Cache Catalogue Hors-Ligne
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Synchronisation automatique en tâche de fond dès le retour d'Internet
      handleSyncOfflineTickets();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Enregistrement PWA Service Worker
    registerPosServiceWorker();

    // Mise en cache locale IndexedDB du catalogue pour recherche et pesée hors-ligne
    if (products && products.length > 0) {
      saveOfflineCatalog(products);
    }

    // Calcul initial des tickets en attente de synchronisation
    getOfflineQueueCount().then((count) => setQueuedOfflineCount(count));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [products]);

  // Extraire les catégories uniques
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set).sort();
  }, [products]);

  // Compter les articles par catégorie pour affichage dynamique
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.categorie || "Général";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Icône et couleur visuelle thématique par catégorie de produit
  const getCategoryIcon = (categoryName: string) => {
    const c = (categoryName || "").toLowerCase();
    if (c.includes("alim") || c.includes("boiss") || c.includes("nourr") || c.includes("épic") || c.includes("snack")) {
      return <Utensils size={13} className="text-amber-400" />;
    }
    if (c.includes("café") || c.includes("thé") || c.includes("pause")) {
      return <Coffee size={13} className="text-amber-300" />;
    }
    if (c.includes("carb") || c.includes("essence") || c.includes("gazole") || c.includes("fioul") || c.includes("énergie")) {
      return <Fuel size={13} className="text-emerald-400" />;
    }
    if (c.includes("lubrif") || c.includes("huile") || c.includes("liquide") || c.includes("graiss")) {
      return <Droplets size={13} className="text-sky-400" />;
    }
    if (c.includes("batt") || c.includes("élec")) {
      return <Zap size={13} className="text-yellow-400" />;
    }
    if (c.includes("équip") || c.includes("outil") || c.includes("pièce") || c.includes("méc")) {
      return <Wrench size={13} className="text-blue-400" />;
    }
    if (c.includes("serv") || c.includes("lavage") || c.includes("entretien")) {
      return <Sparkles size={13} className="text-purple-400" />;
    }
    return <Tag size={13} className="text-indigo-400" />;
  };

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" || !selectedCategory || p.categorie === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.code_barre && p.code_barre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((p as any).code_plu && String((p as any).code_plu).includes(searchQuery.trim()));
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

  // Calcul du rendu de monnaie en mode Espèces (modale)
  const changeDue = useMemo(() => {
    const tender = Number(tenderAmount) || 0;
    return Math.max(0, Math.round((tender - ticketTotals.totalTtc) * 100) / 100);
  }, [tenderAmount, ticketTotals.totalTtc]);

  // --- ACTIONS RAPIDES D'ENCAISSEMENT ESPÈCES DIRECT & LIVE TIROIR ---
  const [quickCashTender, setQuickCashTender] = useState<number | "exact" | null>(null);
  const [sessionCashAccumulated, setSessionCashAccumulated] = useState<number>(0);

  // Fond initial & Espèces en caisse en temps réel
  const fondInitial = activeSession?.fond_caisse_ouverture || 0;
  const liveDrawerCash = useMemo(() => {
    return (
      fondInitial +
      (activeSession?.total_especes || 0) +
      (activeSession?.total_entrees || 0) -
      (activeSession?.total_sorties || 0) +
      sessionCashAccumulated
    );
  }, [activeSession, fondInitial, sessionCashAccumulated]);

  // Rendu de monnaie instantané pour l'action rapide en espèces sur le panneau principal
  const quickChangeDue = useMemo(() => {
    if (quickCashTender === null) return null;
    if (quickCashTender === "exact") return 0;
    return Math.max(0, Math.round((quickCashTender - ticketTotals.totalTtc) * 100) / 100);
  }, [quickCashTender, ticketTotals.totalTtc]);

  // Calculs du Multi-Paiements
  const totalSplitRegle = useMemo(() => {
    return Math.round(splitPayments.reduce((sum, p) => sum + (Number(p.montant) || 0), 0) * 100) / 100;
  }, [splitPayments]);

  const remainingSplitDue = useMemo(() => {
    return Math.max(0, Math.round((ticketTotals.totalTtc - totalSplitRegle) * 100) / 100);
  }, [ticketTotals.totalTtc, totalSplitRegle]);

  // --- GESTION DU PLEIN ÉCRAN ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // --- AJOUT D'ARTICLE AU TICKET EN COURS ---
  const handleAddProduct = (prod: PosProductItem, customQty?: number) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== activeTicketId) return t;

        const existingIdx = t.items.findIndex((item) => item.produitId === prod.id);
        if (existingIdx >= 0) {
          // Incrémenter la quantité
          const updatedItems = [...t.items];
          const newQty =
            customQty !== undefined
              ? Math.round((updatedItems[existingIdx].quantite + customQty) * 1000) / 1000
              : updatedItems[existingIdx].quantite + 1;

          updatedItems[existingIdx] = {
            ...updatedItems[existingIdx],
            quantite: newQty,
          };
          return { ...t, items: updatedItems };
        } else {
          // Nouvelle ligne
          const qty = customQty !== undefined ? customQty : 1;
          const newItem: CartItem = {
            produitId: prod.id,
            ref: prod.ref,
            designation: prod.designation,
            prixUnitaireHt: prod.prix_ht,
            prixUnitaireTtc: prod.prix_ttc,
            quantite: qty,
            tvaRate: prod.tva_rate || 20,
            remisePourcent: 0,
          };
          return { ...t, items: [...t.items, newItem] };
        }
      })
    );
  };

  // --- TRAITEMENT CENTRALISÉ DU SCAN CODE-BARRES / BALANCE ---
  const processScannedCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // 1. Détection prioritaire code-barres balance EAN-13 GS1 (poids/prix variable 20-29)
    const scaleRes = parseScaleBarcode(code, products);
    if (scaleRes.isValidScaleBarcode && scaleRes.matchedProductId) {
      const prod = products.find((p) => p.id === scaleRes.matchedProductId);
      if (prod) {
        const qty = scaleRes.calculatedQuantity || 1;
        handleAddProduct(prod, qty);
        setBarcodeScanSuccess(true);
        setScaleBarcodeScanNotice(
          scaleRes.type === "weight"
            ? `⚖️ Balance : ${prod.designation} (${qty.toFixed(3)} kg)`
            : `⚖️ Balance : ${prod.designation} (${formatNumber(scaleRes.priceDh || 0)} DH)`
        );
        setTimeout(() => {
          setBarcodeScanSuccess(false);
          setScaleBarcodeScanNotice("");
        }, 2500);
        if (searchInputRef.current) searchInputRef.current.value = "";
        setSearchQuery("");
        return;
      }
    }

    // 2. Recherche standard par code-barres exact ou référence
    const matchedProd = products.find(
      (p) =>
        (p.code_barre && p.code_barre.toLowerCase() === code.toLowerCase()) ||
        p.ref.toLowerCase() === code.toLowerCase()
    );

    if (matchedProd) {
      handleAddProduct(matchedProd);
      setBarcodeScanSuccess(true);
      setTimeout(() => setBarcodeScanSuccess(false), 800);
      if (searchInputRef.current) searchInputRef.current.value = "";
      setSearchQuery("");
    }
  };

  // --- ÉCOUTEUR GLOBAL DE SCANNER CODE-BARRES & RACCOURCIS CLAVIER ---
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Raccourci F4 pour ouvrir la balance de pesage
      if (e.key === "F4") {
        e.preventDefault();
        setBalanceTargetProduct(null);
        setIsBalanceModalOpen(true);
        return;
      }

      // Raccourci F8 pour règlement rapide en Espèces
      if (e.key === "F8") {
        e.preventDefault();
        if (currentTicket.items.length > 0) {
          handleOpenPayment("especes");
        }
        return;
      }

      // Raccourci F9 pour règlement rapide par Carte TPE
      if (e.key === "F9") {
        e.preventDefault();
        if (currentTicket.items.length > 0) {
          handleOpenPayment("carte");
        }
        return;
      }

      // Raccourci F2 pour créer un nouveau ticket
      if (e.key === "F2") {
        e.preventDefault();
        handleNewTicketTab();
        return;
      }

      // Ne pas intercepter si l'utilisateur est dans un modal
      if (
        isPaymentModalOpen ||
        isOuvertureModalOpen ||
        isClotureModalOpen ||
        isMouvementModalOpen ||
        isBalanceModalOpen
      ) {
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
          processScannedCode(scannedCode);
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    products,
    currentTicket.items.length,
    isPaymentModalOpen,
    isOuvertureModalOpen,
    isClotureModalOpen,
    isMouvementModalOpen,
    isBalanceModalOpen,
  ]);

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
      commercialId: null,
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

    if (char === "OK") {
      setSelectedLineIndex(null);
      setNumpadBuffer("");
      return;
    }

    if (char === "+1" && selectedLineIndex !== null) {
      handleUpdateItemQty(selectedLineIndex, 1);
      return;
    }

    if (char === "+5" && selectedLineIndex !== null) {
      handleUpdateItemQty(selectedLineIndex, 5);
      return;
    }

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

  // Sélection rapide de coupures directement sur le panneau du ticket
  const handleSelectQuickCash = (denom: number | "exact") => {
    if (currentTicket.items.length === 0) return;
    setQuickCashTender(denom);
    if (denom === "exact") {
      setTenderAmount(ticketTotals.totalTtc);
    } else {
      setTenderAmount(denom);
    }
  };

  // --- BALANCE CONNECTÉE & PESÉE AU COMPTOIR ---
  const handleOpenBalanceModal = (prod?: PosProductItem) => {
    setBalanceTargetProduct(prod || null);
    setIsBalanceModalOpen(true);
  };

  const handleAddWeighedItem = (prod: PosProductItem, weightKg: number) => {
    handleAddProduct(prod, weightKg);
    setBarcodeScanSuccess(true);
    setScaleBarcodeScanNotice(`⚖️ Pesée ajoutée : ${prod.designation} (${weightKg.toFixed(3)} kg)`);
    setTimeout(() => {
      setBarcodeScanSuccess(false);
      setScaleBarcodeScanNotice("");
    }, 2500);
  };

  // --- GESTION DU MULTI-PAIEMENTS ---
  const handleAddSplitPayment = () => {
    const amt = Number(splitMontantDraft) || 0;
    if (amt <= 0) return;

    const newP: PaiementPartiel = {
      mode: splitModeDraft,
      montant: amt,
      reference: splitRefDraft.trim() || undefined,
    };

    setSplitPayments((prev) => [...prev, newP]);
    setSplitRefDraft("");
    const newRemaining = Math.max(0, Math.round((remainingSplitDue - amt) * 100) / 100);
    setSplitMontantDraft(newRemaining > 0 ? newRemaining : "");
  };

  const handleRemoveSplitPayment = (idx: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- OUVRIR LA MODALE D'ENCAISSEMENT ---
  const handleOpenPayment = (mode: CaisseModeReglement) => {
    if (currentTicket.items.length === 0) return;
    setPaymentMode(mode);
    setTenderAmount(ticketTotals.totalTtc);
    setBonAchatReference("");
    setSplitPayments([]);
    setSplitMontantDraft(ticketTotals.totalTtc);
    setSplitRefDraft("");
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
      let finalMontantPaye = Number(tenderAmount) || ticketTotals.totalTtc;
      let finalPaiementsPartiels: PaiementPartiel[] | undefined = undefined;

      if (paymentMode === "mixte") {
        if (splitPayments.length === 0) {
          alert("Veuillez ajouter au moins un règlement dans la ventilation mixte.");
          setIsSubmittingTicket(false);
          return;
        }
        if (remainingSplitDue > 0.05) {
          alert(`Le montant réglé (${formatNumber(totalSplitRegle)} DH) ne couvre pas le total dû (${formatNumber(ticketTotals.totalTtc)} DH).`);
          setIsSubmittingTicket(false);
          return;
        }
        finalPaiementsPartiels = splitPayments;
        finalMontantPaye = totalSplitRegle;
      } else if (paymentMode === "bon_achat") {
        finalPaiementsPartiels = [
          {
            mode: "bon_achat",
            montant: ticketTotals.totalTtc,
            reference: bonAchatReference.trim() || undefined,
          },
        ];
        finalMontantPaye = ticketTotals.totalTtc;
      }

      // 1. TRAITEMENT DU MODE HORS-LIGNE (OFFLINE FIRST PWA)
      if (!isOnline) {
        const offlineId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const localNumero = `TK-OFFLINE-${Date.now().toString().slice(-6)}`;

        const offlineTicket: OfflineTicketRecord = {
          offlineId,
          timestamp: Date.now(),
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
          montantPaye: finalMontantPaye,
          paiementsPartiels: finalPaiementsPartiels,
          totalTtc: ticketTotals.totalTtc,
          synced: false,
        };

        await enqueueOfflineTicket(offlineTicket);
        const newCount = await getOfflineQueueCount();
        setQueuedOfflineCount(newCount);

        const syntheticTicket: CaisseTicketRecord = {
          id: -Date.now(),
          company_id: 1,
          branch_id: selectedBranchId,
          session_id: activeSession.id,
          numero_ticket: localNumero,
          client_id: currentTicket.clientId,
          client_nom: currentTicket.clientNom,
          statut: "valide",
          mode_reglement: paymentMode,
          total_ht: ticketTotals.totalHt,
          total_tva: ticketTotals.totalTva,
          total_ttc: ticketTotals.totalTtc,
          remise_globale: currentTicket.remiseGlobale,
          montant_paye: finalMontantPaye,
          montant_rendu: changeDue,
          created_at: new Date().toISOString(),
          lignes: currentTicket.items.map((i, idx) => ({
            id: idx + 1,
            ticket_id: -1,
            produit_id: i.produitId || null,
            ref: i.ref,
            designation: i.designation,
            prix_unitaire_ht: i.prixUnitaireHt,
            prix_unitaire_ttc: i.prixUnitaireTtc,
            quantite: i.quantite,
            tva_rate: i.tvaRate,
            remise_pourcent: i.remisePourcent,
            total_ht: i.quantite * i.prixUnitaireHt,
            total_ttc: i.quantite * i.prixUnitaireTtc,
          })),
        };

        setLastCompletedTicket(syntheticTicket);
        setIsPaymentModalOpen(false);
        setShowSuccessModal(true);
        handleClearCart();

        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                total_ventes_ttc: prev.total_ventes_ttc + ticketTotals.totalTtc,
                nb_tickets: prev.nb_tickets + 1,
              }
            : null
        );
        return;
      }

      // 2. ENREGISTREMENT SERVEUR STANDARD EN LIGNE
      const res = await enregistrerTicketCaisseAction({
        sessionId: activeSession.id,
        branchId: selectedBranchId,
        clientId: currentTicket.clientId,
        clientNom: currentTicket.clientNom,
        commercialId: currentTicket.commercialId || null,
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
        montantPaye: finalMontantPaye,
        paiementsPartiels: finalPaiementsPartiels,
        detailsReglementJson: finalPaiementsPartiels ? JSON.stringify(finalPaiementsPartiels) : undefined,
      });

      if (res.success && res.ticket) {
        setLastCompletedTicket(res.ticket);
        setIsPaymentModalOpen(false);
        setShowSuccessModal(true);

        // Vider le panier du ticket courant
        handleClearCart();

        // Mettre à jour l'état local de la session
        if (paymentMode === "especes") {
          setSessionCashAccumulated((prev) => prev + res.ticket.total_ttc);
        }
        setQuickCashTender(null);

        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                total_ventes_ttc: prev.total_ventes_ttc + res.ticket.total_ttc,
                total_especes: paymentMode === "especes" ? prev.total_especes + res.ticket.total_ttc : prev.total_especes,
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

  // Vérification de validité et solde d'un bon d'achat
  const handleCheckBonAchat = async (code: string) => {
    if (!code.trim()) return;
    setBonAchatCheckStatus({ loading: true, checkedCode: code.trim() });
    try {
      const res = await validerBonAchatAction(code.trim());
      if (res.success && res.valide && res.bon) {
        setBonAchatCheckStatus({
          loading: false,
          checkedCode: code.trim(),
          valid: true,
          montantRestant: res.bon.montant_restant,
          clientNom: res.bon.client_nom,
        });
      } else {
        setBonAchatCheckStatus({
          loading: false,
          checkedCode: code.trim(),
          valid: false,
          message: res.message || "Bon d'achat invalide, expiré ou introuvable.",
        });
      }
    } catch {
      setBonAchatCheckStatus({
        loading: false,
        checkedCode: code.trim(),
        valid: false,
        message: "Erreur lors de la vérification du bon d'achat.",
      });
    }
  };

  // Synchronisation manuelle ou automatique des tickets hors-ligne
  const handleSyncOfflineTickets = async () => {
    if (isSyncingOffline) return;
    setIsSyncingOffline(true);
    setSyncNotice("");
    try {
      const queued = await getQueuedOfflineTickets();
      if (!queued || queued.length === 0) {
        setQueuedOfflineCount(0);
        setIsSyncingOffline(false);
        return;
      }

      const res = await synchroniserTicketsHorsLigneAction(queued, selectedBranchId);
      if (res.success && res.successes) {
        for (const s of res.successes) {
          await removeOfflineTicket(s.offlineId);
        }
        const remainingCount = await getOfflineQueueCount();
        setQueuedOfflineCount(remainingCount);

        setSyncNotice(
          `✅ Synchronisation réussie : ${res.successes.length} ticket(s) synchronisé(s) avec le serveur central !`
        );
        setTimeout(() => setSyncNotice(""), 7000);
      } else if (res.error) {
        setSyncNotice(`⚠️ Erreur synchronisation : ${res.error}`);
        setTimeout(() => setSyncNotice(""), 7000);
      }
    } catch (err) {
      console.error("Erreur sync offline:", err);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Raccourci pour imprimer le ticket thermique
  const handlePrintTicket = (ticketId: number) => {
    if (ticketId > 0) {
      window.open(`/print/pos/ticket/${ticketId}`, "_blank");
    } else {
      window.print();
    }
  };

  return (
    <div
      className={`flex flex-col select-none overflow-hidden bg-slate-100/80 text-slate-800 ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-screen w-screen bg-slate-100"
          : "h-[calc(100dvh-var(--app-shell-header-offset,70px)-3rem)] min-h-[620px] w-full max-w-full rounded-2xl border border-slate-200/90 shadow-xl"
      }`}
    >
      {/* 1. BARRE SUPÉRIEURE : STATUT SESSION, TICKETS & ACTIONS */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 z-10 shadow-xs">
        {/* GAUCHE : Logo Caisse + Session & Dépôt */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
              <Store className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-xs sm:text-sm tracking-wide text-slate-900 uppercase leading-none">
                Haloui Caisse
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold leading-tight">
                Point de Vente Tactile
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Statut de la Session & Fond de caisse initial & Live Tiroir */}
          {activeSession ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Numéro de session avec témoin actif */}
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/90 text-emerald-800 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-900 font-mono">
                  {activeSession.numero_session}
                </span>
              </div>

              {/* Fond de caisse initial - Très visible */}
              <div
                className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 shadow-2xs"
                title="Fond de caisse initial déclaré à l'ouverture"
              >
                <Store size={13} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 hidden md:inline">Fond initial :</span>
                <span className="text-xs font-black font-mono text-slate-900">
                  {formatNumber(fondInitial)} DH
                </span>
              </div>

              {/* Espèces en tiroir en direct */}
              <div
                className="hidden lg:flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 text-teal-900 shadow-2xs"
                title="Solde théorique d'espèces actuellement en tiroir (Fond + Ventes Espèces - Sorties)"
              >
                <Banknote size={13} className="text-teal-600" />
                <span className="text-[11px] font-semibold text-teal-700">Tiroir :</span>
                <span className="text-xs font-black font-mono text-teal-900">
                  {formatNumber(liveDrawerCash)} DH
                </span>
              </div>
            </div>
          ) : (
            <Button
              size="compact-xs"
              color="teal"
              radius="lg"
              leftSection={<Store size={13} />}
              onClick={() => setIsOuvertureModalOpen(true)}
            >
              Ouvrir Caisse
            </Button>
          )}

          {/* Dépôt / Magasin */}
          <span className="text-xs text-slate-500 font-medium hidden 2xl:inline truncate max-w-[140px]">
            📍 {branches.find((b) => b.id === selectedBranchId)?.name}
          </span>
        </div>

        {/* CENTRE : Onglets Tickets Multiples */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[40%] sm:max-w-[45%] no-scrollbar">
          {tickets.map((t) => {
            const isActive = t.id === activeTicketId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTicketId(t.id);
                  setQuickCashTender(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <span>{t.label}</span>
                {t.items.length > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-indigo-800 text-white" : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {t.items.length}
                  </span>
                )}
                {tickets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTicketTab(t.id, e)}
                    className="hover:text-red-500 opacity-60 hover:opacity-100 ml-0.5"
                    title="Fermer ce ticket"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
          <ActionIcon
            size="sm"
            variant="light"
            color="indigo"
            radius="lg"
            onClick={handleNewTicketTab}
            title="Nouveau Ticket en attente (F2)"
            className="shrink-0"
          >
            <Plus size={14} />
          </ActionIcon>
        </div>

        {/* DROITE : Statut Réseau, Horloge, Actions Caisse & Plein Écran */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Indicateur Réseau & Sync Offline */}
          {!isOnline ? (
            <Badge
              size="sm"
              color="orange"
              variant="filled"
              leftSection={<WifiOff size={12} />}
              className="cursor-default animate-pulse"
              title="Mode autonome hors-ligne"
            >
              Hors-Ligne {queuedOfflineCount > 0 ? `(${queuedOfflineCount})` : ""}
            </Badge>
          ) : queuedOfflineCount > 0 ? (
            <Button
              size="compact-xs"
              color="orange"
              variant="light"
              loading={isSyncingOffline}
              leftSection={<RefreshCw size={12} className={isSyncingOffline ? "animate-spin" : ""} />}
              onClick={handleSyncOfflineTickets}
              title="Synchroniser les tickets enregistrés hors-ligne"
            >
              Sync ({queuedOfflineCount})
            </Button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>En Ligne</span>
            </div>
          )}

          {/* Horloge */}
          <div className="hidden xl:flex items-center gap-1 text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
            <Clock size={13} className="text-indigo-600" />
            <span>{currentTime}</span>
          </div>

          {/* Menu Déroulant Gestion & Opérations de Caisse */}
          {activeSession && (
            <Menu shadow="xl" width={220} position="bottom-end" radius="md">
              <Menu.Target>
                <Button
                  size="compact-xs"
                  variant="light"
                  color="indigo"
                  radius="md"
                  leftSection={<SlidersHorizontal size={13} />}
                  rightSection={<ChevronDown size={11} />}
                  className="font-bold"
                >
                  Opérations
                </Button>
              </Menu.Target>
              <Menu.Dropdown className="bg-white border border-slate-200 text-slate-800 shadow-xl">
                <Menu.Label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Gestion de Caisse
                </Menu.Label>
                <Menu.Item
                  leftSection={<RotateCcw size={14} className="text-amber-500" />}
                  onClick={() => setIsRetourModalOpen(true)}
                  className="hover:bg-slate-100 text-xs text-slate-700 font-medium"
                >
                  Retours & Avoirs
                </Menu.Item>
                <Menu.Item
                  leftSection={<DollarSign size={14} className="text-sky-600" />}
                  onClick={() => setIsMouvementModalOpen(true)}
                  className="hover:bg-slate-100 text-xs text-slate-700 font-medium"
                >
                  Mouvement de Fond
                </Menu.Item>
                <Menu.Item
                  leftSection={<FileText size={14} className="text-teal-600" />}
                  onClick={() => setIsClotureModalOpen(true)}
                  className="hover:bg-slate-100 text-xs text-slate-700 font-medium"
                >
                  Rapport X (Consultation)
                </Menu.Item>
                <Menu.Divider className="border-slate-200" />
                <Menu.Item
                  color="red"
                  leftSection={<Lock size={14} />}
                  onClick={() => setIsClotureModalOpen(true)}
                  className="hover:bg-red-50 text-xs font-bold text-red-600"
                >
                  Clôture Z (Fin de Service)
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}

          {/* Plein Écran */}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter Plein Écran" : "Plein Écran"}
            radius="md"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </ActionIcon>
        </div>
      </header>

      {/* 1.1 Bannières Statut Réseau & Sync */}
      {syncNotice && (
        <div className="bg-emerald-600/90 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between shrink-0 shadow-md">
          <span>{syncNotice}</span>
          <button
            onClick={() => setSyncNotice("")}
            className="text-white/80 hover:text-white font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}
      {!isOnline && (
        <div className="bg-amber-600/95 text-white px-4 py-1 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 border-b border-amber-500">
          <WifiOff size={13} />
          <span>
            <strong>Mode Hors-Ligne Actif (PWA) :</strong> La caisse continue d&apos;encaisser normalement. Les tickets sont stockés localement et seront synchronisés dès le retour du réseau.
          </span>
          {queuedOfflineCount > 0 && (
            <Badge size="xs" color="dark" variant="filled">
              {queuedOfflineCount} ticket(s) en attente
            </Badge>
          )}
        </div>
      )}

      {/* 2. CORPS PRINCIPAL DIVISÉ : GAUCHE (CATALOGUE & SCANNER) / DROITE (PANIER & ENCAISSEMENT) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* === SECTION GAUCHE : CATALOGUE PRODUITS & SCANNER === */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-7 2xl:col-span-8 bg-slate-50/70 border-r border-slate-200/90 flex flex-col overflow-hidden">
          {/* Barre de Recherche & Douchette Code-barres & Balance */}
          <div className="p-3 bg-white border-b border-slate-200/90 shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <TextInput
                  ref={searchInputRef}
                  placeholder="Scanner un code-barres (douchette) ou chercher réf/nom..."
                  leftSection={<Search size={18} className="text-slate-400" />}
                  rightSection={
                    barcodeScanSuccess ? (
                      <Badge color="teal" size="xs" variant="filled">
                        Scanné !
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 mr-1" title="Lecteur code-barres actif">
                        <Barcode size={20} className="text-indigo-500" />
                      </div>
                    )
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  size="md"
                  radius="xl"
                  styles={{
                    input: {
                      backgroundColor: "#ffffff",
                      borderColor: barcodeScanSuccess ? "#10b981" : "#cbd5e1",
                      color: "#0f172a",
                      fontSize: "0.92rem",
                    },
                  }}
                />
              </div>

              {/* Raccourci Pesée / Balance Connectée (F4) */}
              <Button
                variant="light"
                color="teal"
                size="md"
                radius="xl"
                leftSection={<Scale size={18} />}
                onClick={() => handleOpenBalanceModal()}
                title="Peser un article / Connecter la Balance (F4)"
                className="border border-teal-200 bg-teal-50 text-teal-800 font-bold hover:bg-teal-100 shrink-0"
              >
                Peser <span className="hidden xl:inline text-[10px] ml-1 opacity-75 font-mono">(F4)</span>
              </Button>
            </div>

            {/* Notification de Scan Balance Variable */}
            {scaleBarcodeScanNotice && (
              <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800 shadow-2xs animate-pulse">
                <Scale size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">{scaleBarcodeScanNotice}</span>
              </div>
            )}

            {/* Filtres Catégories Rapides avec Défilement Fluide et Sans Troncature */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs"
                }`}
              >
                <Tag size={13} className={selectedCategory === "all" ? "text-white" : "text-indigo-500"} />
                <span>Tous</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold font-mono ${
                    selectedCategory === "all" ? "bg-indigo-800 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {products.length}
                </span>
              </button>
              {categories.map((c) => {
                const isSelected = selectedCategory === c;
                const count = categoryCounts[c] || 0;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs"
                    }`}
                  >
                    {getCategoryIcon(c)}
                    <span>{c}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold font-mono ${
                        isSelected ? "bg-indigo-800 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grille Tactile des Produits avec Miniatures Photos & Fallbacks */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                <Search size={36} className="opacity-40 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Aucun produit trouvé</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifiez votre recherche ou sélectionnez une autre catégorie.
                </p>
                {(searchQuery || selectedCategory !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-indigo-700 border border-slate-300 transition"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {filteredProducts.map((prod) => {
                  const inCart = currentTicket.items.find((i) => i.produitId === prod.id);
                  const isWeighed = prod.vendu_au_poids === 1 || prod.unite === "kg" || prod.unite === "g";
                  const catTheme = getCategoryVisualTheme(prod.categorie || "");

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (isWeighed) {
                          handleOpenBalanceModal(prod);
                        } else {
                          handleAddProduct(prod);
                        }
                      }}
                      className={`group relative rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md overflow-hidden ${
                        inCart
                          ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-400/40 shadow-sm"
                          : "bg-white border-slate-200/90 hover:border-indigo-400 hover:bg-slate-50/40"
                      }`}
                    >
                      {/* Badge quantité dans le panier */}
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full flex items-center justify-center shadow-md z-20 font-mono">
                          {inCart.quantite % 1 === 0 ? inCart.quantite : inCart.quantite.toFixed(2)} ×
                        </div>
                      )}

                      {/* 1. VISUEL PRODUIT : Photo réelle ou Dégradé de Catégorie avec Monogramme */}
                      <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-100">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.designation}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${catTheme.gradient} flex flex-col items-center justify-center p-2 relative`}
                          >
                            <div className="absolute top-2 left-2 p-1 rounded-md bg-white/80 shadow-2xs">
                              {getCategoryIcon(prod.categorie || "")}
                            </div>
                            <span
                              className={`text-2xl font-black font-mono tracking-wider ${catTheme.badgeText} opacity-80 group-hover:scale-110 transition-transform`}
                            >
                              {getProductMonogram(prod.designation, prod.ref)}
                            </span>
                          </div>
                        )}

                        {/* Badges flottants sur la photo (Ref + Stock/Poids) */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/95 text-slate-700 shadow-2xs border border-slate-200/60 truncate max-w-[85px]">
                            {prod.ref}
                          </span>

                          {isWeighed ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs flex items-center gap-0.5">
                              <Scale size={10} /> Poids
                            </span>
                          ) : prod.stock_actuel !== undefined ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs ${
                                prod.stock_actuel > 5
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : prod.stock_actuel > 0
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {prod.stock_actuel > 0 ? `Stk: ${prod.stock_actuel}` : "Épuisé"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* 2. INFOS DU PRODUIT */}
                      <div className="p-2.5 flex flex-col justify-between flex-1">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 line-clamp-2 leading-snug">
                          {prod.designation}
                        </h3>

                        {/* Prix TTC & Devise */}
                        <div className="flex items-baseline justify-between mt-2 pt-1.5 border-t border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            {isWeighed ? "DH/KG" : "TTC"}
                          </span>
                          <div className="text-right">
                            <span className="font-extrabold text-sm sm:text-base text-emerald-600 font-mono tracking-tight">
                              {formatNumber(prod.prix_ttc)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 ml-1">
                              DH{isWeighed ? "/kg" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* === SECTION DROITE : PANIER TICKET & FAST CHECKOUT === */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-white flex flex-col overflow-hidden border-l border-slate-200/90 shadow-sm">
          {/* Sélecteur Client & Vendeur & Bouton Vider */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200/90 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <Select
                  placeholder="Sélectionner Client"
                  leftSection={<UserRound size={14} className="text-slate-400" />}
                  data={[
                    { value: "0", label: "Client Comptoir (Standard)" },
                    ...clients.map((c) => ({
                      value: String(c.id),
                      label: `${c.name} ${c.fidelite_palier ? `[${c.fidelite_palier}]` : ""}`,
                    })),
                  ]}
                  value={currentTicket.clientId ? String(currentTicket.clientId) : "0"}
                  onChange={(val) => {
                    const cId = val && val !== "0" ? Number(val) : null;
                    const c = clients.find((client) => client.id === cId);
                    const cNom = c?.name || "Client Comptoir";
                    setTickets((prev) =>
                      prev.map((t) =>
                        t.id === activeTicketId ? { ...t, clientId: cId, clientNom: cNom } : t
                      )
                    );
                  }}
                  size="xs"
                  radius="md"
                  styles={{
                    input: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a" },
                  }}
                />
              </div>

              {commerciaux && commerciaux.length > 0 && (
                <div className="w-32">
                  <Select
                    placeholder="Vendeur"
                    clearable
                    data={commerciaux.map((com) => ({
                      value: String(com.id),
                      label: com.name.split(" ")[0] + (com.code ? ` (${com.code})` : ""),
                    }))}
                    value={currentTicket.commercialId ? String(currentTicket.commercialId) : null}
                    onChange={(val) => {
                      const commId = val ? Number(val) : null;
                      setTickets((prev) =>
                        prev.map((t) =>
                          t.id === activeTicketId ? { ...t, commercialId: commId } : t
                        )
                      );
                    }}
                    size="xs"
                    radius="md"
                    styles={{
                      input: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a" },
                    }}
                  />
                </div>
              )}

              <Button
                size="xs"
                variant="subtle"
                color="red"
                radius="md"
                leftSection={<Trash2 size={13} />}
                onClick={handleClearCart}
                disabled={currentTicket.items.length === 0}
                title="Vider tout le ticket en cours"
              >
                Vider
              </Button>
            </div>

            {/* Badge Fidélité Client si sélectionné */}
            {currentTicket.clientId && (() => {
              const selectedC = clients.find((c) => c.id === currentTicket.clientId);
              if (!selectedC) return null;
              const palier = selectedC.fidelite_palier || "Bronze";
              const badgeColor =
                palier === "VIP"
                  ? "purple"
                  : palier === "Gold"
                  ? "yellow"
                  : palier === "Silver"
                  ? "gray"
                  : "amber";

              return (
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-amber-500" />
                    <span className="text-slate-600 font-medium">Palier :</span>
                    <Badge size="xs" variant="light" color={badgeColor}>
                      {palier}
                    </Badge>
                  </div>
                  <div className="text-slate-700 font-medium">
                    Solde : <span className="text-emerald-600 font-bold font-mono">{selectedC.fidelite_points || 0}</span> pts
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Lignes du Panier */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-50/40">
            {currentTicket.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
                  <ShoppingCart size={32} className="stroke-[1.5]" />
                </div>
                <p className="text-sm font-bold text-slate-700">Ticket en cours vide</p>
                <p className="text-xs text-slate-500 max-w-[260px] mt-1 leading-relaxed">
                  Scannez un code-barres avec la douchette ou touchez un article du catalogue pour l&apos;ajouter.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[320px]">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
                    <Barcode size={13} className="text-indigo-600" /> Douchette active
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
                    <Scale size={13} className="text-teal-600" /> F4 : Pesée
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
                    <Banknote size={13} className="text-emerald-600" /> F8 : Espèces
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
                    <CreditCard size={13} className="text-blue-600" /> F9 : Carte
                  </span>
                </div>
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
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/50 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[70%]">
                          {item.designation}
                        </span>
                        {item.remisePourcent > 0 && (
                          <Badge size="xs" color="orange" variant="filled">
                            -{item.remisePourcent}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold">{formatNumber(item.prixUnitaireTtc)} DH</span> ×{" "}
                        <span className="font-bold text-slate-800 font-mono">
                          {item.quantite % 1 === 0 ? item.quantite : item.quantite.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    {/* Steppers de quantité ergonomiques */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 flex items-center justify-center font-bold transition border border-slate-200"
                        title="Diminuer quantité (-1)"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-black px-1 min-w-7 text-center font-mono text-slate-900">
                        {item.quantite % 1 === 0 ? item.quantite : item.quantite.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 flex items-center justify-center font-bold transition border border-slate-200"
                        title="Augmenter quantité (+1)"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="w-8 h-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 active:scale-95 flex items-center justify-center transition ml-1"
                        title="Supprimer la ligne"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Total de la ligne */}
                    <div className="text-right shrink-0 min-w-[70px]">
                      <div className="font-black text-xs sm:text-sm text-slate-900 font-mono">
                        {formatNumber(lineTotal)} <span className="text-[10px] text-slate-500 font-sans">DH</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clavier Tactile Numpad pour modifications rapides */}
          {selectedLineIndex !== null && currentTicket.items[selectedLineIndex] && (
            <div className="p-3 bg-slate-50/90 border-t border-slate-200 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-indigo-600">Ajuster ligne :</span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {currentTicket.items[selectedLineIndex].designation}
                  </span>
                </div>

                <SegmentedControl
                  size="xs"
                  radius="md"
                  value={numpadTarget}
                  onChange={(v: any) => {
                    setNumpadTarget(v);
                    setNumpadBuffer("");
                  }}
                  data={[
                    { label: "Quantité", value: "qty" },
                    { label: "Remise %", value: "discount" },
                  ]}
                  color="indigo"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {["7", "8", "9", "+1", "4", "5", "6", "+5", "1", "2", "3", "C", "0", ".", "00", "OK"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleNumpadPress(k)}
                    className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-95 ${
                      k === "OK"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        : k === "C"
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                        : k.startsWith("+")
                        ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/60"
                        : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Totaux Financiers du Ticket & Checkout */}
          <div className="p-3.5 bg-slate-50/90 border-t border-slate-200/90 shrink-0 space-y-2.5">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>Sous-total HT</span>
                <span className="font-semibold text-slate-800 font-mono">{formatNumber(ticketTotals.totalHt)} DH</span>
              </div>
              <div className="flex justify-between items-center">
                <span>TVA estimée</span>
                <span className="font-semibold text-slate-800 font-mono">{formatNumber(ticketTotals.totalTva)} DH</span>
              </div>
              {currentTicket.remiseGlobale > 0 && (
                <div className="flex justify-between items-center text-amber-600 font-semibold">
                  <span>Remise globale</span>
                  <span className="font-bold font-mono">- {formatNumber(currentTicket.remiseGlobale)} DH</span>
                </div>
              )}
            </div>

            {/* RACCOURCIS RAPIDES COUPURES ESPÈCES (EXACT, 20 DH, 50 DH, 100 DH, 200 DH) */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" />
                  Coupures reçues
                </span>
                {quickChangeDue !== null && (
                  <span className="text-[11px] font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Rendu : {formatNumber(quickChangeDue)} DH
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  disabled={currentTicket.items.length === 0}
                  onClick={() => handleSelectQuickCash("exact")}
                  className={`py-1.5 px-1 rounded-xl text-xs font-black transition active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                    quickCashTender === "exact"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 shadow-2xs"
                  }`}
                  title="Règlement du montant exact"
                >
                  Exact
                </button>
                {[20, 50, 100, 200].map((denom) => (
                  <button
                    key={denom}
                    type="button"
                    disabled={currentTicket.items.length === 0}
                    onClick={() => handleSelectQuickCash(denom)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-black font-mono transition active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                      quickCashTender === denom
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 shadow-2xs"
                    }`}
                    title={`Billet de ${denom} DH`}
                  >
                    {denom} DH
                  </button>
                ))}
              </div>
            </div>

            {/* TOTAL À PAYER & BOUTONS D'ENCAISSEMENT DIRECT */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-white border border-indigo-200/80 shadow-sm flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
                  NET À PAYER ({ticketTotals.totalItems} art.)
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatNumber(ticketTotals.totalTtc)}
                  </span>
                  <span className="text-sm font-bold text-indigo-600">DH</span>
                </div>
              </div>

              {/* Raccourci rapide Espèces / Carte / Mixte */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPayment("especes")}
                  disabled={currentTicket.items.length === 0}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="Encaisser en Espèces (F8)"
                >
                  <Banknote size={17} />
                  <span>Espèces</span>
                  <span className="hidden xl:inline text-[10px] opacity-80 font-mono">(F8)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPayment("carte")}
                  disabled={currentTicket.items.length === 0}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="Encaisser par Carte TPE (F9)"
                >
                  <CreditCard size={17} />
                  <span>Carte</span>
                  <span className="hidden xl:inline text-[10px] opacity-80 font-mono">(F9)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPayment("mixte")}
                  disabled={currentTicket.items.length === 0}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition active:scale-95 cursor-pointer disabled:cursor-not-allowed border border-slate-200 shadow-2xs"
                  title="Autres modes / Paiement fractionné"
                >
                  <Layers size={17} />
                </button>
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
            <SimpleGrid cols={3} spacing="xs">
              {[
                { id: "especes", label: "Espèces", icon: Banknote, color: "teal" },
                { id: "carte", label: "Carte TPE", icon: CreditCard, color: "blue" },
                { id: "bon_achat", label: "Bon d'Achat", icon: Tag, color: "grape" },
                { id: "cheque", label: "Chèque", icon: Receipt, color: "orange" },
                { id: "virement", label: "Virement", icon: FileSpreadsheet, color: "indigo" },
                { id: "mixte", label: "Multi-Paiement", icon: Layers, color: "violet" },
              ].map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={paymentMode === m.id ? "filled" : "light"}
                  color={m.color}
                  onClick={() => {
                    const newMode = m.id as CaisseModeReglement;
                    setPaymentMode(newMode);
                    if (newMode === "mixte") {
                      setSplitMontantDraft(remainingSplitDue > 0 ? remainingSplitDue : ticketTotals.totalTtc);
                    }
                  }}
                  leftSection={<m.icon size={16} />}
                >
                  {m.label}
                </Button>
              ))}
            </SimpleGrid>
          </div>

          {/* CAS 1 : MULTI-PAIEMENT (RÈGLEMENT MIXTE) */}
          {paymentMode === "mixte" ? (
            <div className="space-y-3">
              {/* Synthèse Reste Dû / Total Réglé */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Dû</span>
                  <span className="text-sm font-black text-slate-900">{formatNumber(ticketTotals.totalTtc)} DH</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Réglé</span>
                  <span className="text-sm font-black text-emerald-600">{formatNumber(totalSplitRegle)} DH</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Reste à Payer</span>
                  <span className={`text-sm font-black ${remainingSplitDue > 0.05 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(remainingSplitDue)} DH
                  </span>
                </div>
              </div>

              {/* Liste des Paiements Déjà Enregistrés */}
              {splitPayments.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table striped highlightOnHover verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr className="bg-slate-50 text-[11px] text-slate-600">
                        <Table.Th>Mode</Table.Th>
                        <Table.Th>Montant</Table.Th>
                        <Table.Th>Réf / Détail</Table.Th>
                        <Table.Th style={{ width: 40 }}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {splitPayments.map((p, pIdx) => (
                        <Table.Tr key={pIdx} className="text-xs">
                          <Table.Td>
                            <Badge
                              size="sm"
                              variant="light"
                              color={
                                p.mode === "especes"
                                  ? "teal"
                                  : p.mode === "carte"
                                  ? "blue"
                                  : p.mode === "bon_achat"
                                  ? "grape"
                                  : p.mode === "cheque"
                                  ? "orange"
                                  : "indigo"
                              }
                            >
                              {p.mode === "especes"
                                ? "Espèces"
                                : p.mode === "carte"
                                ? "Carte TPE"
                                : p.mode === "bon_achat"
                                ? "Bon d'Achat"
                                : p.mode === "cheque"
                                ? "Chèque"
                                : "Virement"}
                            </Badge>
                          </Table.Td>
                          <Table.Td className="font-bold text-slate-900">
                            {formatNumber(p.montant)} DH
                          </Table.Td>
                          <Table.Td className="text-slate-500 text-[11px]">
                            {p.reference || "-"}
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              onClick={() => handleRemoveSplitPayment(pIdx)}
                            >
                              <Trash2 size={13} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              )}

              {/* Formulaire d'ajout d'une tranche de règlement */}
              {remainingSplitDue > 0.01 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <Text size="xs" fw={700} c="indigo.7">
                    + Ajouter un mode de paiement partiel :
                  </Text>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Mode"
                      size="xs"
                      value={splitModeDraft}
                      onChange={(v) => v && setSplitModeDraft(v as Exclude<CaisseModeReglement, "mixte">)}
                      data={[
                        { value: "especes", label: "💵 Espèces" },
                        { value: "carte", label: "💳 Carte TPE" },
                        { value: "bon_achat", label: "🏷️ Bon d'Achat" },
                        { value: "cheque", label: "📝 Chèque" },
                        { value: "virement", label: "🏦 Virement" },
                      ]}
                    />
                    <NumberInput
                      label="Montant (DH)"
                      size="xs"
                      value={splitMontantDraft}
                      onChange={setSplitMontantDraft}
                      min={0.1}
                      max={ticketTotals.totalTtc}
                    />
                  </div>

                  <div className="flex gap-2 items-end">
                    <TextInput
                      label="Réf / N° de bon / N° chèque (optionnel)"
                      placeholder="Ex: BON-2026-X88, TPE-98234, CHQ-5542..."
                      size="xs"
                      value={splitRefDraft}
                      onChange={(e) => setSplitRefDraft(e.currentTarget.value)}
                      className="flex-1"
                    />
                    {splitModeDraft === "bon_achat" && (
                      <Button
                        size="xs"
                        color="grape"
                        variant="light"
                        loading={bonAchatCheckStatus.loading}
                        disabled={!splitRefDraft.trim()}
                        onClick={async () => {
                          await handleCheckBonAchat(splitRefDraft);
                        }}
                      >
                        Vérifier
                      </Button>
                    )}
                  </div>

                  {splitModeDraft === "bon_achat" && bonAchatCheckStatus.valid === true && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-emerald-700 font-bold">Bon Valide : </span>
                        <span className="text-slate-900 font-black">{formatNumber(bonAchatCheckStatus.montantRestant || 0)} DH disponible</span>
                        {bonAchatCheckStatus.clientNom && <span className="text-slate-500 block text-[11px]">Client: {bonAchatCheckStatus.clientNom}</span>}
                      </div>
                      <Button
                        size="compact-xs"
                        color="teal"
                        onClick={() => {
                          const maxApp = Math.min(
                            remainingSplitDue,
                            bonAchatCheckStatus.montantRestant || remainingSplitDue
                          );
                          setSplitMontantDraft(maxApp);
                        }}
                      >
                        Appliquer
                      </Button>
                    </div>
                  )}

                  {splitModeDraft === "bon_achat" && bonAchatCheckStatus.valid === false && (
                    <Text size="xs" c="red" fw={600}>
                      ⚠️ {bonAchatCheckStatus.message}
                    </Text>
                  )}

                  <Button
                    size="xs"
                    fullWidth
                    color="indigo"
                    variant="light"
                    leftSection={<Plus size={14} />}
                    onClick={handleAddSplitPayment}
                    disabled={!splitMontantDraft || Number(splitMontantDraft) <= 0}
                  >
                    Ajouter ce règlement ({formatNumber(Number(splitMontantDraft) || 0)} DH)
                  </Button>
                </div>
              )}
            </div>
          ) : paymentMode === "especes" ? (
            /* CAS 2 : PAIEMENT EN ESPÈCES AVEC RACCOURCIS COUPURES */
            <div className="space-y-3">
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
            </div>
          ) : paymentMode === "bon_achat" ? (
            /* CAS 3 : PAIEMENT INTÉGRAL PAR BON D'ACHAT / CHÈQUE CADEAU */
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-grape-600">
                <Tag size={18} />
                <Text size="xs" fw={700}>
                  Règlement par Bon d&apos;Achat ou Titre Cadeau
                </Text>
              </div>
              <div className="flex gap-2 items-end">
                <TextInput
                  label="Référence / Code du Bon d'Achat"
                  placeholder="Ex: BON-2026-X88..."
                  value={bonAchatReference}
                  onChange={(e) => {
                    setBonAchatReference(e.currentTarget.value);
                    if (bonAchatCheckStatus.checkedCode !== e.currentTarget.value) {
                      setBonAchatCheckStatus({ loading: false });
                    }
                  }}
                  size="sm"
                  radius="md"
                  className="flex-1"
                  required
                />
                <Button
                  size="sm"
                  color="grape"
                  variant="light"
                  onClick={() => handleCheckBonAchat(bonAchatReference)}
                  loading={bonAchatCheckStatus.loading}
                  disabled={!bonAchatReference.trim()}
                >
                  Vérifier
                </Button>
              </div>

              {/* Résultat de la vérification */}
              {bonAchatCheckStatus.valid === true && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 font-bold">✓ Bon d&apos;Achat Actif</span>
                    <span className="text-slate-900 font-black text-sm">
                      Solde : {formatNumber(bonAchatCheckStatus.montantRestant || 0)} DH
                    </span>
                  </div>
                  {bonAchatCheckStatus.clientNom && (
                    <div className="text-slate-500 text-[11px]">Client : {bonAchatCheckStatus.clientNom}</div>
                  )}
                  {Number(bonAchatCheckStatus.montantRestant) < ticketTotals.totalTtc && (
                    <div className="text-amber-600 font-semibold text-[11px] mt-1">
                      ⚠️ Le solde de ce bon ({formatNumber(bonAchatCheckStatus.montantRestant || 0)} DH) ne couvre pas la totalité du ticket ({formatNumber(ticketTotals.totalTtc)} DH). Privilégiez le mode Multi-Paiement.
                    </div>
                  )}
                </div>
              )}

              {bonAchatCheckStatus.valid === false && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">
                  ⚠️ {bonAchatCheckStatus.message}
                </div>
              )}

              <Text size="xs" c="dimmed">
                Le montant total de <strong>{formatNumber(ticketTotals.totalTtc)} DH</strong> sera débité sur ce bon d&apos;achat.
              </Text>
            </div>
          ) : (
            /* CAS 4 : CARTE TPE / CHÈQUE / VIREMENT */
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Text size="xs" c="dimmed">
                Montant à percevoir via {paymentMode === "carte" ? "TPE Carte Bancaire" : paymentMode === "cheque" ? "Chèque Bancaire" : "Virement"} :
              </Text>
              <div className="text-xl font-black text-slate-900">
                {formatNumber(ticketTotals.totalTtc)} DH
              </div>
              <TextInput
                label="Référence Transaction / Numéro (Optionnel)"
                placeholder="Ex: Autorisation TPE, N° Chèque..."
                value={splitRefDraft}
                onChange={(e) => setSplitRefDraft(e.currentTarget.value)}
                size="sm"
                radius="md"
              />
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            radius="md"
            color="teal"
            leftSection={<CheckCircle2 size={20} />}
            loading={isSubmittingTicket}
            onClick={handleFinalizeTicket}
            disabled={paymentMode === "mixte" && (remainingSplitDue > 0.05 || splitPayments.length === 0)}
            mt="xs"
          >
            {paymentMode === "mixte"
              ? `Valider l'encaissement mixte (${formatNumber(totalSplitRegle)} DH)`
              : !isOnline
              ? `Encaisser Hors-Ligne (${formatNumber(ticketTotals.totalTtc)} DH)`
              : `Valider l'encaissement (${formatNumber(ticketTotals.totalTtc)} DH)`}
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
            {lastCompletedTicket?.id && lastCompletedTicket.id < 0 && (
              <Badge size="md" color="orange" variant="light" mt="xs">
                💾 Encaissé Hors-Ligne (Stocké localement)
              </Badge>
            )}
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

      {/* 6. MODALE BALANCE CONNECTÉE / PESÉE TACTILE */}
      <BalanceModal
        opened={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setBalanceTargetProduct(null);
        }}
        products={products}
        preselectedProduct={balanceTargetProduct}
        onAddWeighedItem={handleAddWeighedItem}
      />

      {/* 7. MODALE GESTION DES RETOURS & ÉMISSION D'AVOIRS / BONS D'ACHAT */}
      <RetourModal
        opened={isRetourModalOpen}
        onClose={() => setIsRetourModalOpen(false)}
        sessionId={activeSession?.id || 0}
        branchId={selectedBranchId}
      />
    </div>
  );
}
