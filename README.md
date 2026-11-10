# QuantSwing AI — Version iPad

Application personnelle gratuite de suivi d'un portefeuille saisi manuellement et de backtesting (swing trading 3 à 10 séances). Aucun accès à un compte de courtage, aucun ordre exécuté.

## Ouvrir

- Tableau de bord : https://pext1331.github.io/Quantswing-ai/
- Laboratoire des preuves : https://pext1331.github.io/Quantswing-ai/analyse.html
- Générateur CSV Google Colab : https://colab.research.google.com/github/PEXT1331/Quantswing-ai/blob/main/Generateur_CSV_Colab.ipynb

Le code GitHub Pages est public. Ne publie jamais de mots de passe, jetons API, transactions personnelles, montants ou sauvegardes JSON dans le dépôt.

## Démarrer sur ton iPad

1. Ouvre le tableau de bord et appuie sur « Afficher mes montants ». Le masquage visuel se réactive lors des prochaines ouvertures. Ce n'est pas du chiffrement.
2. Enregistre tes achats, ventes, frais et dépôts manuellement. Le CAD est privilégié, le USD fonctionne avec un taux de change saisi.
3. Dans « Cours & graphiques », entre les prix que tu consultes séparément : l'application ne récupère pas encore automatiquement les prix.
4. Dans « Sauvegarde », exporte régulièrement un fichier JSON. Garde-le dans un endroit privé. Le stockage Safari peut être effacé et la version ajoutée à l'écran d'accueil peut avoir un stockage distinct.
5. Pour les modèles, ouvre « Laboratoire des preuves ». Lance d'abord la démonstration fictive, ou importe un CSV réel.
6. Pour obtenir des CSV, ouvre le générateur Colab, modifie la liste des symboles si nécessaire, lance « Exécution → Tout exécuter », récupère le fichier QuantSwing_historiques.csv, puis importe-le dans le laboratoire.

## Comprendre les preuves

- « Test » : dernière fraction des journées, jamais utilisée par les règles pour calibrer les paramètres (les règles de cette version sont fixes).
- « Trades gagnants » : pourcentage des opérations simulées à rendement net positif; ce n'est pas une probabilité garantie pour demain.
- « Moyenne nette » : gain ou perte moyen par opération avec des coûts hypothétiques de 0,15 % par côté.
- « Profit factor » : gains nets positifs cumulés / pertes nettes cumulées en valeur absolue.
- Intervalle à 95 % : approximation fragile si les transactions sont corrélées.
- « Achat-conservation » : rendement de conservation continue pendant le test, différent d'un rendement moyen par trade.
- Chaque signal montre les conditions déclenchées, des niveaux théoriques et, si disponibles, des statistiques historiques comparables.

## Ce qui n'est pas encore résolu

- Ce n'est pas un flux temps réel ni un flux garanti de clôture de marché; les historiques CSV sont importés manuellement.
- Le fournisseur gratuit yfinance est non officiel et peut être indisponible, incorrect ou soumis à des restrictions; vérifier toute donnée importante.
- Le backtest n'inclut pas les dividendes, les impôts, les frais spécifiques d'un courtier, toutes les suspensions, les actions délistées, ni la construction d'un portefeuille multi-positions.
- Les modèles sont des règles techniques exploratoires, pas une IA prédictive validée.
- Un utilisateur ayant accès à ton iPad déverrouillé pourrait voir les données locales. Les sauvegardes JSON ne sont pas chiffrées. Le masquage visuel n'empêche pas l'inspection technique.
- Un bon backtest ne garantit aucun profit : il faut des tests sur de nouvelles périodes et une simulation prospective avant de risquer de l'argent.

## Maintenance

- index.html : portefeuille et transactions manuelles.
- analyse.html : laboratoire historique OHLCV.
- Generateur_CSV_Colab.ipynb : générateur d'un CSV multi-actions.
- tests/quant.test.cjs : tests de non-régression.
- .github/workflows/qualite.yml : contrôles automatiques après chaque modification.

Commande locale de test : node --test tests/quant.test.cjs.

Budget logiciel supplémentaire visé : 0 $ (selon limites des services gratuits).
