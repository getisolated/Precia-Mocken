# Refonte UI - Plan d'exécution

Source visuelle : `Precia Molen BI400 Mock.html` (extrait dans `extracted-template.html` pour référence).
Source protocole : `Notice_Protocole_BORNE_BI400_Precia_Molen.pdf` (texte extrait dans `notice.txt`).

## Architecture cible

```
Header (52px)  — brand · status pill · endpoint · Start/Stop/Settings/Clear · window-controls
Body
  ├─ Col-left   (350px) : TcpStatusCard · TerminalBI400 (LCD + F-keys + clavier)
  ├─ Col-center (360px) : QuickActionsCard (PVE/DVE) · SimulationInputs (onglets)
  └─ Col-right  (flex)  : FrameLog (search + filtres + expandables)
Console (bas, repliable, full-width)
```

## Conventions backend ↔ frontend

- **SCC** standard : `<size 4>SCC<dataLen 4><data>` (corriger `buildScc` qui produit aujourd'hui du non-standard).
- **AIB** réponse : `<size 4>AIB<index 4>`. F1..F10 → index 1..10. ENT → OK (index 2). ⌫ → Cancel (index 1).
- **AFM** entrant : `<size 4>AFM<position 4 = 0001..0010><taille 1: G|M|P><lineLen 4><data>`.
- **RZE** entrant : `0003RZE`, efface tout l'écran (lignes AFM + saisie + boutons).
- **AMP** entrant : `<size 4>AMP<A|M>` — A affiche la zone poids, M la masque.
- **SCC** entrant (commande host) : `<size 4>SCC<promptLen 4><prompt><maxLen 4>` — affiche le prompt en zone saisie.

## Étapes (chacune laisse le build vert)

| # | Action | Build |
|---|---|---|
| 0 | `ServerStatus.frameCount` (numérique). Incrément côté `bi400-server.ts` à chaque trame entrante. | `npm run build:electron` |
| 1 | `bi400-describer.ts` : champ `decoded` structuré pour AFM/RZE/RZP/AMP/SCC ; types associés dans `bi400-types.ts`. Propager `decoded` jusqu'au renderer via `FrameLogEntry`. | `npm run build:electron` |
| 2 | Corriger `buildScc(value)` → `<size>SCC<dataLen 4><data>`. | `npm run build:electron` |
| 3 | `src/types/precia-mock-api.d.ts` : ajouter `frameCount` à `ServerStatus`, `decoded` à `FrameLogEntry`, mettre à jour le fallback offline du service. | `npm run build:angular` |
| 4 | `src/index.html` : `<link>` Google Fonts IBM Plex Sans + Mono. `src/styles.scss` : palette OKLCH + classes utilitaires (`.card`, `.card-header`, `.card-title`, `.pill`, `.pill-*`, `.btn-primary/danger/ghost/cyan`, `.monofont`, `.section-label`) + scrollbars 5px. | `npm run build:angular` |
| 5 | Refonte `StatusPillComponent` aux classes `.pill-stopped|listening|connected|error`. | build |
| 6 | Création `HeaderComponent` (52px) : logo SVG + titre/version + StatusPill + endpoint pill + Start/Stop + Settings (no-op) + Clear logs + WindowControls à droite. | build |
| 7 | Refonte `TcpStatusCardComponent` : grid 2×2 Serveur/Host/Port/Endpoint, grid 2×2 Client/DernièreCx/DernierMsg/TramesReçues, boutons Restart + copy endpoint. (Start/Stop déplacés au header — restent doublés ici pour ergonomie : facultatif.) | build |
| 8 | Création `TerminalBi400Component` : châssis stylé, LCD vert (4 lignes "weight" auto-calculées depuis `weight()` + 5 lignes "saisie" pilotées par les signaux LCD du service), F1–F10 (envoient AIB index 1..10), SF1–SF4 (envoient AIB 11..14), clavier AZERTY (logue `KBD` localement, ENT/⌫ envoient AIB OK/Cancel). | build |
| 9 | Création `QuickActionsCardComponent` : 2 boutons PVE (vert) + DVE (rouge). | build |
| 10 | Refonte `SimulationInputsComponent` en onglets `Badge / Tour / Site / Button / Weight / Raw`. Retirer le fieldset "Véhicule" (passé dans QuickActionsCard). Tour & Site envoient tous deux du SCC standard. | build |
| 11 | Refonte `FrameLogComponent` : input search, select dir, select type, headers Time/Dir/Type/Description/Raw, lignes cliquables expandables (payload + raw + copy), compteur, bouton Clear. | build |
| 12 | Refonte `ConsolePanelComponent` : barre 32px collée en bas, plein largeur, repliable ▼/▲, coloration par préfixe `[system]/[tcp]/[in]/[out]/[error]`. | build |
| 13 | Refonte `DashboardComponent` (HTML + SCSS) : 3 colonnes (350 / 360 / flex) + console en bas. Suppression de `<app-weight-display>`. | build |
| 14 | Étendre `PreciaMockService` : signaux `lcdLines`, `weightVisible`, `prompt`, `saisie` mis à jour à partir des `FrameLogEntry.decoded` entrants ; expose `frameCount`. Méthode `submitSaisie(text)` pour répondre à un SCC en cours. | build |
| 15 | Supprimer `weight-display/` et tout composant non utilisé. Nettoyer `extracted-*` à la racine. | build |
| 16 | `npm run build` complet + `npm run dev` pour test manuel. | manuel |

## Reprise après crash

`git status` indique le dernier composant touché. Reprendre à l'étape suivante non finie.
Étapes 0–2 = backend uniquement, n'affectent pas l'UI actuelle.
Étapes 3–4 = fondations partagées, l'UI actuelle peut paraître cassée temporairement.
Étapes 5–12 = composants individuels, indépendants entre eux.
Étape 13 = bascule de l'UI ; après ça, l'app a son nouveau visage.
Étapes 14–16 = finitions.

## Hors scope (à faire plus tard)

- Settings dialog (le bouton est présent mais ne fait rien).
- Comportement réel quand l'application cliente envoie une commande inconnue — actuellement on log juste.
- Persistence des préférences UI (densité log, console visible…).
