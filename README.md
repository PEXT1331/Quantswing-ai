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

## Cadre juridique et données (vérifié le 10 novembre 2026)

- **Usage personnel uniquement.** Le site présente des calculs pédagogiques pour la recherche personnelle. Il ne commercialise pas de conseil, ne publie aucun signal individualisé à d'autres clients et n'exécute aucun ordre. Si le service est offert au public comme conseil financier ou SaaS, un examen juridique, des licences et potentiellement une inscription auprès de l'AMF seront nécessaires.
- **GitHub Pages** : permis pour les pages statiques de projets personnels; il ne peut pas être détourné en hébergement gratuit d'un SaaS commercial. Voir https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- **TradingView** : liens vers ses graphiques pour consultation visuelle seulement. Les conditions interdisent l'utilisation de ses données dans un modèle de décision algorithmique sans droits supplémentaires. Voir https://www.tradingview.com/policies/
- **Historique CSV** : n'importer que des données que tu as le droit d'utiliser à des fins personnelles de recherche. Les jeux de données trouvés publiquement n'autorisent pas nécessairement leur redistribution ou leur réutilisation commerciale.
- **Générateur Colab** : yfinance est une bibliothèque non officielle et Yahoo impose ses propres conditions; un usage personnel de recherche ne donne pas automatiquement le droit d'effectuer des extractions automatisées. N'exécute le générateur que si tu as vérifié que ton accès et l'utilisation prévue sont autorisés. Voir https://ranaroussi.github.io/yfinance/
- **Audit empirique** : https://pext1331.github.io/Quantswing-ai/audit.html (rapport de résultats dérivés; pas les données historiques originales).

Ces indications techniques ne constituent pas une opinion juridique formelle. En cas de doute sur un fournisseur, utiliser un export CSV légitimement obtenu, sans automatiser l'accès.


## Radar quotidien automatisé

- Adresse : https://pext1331.github.io/Quantswing-ai/radar.html
- GitHub Actions : 8 h 11 et 18 h 19 (America/Toronto, du lundi au vendredi). Les tâches peuvent avoir du retard.
- Univers initial : **huit actions** (jusqu'à 16 appels pour deux passages). Le quota normal gratuit Alpha Vantage est de 25 requêtes/jour; il ne s'agit pas d'un balayage intégral NYSE/NASDAQ/TSX.
- Moteur : clôtures journalières complètes (OHLCV), RSI, ATR, volume relatif et cassures sur 20 séances. Le score 0–100 est une heuristique, jamais une probabilité de gain.
- Aucun ordre boursier, aucun montant personnel ni donnée TradingView.
- **Sans clé API** : statut configuration_required et aucun signal fabriqué.
- **Clé API privée** : la placer uniquement dans un secret GitHub Actions nommé ALPHAVANTAGE_API_KEY, jamais dans une conversation, le dépôt ni les fichiers de code. Les calculs restent dans la tâche.
- **Publication publique désactivée par défaut** : mettre le secret PUBLICATION_RIGHTS_CONFIRMED à true uniquement après obtention ou vérification d'une autorisation explicite pour diffuser des données dérivées. La formule gratuite d'Alpha Vantage est destinée à la recherche personnelle et ne donne pas automatiquement un droit de redistribution ou d'affichage public.
- Le site lit seulement le statut non personnel du fichier radar/latest.json via l'API publique GitHub.
- L'offre TSX gratuite peut ne pas couvrir tous les symboles; le logiciel indique les indisponibilités plutôt que de présenter des cours inventés.

### Tester sans frais et sans clé

La CI exécute node --test tests/radar.test.cjs et une démonstration intégrale avec des chandeliers fictifs : node scripts/radar.cjs --demo --output /tmp/radar-demo.json. Aucun résultat de démonstration ne constitue un signal réel.

### Sources de la configuration

- https://www.alphavantage.co/documentation/
- https://www.alphavantage.co/support/
- https://www.alphavantage.co/terms_of_service/
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

## Maintenance

- index.html : portefeuille et transactions manuelles.
- analyse.html : laboratoire historique OHLCV.
- Generateur_CSV_Colab.ipynb : générateur d'un CSV multi-actions.
- tests/quant.test.cjs : tests de non-régression.
- .github/workflows/qualite.yml : contrôles automatiques après chaque modification.

Commande locale de test : node --test tests/quant.test.cjs.

Budget logiciel supplémentaire visé : 0 $ (selon limites des services gratuits).
