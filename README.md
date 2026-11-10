# QuantSwing AI — Version iPad

Application personnelle gratuite de suivi d'un portefeuille saisi manuellement et de backtesting (swing trading 3 à 10 séances). Aucun accès à un compte de courtage, aucun ordre exécuté.

## Ouvrir

- Tableau de bord : https://pext1331.github.io/Quantswing-ai/
- Laboratoire des preuves : https://pext1331.github.io/Quantswing-ai/analyse.html
- Gestion du risque : https://pext1331.github.io/Quantswing-ai/risque.html
- **Laboratoire de l'or (expérimental)** : https://pext1331.github.io/Quantswing-ai/or.html
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


## Expérience sur l'or — laboratoire de validation

**But : tester avant de financer davantage de développement.** Le portefeuille et son stockage local sont préservés; l'application ne prédit pas actuellement l'or et n'exécute aucun ordre.

### Accéder aux données sans payer TradingView

- [Archive officielle SPDR GLD](https://www.spdrgoldshares.com/usa/gld/) : l'émetteur fournit un fichier d'historique XLSX (données de fonds, valeur/NAV et prix selon les colonnes du document). **Ne pas supposer que le XLSX contient Open, High, Low, Close ET Volume** : les champs doivent être vérifiés. Les conditions du site limitent la redistribution et les usages dérivés, en particulier pour le prix LBMA.
- [Alpha Vantage, données quotidiennes](https://www.alphavantage.co/documentation/#daily) : propose des OHLCV de titres et FNB avec **clé API personnelle**. La formule gratuite est limitée aux 100 dernières séances par requête quotidienne et à environ 25 appels/jour; l'historique quotidien long est premium. L'API **n'est pas configurée** pour notre site et aucune clé n'est enregistrée dans GitHub.
- [Archive GOLD D1 exploratoire](https://github.com/tohaitrieu/market-history/blob/master/data/commodities/GOLD/GOLD-D1.csv) : 6 420 observations OHLC, juin 2001 à février 2026, *sans volume*, instrument **GOLD spot / série indicative, pas GLD**. Le dépôt se dit de domaine public, mais ne précise pas l'origine primaire de cette série : **ne pas lui accorder une qualité institutionnelle ni utiliser ses résultats pour négocier**. Les données brutes n'ont pas été ajoutées à notre dépôt.

Cette recherche a révélé une **embûche majeure : il manque encore une source officielle vérifiée, gratuite et suffisamment longue d'OHLCV quotidiens de GLD**, disponible pour tests personnels, sans restriction incompatible. La connexion du site au marché en direct est absente. Ne jamais insérer la clé API personnelle dans un dépôt public.

### Utiliser le nouvel outil

1. Ouvrir `or.html` depuis le site sur Safari/iPad.
2. Télécharger de manière autorisée un fichier CSV OHLC quotidien : `Date,Open,High,Low,Close` avec `Volume` facultatif et `Symbol/Asset` optionnel.
3. Importer le fichier **localement**; il n'est envoyé à aucun serveur, pas même à GitHub.
4. Lire les résultats des deux modèles fixes (cassure de tendance, correction), à comparer au buy-and-hold **10 % or / 90 % liquidités** et à la référence 100 % or. L'application prévoit les frais d'entrée et de sortie et l'exécution à l'ouverture suivante après le signal, avec priorité au stop quand la même séance touche stop et cible.
5. Changer les frais de simulation pour examiner la robustesse. Le partage développement/test est purement **chronologique et exploratoire**; il n'élimine pas le biais de choix des stratégies ou du jeu de données.
6. Les historiques de moins de 260 séances ne peuvent pas générer de comparaison. Les historiques âgés de plus de 7 jours portent un avis explicite et ne justifient pas un signal actuel.

### Première vérification exploratoire (ne pas traiter comme preuve de profits)

À partir du dépôt GOLD non vérifié mentionné ci-dessus, sur les séances de test 2018-08-21 à 2026-02-05, avec frais **0,15 % par côté** et **10 % de capital exposé par position** :

| Simulation de recherche | Opérations terminées | Trades gagnants | Profit factor | Rendement de portefeuille |
|---|---:|---:|---:|---:|
| Cassure de tendance | 39 | 56,41 % | 1,793 | +2,858 % |
| Achat après correction | 34 | 50,00 % | 1,269 | +0,876 % |
| Achat et conservation à 10 % or | 1 | — | — | +31,408 % |

**Les deux stratégies actives sous-performent largement la référence comparable dans cet essai.** Les titres GLD, CGL et CGL.C ont d'autres heures de négociation, frais, cours et risques de change; ces résultats ne sont donc pas transférables tels quels à une négociation réelle.

La simulation ne couvre pas la conversion CAD/USD, les taxes, la liquidité, les ordres réels et la possibilité de glissements supérieurs à la pénalité fixe. Aucun mécanisme de décision automatique sur fonds réels n'est prévu. Le taux de réussite des trades n'est pas la probabilité de gagner de l'argent.

## Gestion du risque personnel (nouveau)

Page : https://pext1331.github.io/Quantswing-ai/risque.html

**Objectif : savoir combien une position peut raisonnablement coûter et risquer avant un achat, pas augmenter artificiellement le taux de réussite.**

- Interface optimisée pour Safari/iPad, données personnelles masquées dès l'ouverture.
- Lit localement l'ancien portefeuille avec la même clé de stockage de navigateur (quantswing-ipad-v1). Aucun mot de passe, aucune clé API ni montant transmis ou publié. Une autre installation Safari/écran d'accueil peut utiliser un espace local différent.
- Stop sous le **Low récent** : creux technique moins 0,25 fois l'ATR (paramètre exploratoire).
- Stop basé sur la volatilité : prix d'entrée moins 1,5 fois l'ATR. Option conservatrice : le plus éloigné des deux.
- Résistance déduite du **High récent** quand elle se situe au-dessus du prix d'entrée; sinon objectif hypothétique 2R ou niveau manuel, clairement indiqué. Le ratio gain/risque est calculé après frais.
- Stop suiveur indicatif : plus haut depuis l'entrée moins 2 ATR; ne pas l'abaisser lorsqu'un stop existant est plus élevé.
- Calcul de taille maximale en actions entières sous **quatre plafonds simultanés** : budget de risque par transaction (défaut 0,5 % des fonds propres), risque cumulé des positions (défaut 2 %), exposition totale au même titre (défaut 10 %), liquidités disponibles. Un plafond sectoriel facultatif s'ajoute uniquement si l'utilisateur renseigne déjà son exposition sectorielle.
- Le risque théorique des positions en portefeuille est calculé à partir des derniers cours saisis et des stops locaux. La page **bloque le nouveau plan** si des cours sont trop anciens (plus de sept jours), si un stop manque, si le portefeuille est incomplet, si la conversion USD/CAD manque ou si le rapport gain/risque net est insuffisant.
- L'utilisateur peut sauvegarder un stop pour une position existante dans le stockage local; ceci **ne place pas un ordre de courtage**. Exporter une sauvegarde JSON privée après changement. La synchronisation entre onglets de la même origine est prise en charge.
- La page permet un **CSV OHLCV local** (Date, Open, High, Low, Close, Volume; colonne Symbol facultative), y compris un CSV multi-titres. Le calculateur déduit ATR 14, creux sur 10 séances et ancien sommet sur 20/60 séances. Une bougie du jour non terminée est exclue et un fichier dépassé ne peut pas servir à générer un plan admissible.
- Une démonstration entièrement fictive de 10 000 $ CAD est disponible sans toucher au portefeuille privé.
- Les niveaux, scores et budgets sont des expériences : une ouverture en gap, un ordre mal exécuté, les commissions véritables, le change, la liquidité, la fiscalité et les événements corporatifs peuvent faire perdre plus que l'estimation. Les liquidités multidevises sont des estimations CAD, pas un solde officiel de courtage.
- Cette amélioration ne change pas encore le taux de réussite historique des stratégies : les règles de sélection ne sont pas modifiées. Un vrai rendement net positif devra être démontré séparément par validation prospective.

Contrôles automatiques supplémentaires : tests/risk.test.cjs (25 cas comprenant pertes, stocks existants, CAD/USD, CSV, données périmées et traitement de 600 titres fictifs). Les tests ne remplacent pas une validation dans Safari sur l'iPad réel.

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
- or.html et scripts/gold-engine.js : laboratoire or/GLD, comparaisons historiques et contrôles méthodologiques.
- tests/gold.test.cjs : tests du laboratoire de l'or.
- Generateur_CSV_Colab.ipynb : générateur d'un CSV multi-actions.
- tests/quant.test.cjs : tests de non-régression.
- .github/workflows/qualite.yml : contrôles automatiques après chaque modification.

Commande locale de test : node --test tests/quant.test.cjs tests/radar.test.cjs tests/risk.test.cjs tests/gold.test.cjs.

Budget logiciel supplémentaire visé : 0 $ (selon limites des services gratuits).
