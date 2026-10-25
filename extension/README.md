# Extension Chrome MailPulse

Suit automatiquement les mails envoyés depuis Gmail : à l'envoi, un petit panneau affiche l'expéditeur, les destinataires et l'objet détectés, demande s'il faut te rappeler de relancer, puis insère le pixel de suivi.

## Installer

```bash
pnpm ext:build
```

1. Ouvre `chrome://extensions`, active le **mode développeur**, puis clique sur **Charger l'extension non empaquetée** et choisis `extension/dist`.
2. La page d'options s'ouvre : saisis l'URL du tableau de bord (la valeur de `PUBLIC_BASE_URL`) et le token (`API_TOKEN`), puis clique sur **Enregistrer et tester**.
3. Recharge les onglets Gmail déjà ouverts.

`pnpm ext:watch` reconstruit à chaque modification. Il faut ensuite cliquer sur ↻ dans `chrome://extensions`.

## Fonctionnement

- `src/content/` : script injecté dans Gmail. Il intercepte Envoyer et Ctrl/⌘+Entrée, affiche le panneau, insère le pixel, puis relance l'envoi. Si l'API échoue, le mail part quand même, sans suivi.
- `src/content/selectors.ts` : **toutes** les hypothèses sur le DOM de Gmail. C'est le fichier à corriger si Gmail change son interface.
- `src/background.ts` : seul endroit qui appelle l'API (`Authorization: Bearer API_TOKEN`). Toutes les 5 min, il transforme les nouvelles ouvertures et les relances dues en notifications Chrome.
- `src/popup/` : interrupteur on/off, 5 derniers mails suivis, lien vers le tableau de bord.
