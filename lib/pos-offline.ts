"use client";

import { type PosProductItem } from "@/components/pos/pos-terminal";
import { type OfflineTicketRecord } from "@/lib/types";

const DB_NAME = "haloui_pos_offline_v1";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialise ou retourne l'instance IndexedDB locale pour le mode hors-ligne.
 */
export function getOfflineDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB non disponible dans cet environnement"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Store 1: Catalogue Produits Hors-Ligne
        if (!db.objectStoreNames.contains("catalog")) {
          db.createObjectStore("catalog", { keyPath: "id" });
        }
        // Store 2: File d'attente des Tickets Encaissés Hors-Ligne
        if (!db.objectStoreNames.contains("queued_tickets")) {
          const ticketStore = db.createObjectStore("queued_tickets", { keyPath: "offlineId" });
          ticketStore.createIndex("timestamp", "timestamp", { unique: false });
        }
        // Store 3: Clés de Métadonnées / Session
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

/**
 * Enregistre le catalogue produit dans IndexedDB pour la recherche et le scan hors-ligne.
 */
export async function saveOfflineCatalog(products: PosProductItem[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction(["catalog", "meta"], "readwrite");
    const catalogStore = tx.objectStore("catalog");
    const metaStore = tx.objectStore("meta");

    // Vider puis insérer
    catalogStore.clear();
    for (const p of products) {
      catalogStore.put(p);
    }
    metaStore.put({ key: "catalog_last_cached", value: Date.now() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[OfflinePOS] Échec de la mise en cache du catalogue:", err);
  }
}

/**
 * Récupère le catalogue produits mis en cache locale.
 */
export async function getOfflineCatalog(): Promise<PosProductItem[]> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction("catalog", "readonly");
    const store = tx.objectStore("catalog");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as PosProductItem[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Ajoute un ticket encaissé hors-ligne dans la file d'attente locale.
 */
export async function enqueueOfflineTicket(ticket: OfflineTicketRecord): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction("queued_tickets", "readwrite");
  const store = tx.objectStore("queued_tickets");
  store.put(ticket);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Récupère tous les tickets en attente de synchronisation.
 */
export async function getQueuedOfflineTickets(): Promise<OfflineTicketRecord[]> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction("queued_tickets", "readonly");
    const store = tx.objectStore("queued_tickets");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OfflineTicketRecord[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Supprime un ticket de la file locale après synchronisation réussie.
 */
export async function removeOfflineTicket(offlineId: string): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction("queued_tickets", "readwrite");
    const store = tx.objectStore("queued_tickets");
    store.delete(offlineId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[OfflinePOS] Échec suppression ticket synchronisé:", err);
  }
}

/**
 * Vide complètement la file des tickets hors-ligne.
 */
export async function clearOfflineTickets(): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction("queued_tickets", "readwrite");
    const store = tx.objectStore("queued_tickets");
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    //
  }
}

/**
 * Retourne le nombre de tickets en attente de synchronisation.
 */
export async function getOfflineQueueCount(): Promise<number> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction("queued_tickets", "readonly");
    const store = tx.objectStore("queued_tickets");
    const request = store.count();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Enregistre le service worker du terminal POS pour le cache autonome PWA.
 */
export function registerPosServiceWorker(): void {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker POS actif avec succès (Scope:", reg.scope, ")");
        })
        .catch((err) => {
          console.warn("[PWA] Échec enregistrement Service Worker:", err);
        });
    });
  }
}
