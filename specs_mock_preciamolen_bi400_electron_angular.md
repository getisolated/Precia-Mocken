# Spécifications fonctionnelles et techniques  
# Precia Molen BI400 Mock - Electron / Angular

## 1. Contexte

Le projet consiste à créer une application desktop permettant de simuler un pont bascule / indicateur **Precia Molen BI400**.

Une première version console existe déjà en C#. Elle permet de :

- démarrer un serveur TCP ;
- attendre la connexion d’un service métier ;
- envoyer des trames simulées vers le service ;
- recevoir et décoder les trames envoyées par le service ;
- piloter le mock via des commandes texte.

La nouvelle version doit être une application desktop plus ergonomique, plus visuelle et plus simple à utiliser au quotidien.

L’architecture retenue est :

```txt
Application Electron
├── Electron Main Process
│   ├── Serveur TCP Node.js
│   ├── Parsing des trames BI400
│   ├── Construction des trames sortantes
│   ├── Gestion des logs
│   └── IPC vers l’interface Angular
│
├── Preload Script
│   └── API sécurisée exposée à Angular via contextBridge
│
└── Angular Renderer
    ├── Dashboard
    ├── Panneau de simulation
    ├── Afficheur poids
    ├── Journal des trames
    └── Console visuelle intégrée
```

---

## 2. Objectifs

L’application doit permettre de tester un service qui communique avec un pont bascule Precia Molen BI400 sans disposer du matériel réel.

Elle doit permettre de :

- lancer un serveur TCP local ;
- écouter sur une adresse et un port configurables ;
- accepter la connexion d’un client TCP ;
- visualiser l’état du serveur et du client connecté ;
- envoyer des événements simulés vers le service métier ;
- recevoir les trames du service métier ;
- décoder les trames entrantes ;
- afficher un journal temps réel des échanges ;
- rejouer facilement des scénarios de pesée ;
- faciliter le debug grâce à une interface claire.

---

## 3. Choix technologique

### 3.1 Stack retenue

- **Electron** pour créer l’application desktop ;
- **Angular** pour l’interface utilisateur ;
- **Node.js net module** dans le main process pour le serveur TCP ;
- **TypeScript** pour l’ensemble du code ;
- **Electron IPC** pour les échanges entre Angular et Electron ;
- **contextBridge** dans le preload pour exposer une API contrôlée ;
- **electron-builder** pour produire un exécutable Windows.

---

## 4. Principe d’architecture

### 4.1 Séparation des responsabilités

Le TCP ne doit pas être exécuté directement dans Angular.

Angular est uniquement responsable de l’interface utilisateur.

Le serveur TCP, le parsing des trames et l’envoi réseau doivent être dans le **main process Electron**.

```txt
Angular UI
   ↓
window.preciaMock
   ↓
preload.ts
   ↓
IPC
   ↓
Electron main process
   ↓
Serveur TCP Node.js
   ↓
Service métier connecté au faux pont
```

### 4.2 Pourquoi ce découpage ?

Ce découpage permet de :

- garder Angular sécurisé ;
- désactiver `nodeIntegration` ;
- conserver `contextIsolation: true` ;
- éviter d’exposer directement les APIs Node.js dans l’interface ;
- centraliser les échanges TCP dans une couche technique dédiée ;
- faciliter les tests unitaires du protocole BI400.

---

## 5. Périmètre MVP

La première version doit contenir les fonctionnalités suivantes.

### 5.1 Serveur TCP

- Démarrer le serveur TCP.
- Arrêter le serveur TCP.
- Configurer le port d’écoute.
- Configurer l’adresse d’écoute :
  - `127.0.0.1`
  - `0.0.0.0`
  - IP locale spécifique, exemple `192.168.1.50`
- Afficher l’état du serveur :
  - stopped ;
  - listening ;
  - client connected ;
  - error.
- Afficher le endpoint client connecté.
- Gérer une seule connexion client active dans le MVP.
- Déconnecter proprement le client si nécessaire.

### 5.2 Trames sortantes vers le service métier

L’application doit permettre d’envoyer les trames suivantes :

| Commande UI | Type trame | Description |
|---|---:|---|
| Présence véhicule | `PVE` | Signale qu’un véhicule est présent |
| Départ véhicule | `DVE` | Signale qu’un véhicule quitte le pont |
| Badge | `BDG` | Simule le scan d’un badge |
| Tournée | `SCC` | Simule la saisie d’un numéro de tournée |
| Site | `SCC` | Simule la saisie d’un code site |
| Bouton | `AIB` | Simule l’appui sur un bouton par index |
| OK | `AIB` | Raccourci pour bouton index 2 |
| Cancel | `AIB` | Raccourci pour bouton index 1 |
| Poids instable | `PDD` | Envoie un poids instable |
| Poids stable | `PDS` | Envoie un poids stable |
| Raw | brut | Envoie une trame brute pour debug |

### 5.3 Trames entrantes depuis le service métier

L’application doit décoder et afficher les trames suivantes :

| Type | Description affichée |
|---:|---|
| `RZE` | ClearScreen |
| `FIL` | Filter |
| `AFM` | DisplayLine |
| `SCC` | PromptUser |
| `AIB` | DisplayButtons |
| `AMP` | DisplayWeight ON/OFF |
| `PDD` | GetWeight poll |
| `IMP` | Print |
| `OUT` | SetAccessoryState |

Les types inconnus doivent être affichés comme `Unknown frame`.

### 5.4 Logs temps réel

Le journal doit afficher chaque événement avec :

- timestamp ;
- direction :
  - incoming ;
  - outgoing ;
  - system ;
  - error ;
- type de trame ;
- description lisible ;
- payload décodé ;
- raw frame ;
- endpoint client si pertinent.

Fonctionnalités attendues :

- filtrer les logs ;
- rechercher dans les logs ;
- copier une trame brute ;
- vider les logs ;
- exporter les logs en fichier texte ou JSON, optionnel dans le MVP.

---

## 6. Interface utilisateur Angular

### 6.1 Écran principal

L’application doit tenir dans un écran principal de type dashboard.

Sections recommandées :

1. Header global ;
2. Statut TCP ;
3. Afficheur de poids ;
4. Actions rapides ;
5. Formulaires de simulation ;
6. Journal des trames ;
7. Console visuelle intégrée.

---

## 7. Détail des composants UI

### 7.1 Header

Contenu :

- nom de l’application : `Precia Molen BI400 Mock` ;
- statut global ;
- endpoint TCP ;
- bouton Start / Stop ;
- bouton Settings ;
- bouton Clear logs.

États visuels :

- gris : stopped ;
- bleu : listening ;
- vert : client connected ;
- rouge : error.

---

### 7.2 Carte TCP Status

Doit afficher :

- état du serveur ;
- host ;
- port ;
- endpoint complet ;
- client connecté ;
- adresse distante du client ;
- date de dernière connexion ;
- date du dernier message reçu.

Actions :

- Start ;
- Stop ;
- Restart ;
- Copy endpoint.

---

### 7.3 Afficheur poids

Affichage principal :

- poids net en grand ;
- unité `kg` ;
- badge stable / instable.

Détails :

- gross ;
- tare ;
- net ;
- dsd ;
- dernier type envoyé :
  - `PDD`
  - `PDS`.

Exemple :

```txt
NET
00800.00 kg

Gross: 01000.00
Tare : 00200.00
Net  : 00800.00
DSD  : 000123
Status: Stable
```

---

### 7.4 Actions rapides

Boutons visibles :

- Présence véhicule ;
- Départ véhicule ;
- OK ;
- Cancel ;
- Send Stable Weight ;
- Send Unstable Weight.

Ces boutons doivent être accessibles sans scroll.

---

### 7.5 Simulation Inputs

Champs :

#### Badge

- input badge ;
- bouton Send Badge.

#### Tournée

- input tour ;
- bouton Send Tour.

#### Site

- input site ;
- bouton Send Site.

#### Bouton

- input index ;
- bouton Send Button.

#### Poids

- input gross ;
- input tare ;
- input net ;
- input dsd ;
- checkbox `Auto calculate net` ;
- bouton `Send PDD`;
- bouton `Send PDS`.

Règle si `Auto calculate net` est actif :

```txt
net = gross - tare
```

#### Raw debug

- textarea raw frame ;
- bouton Send Raw ;
- avertissement indiquant que le contenu sera envoyé tel quel.

---

### 7.6 Frame Log

Le log doit être un tableau ou une liste compacte.

Colonnes recommandées :

| Colonne | Description |
|---|---|
| Time | Heure locale |
| Direction | incoming / outgoing / system / error |
| Type | Type trame |
| Description | Texte lisible |
| Payload | Contenu décodé |
| Raw | Trame brute |

Fonctions :

- filtre direction ;
- filtre type ;
- recherche texte ;
- clear ;
- copy raw ;
- expand row.

Styles :

- incoming : couleur froide ;
- outgoing : couleur chaude ;
- system : gris ;
- error : rouge ;
- warning : jaune.

---

### 7.7 Console visuelle intégrée

Une zone type terminal peut reprendre les événements système :

```txt
[system] App started
[tcp] Listening on 0.0.0.0:4001
[tcp] Client connected: 192.168.1.20:53612
[out] 0003PVE
[in] 0007PDD...
```

Cette zone ne remplace pas le log structuré, elle sert de miroir rapide.

---

## 8. Format protocole BI400

### 8.1 Structure générale

Les trames ont la forme :

```txt
LLLLTTTPAYLOAD
```

Avec :

- `LLLL` : longueur sur 4 caractères numériques ;
- `TTT` : type de trame sur 3 caractères ;
- `PAYLOAD` : contenu variable.

La longueur correspond à la longueur du body :

```txt
TTT + PAYLOAD
```

Exemple simplifié :

```txt
0003PVE
```

---

## 9. Construction des trames sortantes

### 9.1 Trame simple

Utilisée pour :

- `PVE`
- `DVE`

Format :

```txt
LLLLTTT
```

Exemple :

```txt
0003PVE
```

### 9.2 Badge

Type : `BDG`

Format :

```txt
BDG + reserved + badgeLength + badge
```

Exemple logique :

```txt
BDG0 0006 123456
```

Trame finale :

```txt
0014BDG00006123456
```

### 9.3 SCC

Utilisée pour tournée et site.

Format :

```txt
SCC + valueLength + value
```

### 9.4 AIB

Utilisée pour bouton.

Format :

```txt
AIB + index sur 4 caractères
```

Exemple :

```txt
0007AIB0002
```

### 9.5 Poids PDD/PDS

Format logique :

```txt
TYPE + reserved + gross + sep + tare + sep + net + sep + dsd
```

Avec :

- `TYPE` : `PDD` ou `PDS` ;
- reserved : `0` ;
- gross : poids brut sur 8 caractères ;
- tare : tare sur 8 caractères ;
- net : net sur 8 caractères ;
- séparateurs : deux espaces ;
- dsd : numéro DSD sur 6 caractères.

Exemple :

```txt
PDS001000.00  00200.00  00800.00  000123
```

---

## 10. Parsing TCP

### 10.1 Point important

Une donnée reçue via TCP ne correspond pas forcément à une trame complète.

Le parseur doit gérer :

- une trame complète ;
- plusieurs trames collées ;
- une trame coupée en plusieurs paquets ;
- une longueur invalide ;
- un type inconnu ;
- un payload incomplet.

### 10.2 Stratégie recommandée

Le serveur TCP doit conserver un buffer par socket.

Pseudo-code :

```ts
let buffer = Buffer.alloc(0);

socket.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (buffer.length >= 4) {
    const lenText = buffer.subarray(0, 4).toString("ascii");

    if (!/^\d{4}$/.test(lenText)) {
      emitProtocolError(buffer.toString("ascii"));
      buffer = Buffer.alloc(0);
      break;
    }

    const bodyLength = Number(lenText);
    const totalLength = 4 + bodyLength;

    if (buffer.length < totalLength) {
      break;
    }

    const frameBuffer = buffer.subarray(0, totalLength);
    parseFrame(frameBuffer);

    buffer = buffer.subarray(totalLength);
  }
});
```

---

## 11. API exposée à Angular

Angular ne doit pas appeler directement Node.

Le preload doit exposer une API contrôlée :

```ts
window.preciaMock = {
  startServer(config),
  stopServer(),
  restartServer(config),
  getStatus(),
  sendPresenceVehicle(),
  sendDepartureVehicle(),
  sendBadge(badge),
  sendTour(value),
  sendSite(value),
  sendButton(index),
  sendOk(),
  sendCancel(),
  sendWeight(payload),
  sendRaw(raw),
  clearLogs(),
  onStatusChanged(callback),
  onFrameLog(callback),
  onConsoleLine(callback)
}
```

---

## 12. Types TypeScript principaux

### 12.1 ServerConfig

```ts
export interface ServerConfig {
  host: string;
  port: number;
  autoStart: boolean;
}
```

### 12.2 ServerStatus

```ts
export interface ServerStatus {
  state: "stopped" | "listening" | "client-connected" | "error";
  host: string;
  port: number;
  endpoint: string;
  clientEndpoint?: string;
  startedAt?: string;
  lastConnectionAt?: string;
  lastMessageAt?: string;
  errorMessage?: string;
}
```

### 12.3 WeightPayload

```ts
export interface WeightPayload {
  gross: number;
  tare: number;
  net: number;
  dsd: number;
  stable: boolean;
}
```

### 12.4 FrameLogEntry

```ts
export interface FrameLogEntry {
  id: string;
  timestamp: string;
  direction: "incoming" | "outgoing" | "system" | "error";
  type?: string;
  description: string;
  payload?: string;
  raw?: string;
  clientEndpoint?: string;
}
```

---

## 13. Structure de projet recommandée

```txt
precia-molen-bi400-mock/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   └── mock-ipc.ts
│   ├── tcp/
│   │   ├── bi400-server.ts
│   │   ├── bi400-parser.ts
│   │   ├── bi400-frame-builder.ts
│   │   ├── bi400-describer.ts
│   │   └── bi400-types.ts
│   ├── logging/
│   │   └── log-store.ts
│   └── config/
│       └── app-config-store.ts
│
├── src/
│   └── app/
│       ├── core/
│       │   ├── services/
│       │   │   └── precia-mock.service.ts
│       │   └── models/
│       │       ├── server-status.model.ts
│       │       ├── frame-log-entry.model.ts
│       │       └── weight-payload.model.ts
│       │
│       ├── pages/
│       │   └── dashboard/
│       │       ├── dashboard.component.ts
│       │       ├── dashboard.component.html
│       │       └── dashboard.component.scss
│       │
│       ├── shared/
│       │   └── components/
│       │       ├── status-pill/
│       │       ├── weight-display/
│       │       ├── tcp-status-card/
│       │       ├── quick-actions/
│       │       ├── simulation-form/
│       │       ├── frame-log/
│       │       └── console-panel/
│       │
│       └── app.component.*
│
├── package.json
├── angular.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

---

## 14. Sécurité Electron

Configuration recommandée de la fenêtre :

```ts
new BrowserWindow({
  width: 1440,
  height: 900,
  minWidth: 1200,
  minHeight: 760,
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  }
});
```

Règles :

- ne pas activer `nodeIntegration` ;
- ne pas exposer `ipcRenderer` directement ;
- exposer uniquement des méthodes métier via `contextBridge` ;
- valider les entrées utilisateur côté main process ;
- limiter les commandes raw à un mode debug clairement identifié.

---

## 15. Paramètres applicatifs

Paramètres à prévoir :

| Paramètre | Défaut | Description |
|---|---:|---|
| host | `0.0.0.0` | Adresse d’écoute TCP |
| port | `4001` | Port TCP du faux pont |
| autoStart | `false` | Démarrer le serveur au lancement |
| maxLogs | `1000` | Nombre maximum de logs en mémoire |
| theme | `dark` | Thème visuel |
| defaultGross | `1000.00` | Poids brut par défaut |
| defaultTare | `200.00` | Tare par défaut |
| defaultNet | `800.00` | Poids net par défaut |
| defaultDsd | `1` | DSD par défaut |

---

## 16. Scénarios utilisateur

### 16.1 Scénario de base

1. L’utilisateur lance l’application.
2. Il démarre le serveur TCP sur `0.0.0.0:4001`.
3. Le service métier se connecte.
4. L’interface passe en état `Client connected`.
5. L’utilisateur clique sur `Présence véhicule`.
6. Il envoie un badge.
7. Il renseigne un poids.
8. Il envoie un poids stable.
9. Il observe les trames reçues/envoyées dans les logs.

---

### 16.2 Scénario avec saisie tournée

1. Le service demande une saisie via une trame `SCC`.
2. Le mock affiche la demande dans les logs.
3. L’utilisateur renseigne un numéro de tournée.
4. Il clique sur `Send Tour`.
5. La trame `SCC` est envoyée.

---

### 16.3 Scénario debug raw

1. L’utilisateur colle une trame brute.
2. Il clique sur `Send Raw`.
3. L’application envoie exactement le contenu saisi.
4. Le log affiche la trame comme `outgoing raw`.

---

## 17. Gestion des erreurs

L’application doit gérer proprement :

- port TCP déjà utilisé ;
- host invalide ;
- absence de client connecté ;
- client déconnecté pendant un envoi ;
- trame entrante invalide ;
- longueur de trame incorrecte ;
- payload incomplet ;
- erreur socket ;
- erreur de parsing ;
- erreur IPC.

Exemples de messages :

```txt
Cannot start TCP server: port 4001 is already in use.
No client connected. Frame was not sent.
Invalid incoming frame length.
Client disconnected.
```

---

## 18. Tests à prévoir

### 18.1 Tests unitaires

- frame builder `PVE` ;
- frame builder `DVE` ;
- frame builder `BDG` ;
- frame builder `SCC` ;
- frame builder `AIB` ;
- frame builder `PDD` ;
- frame builder `PDS` ;
- parser trame complète ;
- parser trames collées ;
- parser trame coupée ;
- parser longueur invalide.

### 18.2 Tests manuels

- démarrer le serveur ;
- connecter le service métier ;
- envoyer chaque type de trame ;
- déconnecter/reconnecter le client ;
- tester port déjà occupé ;
- tester en écoute `127.0.0.1` ;
- tester en écoute `0.0.0.0` ;
- tester avec une IP locale spécifique.

---

## 19. Roadmap possible

### Version 1

- serveur TCP ;
- UI dashboard ;
- envoi des trames principales ;
- décodage des trames entrantes ;
- logs temps réel ;
- packaging Windows.

### Version 2

- scénarios enregistrables ;
- presets de pesée ;
- export/import configuration ;
- export logs ;
- multi-profils client ;
- mode auto-response.

### Version 3

- simulation multi-clients ;
- timeline de scénario ;
- script de scénario automatisé ;
- génération de rapports de test ;
- comparaison avec traces réelles.

---

## 20. Résultat attendu

Le résultat attendu est une application desktop Windows moderne, simple à lancer, qui remplace avantageusement la version console tout en gardant la puissance de debug.

L’utilisateur doit pouvoir :

- lancer l’app ;
- démarrer le mock TCP ;
- connecter son service métier ;
- envoyer des événements simulés ;
- voir précisément ce qui circule ;
- diagnostiquer rapidement les problèmes de protocole.

L’application doit être pensée comme un petit cockpit de simulation industrielle : lisible, fiable, directe, et agréable à utiliser.
