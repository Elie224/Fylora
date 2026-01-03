# 🔒 Conformité RGPD - Fylora

## Vue d'ensemble

Fylora est conçu pour être **100% conforme au Règlement Général sur la Protection des Données (RGPD)** de l'Union Européenne. Cette application respecte strictement les principes de protection de la vie privée et de sécurité des données.

## 🛡️ Principes de Sécurité Implémentés

### 1. Chiffrement Bout en Bout (E2E)

- **Tous les fichiers sont chiffrés** avec AES-256-GCM avant stockage
- **Clés de chiffrement uniques** par utilisateur
- **Le serveur ne peut pas déchiffrer** les fichiers sans la clé utilisateur
- **Même l'administrateur ne peut pas accéder** au contenu des fichiers

**Fichier:** `backend/services/encryptionService.js`

### 2. Isolation Stricte des Données

- **Chaque utilisateur ne voit que ses propres données**
- **Filtrage systématique par `owner_id`** dans tous les contrôleurs
- **L'admin ne peut voir que des statistiques agrégées**, jamais le contenu des fichiers
- **Aucun contournement possible** via les routes normales

**Fichiers:**
- `backend/controllers/filesController.js`
- `backend/controllers/foldersController.js`
- `backend/controllers/adminController.js`

### 3. Décentralisation

- **Données stockées par utilisateur** dans des répertoires séparés
- **Pas de partage de données** entre utilisateurs sans consentement explicite
- **Chaque utilisateur contrôle ses propres données**

## 📋 Droits RGPD Implémentés

### Article 15 - Droit d'accès aux données personnelles

**Endpoint:** `GET /api/gdpr/export`

Permet à l'utilisateur d'obtenir une copie complète de toutes ses données personnelles :
- Informations de profil
- Liste de tous les fichiers (métadonnées)
- Liste de tous les dossiers
- Historique des sessions
- Préférences et paramètres

**Utilisation:**
```bash
curl -X GET https://fylora-1.onrender.com/api/gdpr/export \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Article 17 - Droit à l'effacement (Droit à l'oubli)

**Endpoint:** `DELETE /api/gdpr/delete`

Permet à l'utilisateur de demander la suppression complète et définitive de toutes ses données :
- Suppression de tous les fichiers (physique et base de données)
- Suppression de tous les dossiers
- Suppression de toutes les sessions
- Suppression du compte utilisateur
- Suppression du répertoire utilisateur

**⚠️ Attention:** Cette action est **irréversible**.

**Utilisation:**
```bash
curl -X DELETE https://fylora-1.onrender.com/api/gdpr/delete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Article 20 - Droit à la portabilité des données

**Endpoint:** `GET /api/gdpr/portability`

Permet à l'utilisateur d'exporter ses données dans un format structuré et couramment utilisé (JSON) pour les transférer vers un autre service.

**Format:** ZIP contenant :
- `data.json` : Toutes les données au format JSON structuré
- `README.txt` : Informations sur l'export et conformité RGPD

**Utilisation:**
```bash
curl -X GET https://fylora-1.onrender.com/api/gdpr/portability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o export.zip
```

### Article 7 - Consentement Explicite

**Endpoints:**
- `GET /api/gdpr/consent` : Vérifier le statut du consentement
- `POST /api/gdpr/consent` : Enregistrer le consentement

L'utilisateur doit **explicitement consentir** au traitement de ses données personnelles.

**Champs de consentement:**
- `gdpr_consent` : Consentement général RGPD
- `data_processing_consent` : Consentement au traitement des données
- `gdpr_consent_date` : Date du consentement (enregistrée automatiquement)

## 🔐 Sécurité et Vie Privée

### Protection des Données Administrateur

**L'administrateur NE PEUT PAS :**
- ❌ Accéder au contenu des fichiers des utilisateurs
- ❌ Voir les noms des fichiers/dossiers des utilisateurs
- ❌ Modifier les fichiers des utilisateurs
- ❌ Supprimer les fichiers des utilisateurs
- ❌ Accéder aux données personnelles sensibles

**L'administrateur PEUT SEULEMENT :**
- ✅ Voir des statistiques agrégées (nombre total d'utilisateurs, fichiers, stockage)
- ✅ Voir les informations de profil publiques (email, nom, quota)
- ✅ Gérer les comptes utilisateurs (activer/désactiver, modifier quota)
- ✅ Voir les compteurs (nombre de fichiers/dossiers par utilisateur)

### Chiffrement des Fichiers

- **Algorithme:** AES-256-GCM (Advanced Encryption Standard, 256 bits, Galois/Counter Mode)
- **Clés:** Générées de manière cryptographiquement sécurisée
- **IV (Initialization Vector):** Unique pour chaque fichier
- **Authentification:** Tag d'authentification pour détecter toute modification

### Stockage Sécurisé

- **Fichiers stockés par utilisateur** dans `uploads/user_{userId}/`
- **Isolation complète** entre utilisateurs
- **Permissions système** restrictives
- **Pas d'accès croisé** possible

## 📊 Journalisation et Traçabilité

Toutes les actions importantes sont journalisées pour :
- **Conformité RGPD** (traçabilité des accès)
- **Sécurité** (détection d'activités suspectes)
- **Audit** (vérification des accès aux données)

**Actions journalisées:**
- Export de données (Article 15)
- Suppression de données (Article 17)
- Export de portabilité (Article 20)
- Consentement RGPD
- Accès aux fichiers
- Modifications de compte

## 🚫 Ce que l'Application NE FAIT PAS

- ❌ **Ne partage pas** les données entre utilisateurs sans consentement explicite
- ❌ **Ne vend pas** les données à des tiers
- ❌ **Ne collecte pas** de données de tracking sans consentement
- ❌ **Ne permet pas** à l'admin d'accéder aux fichiers des utilisateurs
- ❌ **Ne stocke pas** les mots de passe en clair
- ❌ **Ne transmet pas** les données sans chiffrement

## ✅ Garanties de Conformité

1. **Isolation stricte** : Chaque utilisateur ne voit que ses données
2. **Chiffrement bout en bout** : Les fichiers sont chiffrés avant stockage
3. **Droits RGPD** : Tous les droits sont implémentés et accessibles
4. **Consentement explicite** : L'utilisateur doit accepter explicitement
5. **Transparence** : L'utilisateur peut voir toutes ses données
6. **Suppression définitive** : Possibilité de supprimer toutes les données
7. **Portabilité** : Export des données dans un format standard
8. **Journalisation** : Toutes les actions sont tracées

## 📞 Contact et Réclamations

Pour toute question concernant vos données personnelles ou pour exercer vos droits RGPD :

- **Email:** support@fylora.com
- **Délai de réponse:** Maximum 30 jours (conforme RGPD Article 12)

## 📚 Références Légales

- **RGPD (UE) 2016/679** : Règlement Général sur la Protection des Données
- **Article 15** : Droit d'accès
- **Article 17** : Droit à l'effacement
- **Article 20** : Droit à la portabilité
- **Article 7** : Conditions du consentement
- **Article 25** : Protection des données dès la conception et par défaut

---

**Dernière mise à jour:** 2026-01-03
**Version:** 1.0
**Statut:** ✅ Conforme RGPD

