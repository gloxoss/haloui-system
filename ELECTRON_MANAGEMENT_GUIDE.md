# Haloui System - Guide complet de gestion de l'application desktop (Electron)

Version documentee: `0.1.0`  
Projet: `Haloui System`  
Produit Windows: `Haloui System`

## 1. Vue d'ensemble

Haloui System existe aujourd'hui sous 2 formes:

1. `Mode local navigateur`
   - l'application tourne en local sur `http://localhost:3000`
   - on peut la lancer avec `start.bat`
   - utile pour le developpement ou une installation simple

2. `Mode desktop Electron`
   - Electron ouvre la meme application dans une fenetre desktop
   - un serveur local est lance en arriere-plan automatiquement
   - les donnees sont stockees dans le dossier Windows de l'utilisateur
   - c'est le mode le plus propre pour livrer au client

Important:
- ce n'est pas une autre application separee
- Electron emballe simplement l'application Next.js existante
- la logique metier, la base SQLite, les utilisateurs et les impressions restent les memes

---

## 2. Architecture actuelle

### 2.1 Stack

- `Next.js 15`
- `TypeScript`
- `SQLite (better-sqlite3)`
- `NextAuth`
- `TailwindCSS`
- `Electron`

### 2.2 Ce que fait Electron

Electron:
- cree une fenetre desktop Windows
- demarre un serveur local sur un port libre
- pointe la fenetre vers ce serveur local
- force des chemins separes pour:
  - la base de donnees
  - les sauvegardes
  - les uploads
- tente d'importer les anciennes donnees si une ancienne installation est detectee

### 2.3 Donnees principales

L'application gere notamment:
- produits
- clients
- documents: devis, factures, bons
- personnel
- attestations
- chiffre d'affaires
- utilisateurs
- impressions PDF / papier

---

## 3. Roles et acces

## 3.1 `superadmin`

Le `superadmin` est reserve au developpeur / proprietaire technique.

Caracteristiques:
- utilisateur cache
- n'apparait pas dans la page `Utilisateurs`
- seul role autorise a ouvrir `Parametres`
- seul role autorise a:
  - exporter la base
  - exporter SQL / CSV / Excel
  - faire une sauvegarde manuelle
  - reinitialiser la base metier
  - activer / desactiver les modules
  - modifier les parametres sensibles

Important:
- un `admin` ne peut pas creer de `superadmin`
- un `admin` ne peut pas donner le role `superadmin`
- il doit toujours n'y avoir qu'un seul superadmin cache

Configuration actuelle si elle n'a pas encore ete changee:
- username: `haloui-dev`
- password: `HalouiDev@2026`
- name: `Superadmin Haloui`

Ces valeurs viennent de `.env.local`.

## 3.2 `admin`

L'`admin` gere l'exploitation normale:
- utilisateurs normaux
- clients
- produits
- documents
- personnel
- chiffre d'affaires

Mais il n'a pas acces a:
- `Parametres`
- export complet base / SQL / CSV / Excel
- reset metier
- creation d'un `superadmin`

Compte admin standard seed si absent:
- username: `admin`
- mot de passe temporaire par defaut: `admin123`

## 3.3 `user`

Le `user` est un utilisateur simple:
- utilise les modules actifs
- ne gere pas les parametres sensibles
- n'administre pas l'application

---

## 4. Lancement de l'application

## 4.1 Lancement simple en local via `start.bat`

Fichier:
- [start.bat](C:\Users\oussama\Desktop\haloui system\start.bat)

Ce script:
1. installe les dependances si `node_modules` manque
2. fait un `build` si `.next\BUILD_ID` manque
3. lance `npm run start`
4. ouvre `http://localhost:3000`

Usage:

```bat
double-clic sur start.bat
```

Cas d'usage:
- exploitation locale simple
- mode navigateur
- pas un vrai package desktop

## 4.2 Lancement developpement web

Commande:

```powershell
npm run dev
```

Resultat:
- lance Next.js en developpement
- acces via navigateur sur localhost

## 4.3 Lancement Electron en developpement

Commande:

```powershell
npm run desktop:dev
```

Resultat:
- Electron ouvre une fenetre desktop
- un serveur local de dev est lance
- les donnees sont stockees dans un espace desktop de dev dedie

Emplacement Windows en dev Electron:
- `%APPDATA%\Haloui System Dev\`

## 4.4 Build desktop Electron

Commande:

```powershell
npm run desktop:build
```

Ce que fait la commande:
1. `npm run build`
2. prepare le dossier desktop autonome
3. copie:
   - `.next/standalone`
   - `.next/static`
   - `public`
   - `db/schema.sql`
   - `electron`
   - un runtime Node embarque

Sortie:
- `desktop-dist/app`

## 4.5 Creation de l'installateur Windows

Commande:

```powershell
npm run desktop:dist
```

Sortie:
- `desktop-dist/release`

Format:
- installateur `NSIS`

Comportement d'installation:
- installation Windows classique
- raccourci bureau possible
- dossier d'installation modifiable

## 4.6 Creation d'une version ZIP portable

Quand utiliser le ZIP:
- si vous voulez envoyer une version portable sans installation
- si vous voulez tester l'application en la decomprimant simplement
- si vous voulez garder une copie archivee de la version desktop

Important:
- le ZIP portable ne contient pas les donnees de travail du client
- les donnees restent dans `%APPDATA%\Haloui System\`
- il faut attendre la fin complete de l'archivage avant d'ouvrir le fichier ZIP
- si `tar.exe` ou un outil d'archivage est encore en cours, le ZIP peut sembler corrompu alors qu'il est juste encore en train d'etre ecrit

Procedure recommandee:

1. generer d'abord la version desktop:

```powershell
npm run desktop:dist
```

2. creer un dossier portable de staging puis le zipper:

```powershell
$release = "desktop-dist\\release"
$stage = Join-Path $release "Haloui-System-0.1.0-win-x64"
$zip = Join-Path $release "Haloui-System-0.1.0-win-x64.zip"

if (Test-Path $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}

New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item (Join-Path $release "win-unpacked\\*") -Destination $stage -Recurse -Force

if (Test-Path $zip) {
  Remove-Item -LiteralPath $zip -Force
}

tar.exe -a -cf $zip -C $release "Haloui-System-0.1.0-win-x64"
```

3. recuperer le ZIP ici:
- `desktop-dist\release\Haloui-System-0.1.0-win-x64.zip`

Apres extraction, le client lance:
- `Haloui-System-0.1.0-win-x64\Haloui System.exe`

Conseil:
- pour un client normal, preferer l'installateur `.exe`
- garder le ZIP pour le mode portable, le support, ou l'archivage
- si vous transferez une installation existante, copier aussi la base SQLite et les uploads

Ce qu'il faut transferer en plus si vous voulez aussi les donnees:
- `%APPDATA%\Haloui System\data\haloui.db`
- `%APPDATA%\Haloui System\uploads\`

---

## 5. Emplacements importants

## 5.1 En mode projet local

Depuis ce projet:
- base SQLite: [data\haloui.db](C:\Users\oussama\Desktop\haloui system\data\haloui.db)
- sauvegardes: [data\backups](C:\Users\oussama\Desktop\haloui system\data\backups)
- uploads: [public\uploads](C:\Users\oussama\Desktop\haloui system\public\uploads)

Sous-dossiers uploads:
- `public\uploads\logos`
- `public\uploads\employees`

## 5.2 En mode Electron package

Electron utilise le dossier utilisateur Windows, pas le dossier du code source.

Emplacements typiques:
- base: `%APPDATA%\Haloui System\data\haloui.db`
- sauvegardes: `%APPDATA%\Haloui System\data\backups\`
- uploads: `%APPDATA%\Haloui System\uploads\`

Sous-dossiers uploads:
- `%APPDATA%\Haloui System\uploads\logos`
- `%APPDATA%\Haloui System\uploads\employees`

## 5.3 En mode Electron dev

- `%APPDATA%\Haloui System Dev\data\haloui.db`
- `%APPDATA%\Haloui System Dev\data\backups\`
- `%APPDATA%\Haloui System Dev\uploads\`

---

## 6. Variables d'environnement importantes

Fichier:
- [\.env.local](C:\Users\oussama\Desktop\haloui system\.env.local)

Variables utiles:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
HALOUI_SUPERADMIN_USERNAME=haloui-dev
HALOUI_SUPERADMIN_PASSWORD=HalouiDev@2026
HALOUI_SUPERADMIN_NAME=Superadmin Haloui
```

Notes:
- `NEXTAUTH_SECRET` doit rester prive
- les credentials superadmin doivent idealement etre changes avant livraison finale
- en mode Electron, `NEXTAUTH_URL` est automatiquement surcharge a runtime avec le bon port local

---

## 7. Gestion quotidienne de l'application

## 7.1 Connexion

Types de connexion:
- `superadmin`: maintenance technique
- `admin`: gestion interne
- `user`: utilisation metier

## 7.2 Page `Parametres`

Acces:
- `superadmin` uniquement

Cette page centralise:
- infos societe
- textes d'attestations
- activation / desactivation des services
- exports
- sauvegarde manuelle
- reset metier
- infos de version
- instructions de mise a jour

## 7.3 Activation / desactivation des modules

Le superadmin peut activer ou masquer des services depuis `Parametres`.

Modules disponibles aujourd'hui:
- `devis`
- `factures`
- `bons_livraison`
- `bons_sortie`
- `bons_commande`
- `produits`
- `clients`
- `fournisseurs`
- `personnel`
- `attestations`
- `chiffre_affaires`
- `utilisateurs`

Etat par defaut important:
- `fournisseurs` est desactive par defaut

Effet:
- navigation masquee
- pages masquees
- certains boutons et actions caches

---

## 8. Sauvegardes et exports

## 8.1 Sauvegarde automatique

Au premier lancement de la journee, l'application cree une sauvegarde automatique si elle n'existe pas deja pour la date du jour.

Nom:
- `haloui-YYYY-MM-DD.db`

Dossier:
- `data/backups`
- ou le dossier Electron equivalent dans `%APPDATA%`

## 8.2 Sauvegarde manuelle

Depuis `Parametres`, le superadmin peut lancer une sauvegarde manuelle.

Technique utilisee:
- `VACUUM INTO`

Avantage:
- la sauvegarde SQLite est propre
- elle n'est pas un simple copier-coller risquant de capturer un etat partiel

## 8.3 Exports disponibles depuis `Parametres`

Acces:
- `superadmin` uniquement

Formats disponibles:
- export `SQLite`
- export `SQL`
- export `Excel (.xlsx)`
- export `CSV` par dataset

Datasets CSV disponibles:
- `clients`
- `produits`
- `documents`
- `document_lignes`
- `employes`
- `chiffre_affaires`

## 8.4 Quand utiliser quel export

Utiliser `SQLite` si:
- vous voulez cloner l'application a l'identique
- vous voulez restaurer vite
- vous voulez migrer vers une autre machine Haloui System

Utiliser `SQL` si:
- vous voulez relire ou archiver les donnees sous forme script
- vous voulez reinjecter les tables ailleurs

Utiliser `Excel` si:
- vous voulez une version praticable par un utilisateur bureautique
- vous voulez envoyer un export lisible au client

Utiliser `CSV` si:
- vous voulez integrer les donnees dans un autre logiciel
- vous voulez retraiter par table

---

## 9. Reset de la base metier

Action disponible:
- `Reinitialiser la base metier`

Acces:
- `superadmin` uniquement

Ce que fait le reset:
1. cree une sauvegarde
2. supprime les donnees metier
3. garde les utilisateurs
4. remet l'application dans un etat propre de base

Les utilisateurs sont conserves:
- `superadmin`
- `admin`
- `user`

Les donnees metier actuellement reinitialisees:
- audit log
- chiffre d'affaires
- attestations
- employes
- lignes de documents
- documents
- numerotation
- produits
- clients
- fournisseurs
- branches
- company
- `app_settings` de fonctionnalites

Puis l'application reseed:
- la societe de base
- les magasins de base
- les feature flags par defaut

A utiliser seulement:
- avant une nouvelle livraison propre
- avant un redemarrage complet de la demo
- si le client veut repartir d'une base vide sans perdre les comptes utilisateurs

---

## 10. Mise a jour de l'application

## 10.1 Cas A - installation locale via projet / `start.bat`

Si le client utilise directement le dossier projet:

1. fermer l'application
2. sauvegarder:
   - `data\haloui.db`
   - `public\uploads\`
   - `.env.local`
3. remplacer les fichiers du code par la nouvelle version
4. remettre les sauvegardes si besoin
5. lancer:

```powershell
npm install
npm run build
```

6. relancer avec `start.bat`

Important:
- ne pas ecraser `data\haloui.db` si vous voulez garder les donnees
- ne pas perdre `public\uploads`
- garder `.env.local`

## 10.2 Cas B - mise a jour Electron package

Processus recommande:

1. sur la machine de dev:

```powershell
npm install
npm run build
npm run desktop:dist
```

2. recuperer l'installateur dans:
- [desktop-dist\release](C:\Users\oussama\Desktop\haloui system\desktop-dist\release)

Option supplementaire:
- si vous voulez une version portable sans installation, creer aussi le ZIP avec la procedure de la section `4.6`

3. sur la machine du client:
- fermer l'application
- lancer le nouvel installateur
- installer par-dessus l'ancienne version

Pourquoi les donnees restent:
- la base et les uploads sont dans `%APPDATA%\Haloui System\`
- ils ne sont pas stockes dans le dossier du programme lui-meme

## 10.3 Cas C - migration vers une autre machine

Option 1, la plus propre:
- export `SQLite`
- copier aussi les uploads si necessaire

Option 2, manuelle:
- copier:
  - `haloui.db`
  - le dossier `uploads`

Sur la nouvelle machine Electron:
- installer l'application
- fermer l'application
- coller:
  - la base dans `%APPDATA%\Haloui System\data\`
  - les uploads dans `%APPDATA%\Haloui System\uploads\`

## 10.4 Migration auto depuis une ancienne installation

Au premier lancement Electron:
- l'application cherche une ancienne installation locale
- si elle trouve `data\haloui.db` ou `public\uploads`, elle tente de les importer
- sinon elle peut demander de choisir l'ancien dossier

Un etat de migration est memorise dans:
- `migration-state.json` dans le dossier `userData`

---

## 11. Logos, pieces jointes et uploads

Les logos et photos employes sont stockes dans les uploads.

Types de fichiers courants:
- logos
- photos employes

Conseil:
- pour un transfert complet, toujours copier:
  - la base
  - le dossier uploads

Sinon:
- les chemins en base peuvent exister
- mais les fichiers reellement pointes peuvent manquer

---

## 12. Gestion des utilisateurs

## 12.1 Ce que l'admin peut faire

L'admin peut:
- creer un utilisateur
- activer / desactiver un utilisateur
- changer un role `admin` ou `user`
- reinitialiser le mot de passe d'un utilisateur standard

## 12.2 Ce que l'admin ne peut pas faire

L'admin ne peut pas:
- voir le `superadmin` cache
- creer un `superadmin`
- transformer un utilisateur en `superadmin`
- ouvrir `Parametres`

## 12.3 Gestion du compte superadmin

Le superadmin est gere par configuration, pas par l'interface.

Si vous voulez changer ses identifiants:
1. modifier `.env.local`
2. redemarrer l'application

Variables a modifier:

```env
HALOUI_SUPERADMIN_USERNAME=...
HALOUI_SUPERADMIN_PASSWORD=...
HALOUI_SUPERADMIN_NAME=...
```

---

## 13. Impression, PDF et documents

Le moteur d'impression fonctionne pareil en mode navigateur et en mode Electron.

Les documents peuvent etre:
- previsualises
- imprimes
- exportes en PDF via la boite d'impression Windows / Chrome

Conseils:
- utiliser Chrome ou la fenetre Electron standard pour les apercus
- desactiver `Headers and footers` dans la boite d'impression PDF si besoin
- si un document est trop long, reduire les lignes vides et verifier la structure du template

---

## 14. Commandes utiles pour le developpeur

## 14.1 Demarrage

```powershell
npm install
npm run dev
```

## 14.2 Build web

```powershell
npm run build
npm run start
```

## 14.3 Electron dev

```powershell
npm run desktop:dev
```

## 14.4 Electron build

```powershell
npm run desktop:build
```

## 14.5 Installateur Windows

```powershell
npm run desktop:dist
```

## 14.6 ZIP portable Windows

```powershell
$release = "desktop-dist\\release"
$stage = Join-Path $release "Haloui-System-0.1.0-win-x64"
$zip = Join-Path $release "Haloui-System-0.1.0-win-x64.zip"

if (Test-Path $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}

New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item (Join-Path $release "win-unpacked\\*") -Destination $stage -Recurse -Force

if (Test-Path $zip) {
  Remove-Item -LiteralPath $zip -Force
}

tar.exe -a -cf $zip -C $release "Haloui-System-0.1.0-win-x64"
```

## 14.7 Verification TypeScript

```powershell
npx tsc --noEmit
```

---

## 15. Diagnostic et depannage

## 15.1 L'application ne demarre pas

Verifier:
- Node.js installe
- dependances installees
- `npm run build` sans erreur
- `.env.local` present
- port localhost libre

## 15.2 La page charge mais la connexion echoue

Verifier:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- presence de `haloui.db`
- integrite de la table `users`

## 15.3 Le logo n'apparait pas

Verifier:
- `company.logo_path` en base
- presence du fichier dans `uploads/logos` ou `public/assets`
- copie correcte des uploads lors d'une migration

## 15.4 Les donnees ont disparu apres une mise a jour

Verifier d'abord:
- `%APPDATA%\Haloui System\data\haloui.db`
- `%APPDATA%\Haloui System\uploads\`
- `data/backups`

Ne pas paniquer:
- les sauvegardes auto quotidiennes existent souvent deja
- le reset metier cree une sauvegarde avant d'effacer

## 15.5 Le client change de PC

Procedure recommandee:
1. faire une sauvegarde manuelle
2. exporter SQLite
3. copier les uploads
4. installer la nouvelle version sur le nouveau PC
5. remettre base + uploads

---

## 16. Checklist de livraison Electron

Avant de livrer une nouvelle version:

- `npm install`
- `npm run build`
- `npx tsc --noEmit`
- verifier la connexion `superadmin`
- verifier la page `Parametres`
- verifier l'export SQLite
- verifier la sauvegarde manuelle
- verifier le reset metier sur une copie de test
- verifier l'impression d'un devis, d'une facture, d'un bon, d'une fiche personnel et d'une attestation
- lancer `npm run desktop:dist`
- tester l'installateur genere
- si besoin portable: generer `Haloui-System-0.1.0-win-x64.zip`
- verifier que le ZIP s'ouvre seulement apres la fin complete de `tar.exe`

---

## 17. Recommandation d'exploitation

Pour le client final, la meilleure organisation est:

1. utiliser la version Electron installee
2. garder le compte `superadmin` pour vous uniquement
3. laisser le client travailler avec `admin` et `user`
4. faire une sauvegarde manuelle avant chaque grosse mise a jour
5. conserver aussi une copie de:
   - `haloui.db`
   - `uploads`
   - `.env.local` si la machine est en mode projet local

---

## 18. Fichiers de reference du projet

Fichiers utiles:
- [package.json](C:\Users\oussama\Desktop\haloui system\package.json)
- [start.bat](C:\Users\oussama\Desktop\haloui system\start.bat)
- [electron\main.cjs](C:\Users\oussama\Desktop\haloui system\electron\main.cjs)
- [electron\dev.cjs](C:\Users\oussama\Desktop\haloui system\electron\dev.cjs)
- [scripts\prepare-desktop-app.cjs](C:\Users\oussama\Desktop\haloui system\scripts\prepare-desktop-app.cjs)
- [lib\runtime-paths.ts](C:\Users\oussama\Desktop\haloui system\lib\runtime-paths.ts)
- [lib\auth.ts](C:\Users\oussama\Desktop\haloui system\lib\auth.ts)
- [lib\db.ts](C:\Users\oussama\Desktop\haloui system\lib\db.ts)
- [lib\data.ts](C:\Users\oussama\Desktop\haloui system\lib\data.ts)
- [app\(app)\parametres\page.tsx](<C:\Users\oussama\Desktop\haloui system\app\(app)\parametres\page.tsx>)
- [app\api\export\route.ts](C:\Users\oussama\Desktop\haloui system\app\api\export\route.ts)

---

## 19. Resume ultra-court

Si vous ne retenez que l'essentiel:

- `Parametres` = `superadmin` seulement
- `superadmin` est cache et gere par `.env.local`
- les donnees Electron sont dans `%APPDATA%\Haloui System\`
- les sauvegardes auto vont dans `data/backups`
- le reset metier garde les utilisateurs mais vide les donnees operationnelles
- `npm run desktop:dist` fabrique l'installateur Windows
- la version portable se fait en zippant `win-unpacked` selon la section `4.6`
- pour migrer, copier la base SQLite + les uploads
