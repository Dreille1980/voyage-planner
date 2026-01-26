# 🚀 Guide de Déploiement - Voyage Planner

Ce guide vous accompagne étape par étape pour déployer votre application en production.

---

## 📋 Prérequis

### Comptes Nécessaires
- ✅ Compte Apple Developer ($99/an) - **Vous l'avez déjà**
- ⏳ Compte Google Play Developer ($25 one-time) - **À créer**
- ✅ Compte Expo/EAS - **Gratuit**
- ✅ Compte Render.com - **À upgrader vers payant**
- ✅ Clé API OpenAI - **Vous l'avez**

---

## 🔐 ÉTAPE 1: Générer les Secrets de Production

### 1.1 Générer JWT Secrets

```bash
# JWT Access Token Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Refresh Token Secret  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ IMPORTANT:** Sauvegardez ces secrets dans un endroit sécurisé (gestionnaire de mots de passe)!

### 1.2 Créer le fichier backend/.env LOCAL (pour tests)

```bash
cd backend
cp .env.example .env
```

Éditez `backend/.env` avec vos vraies valeurs:

```env
# OpenAI
OPENAI_API_KEY=sk-votre-vraie-clé

# JWT Secrets (générés ci-dessus)
JWT_SECRET=votre-secret-généré-access
JWT_REFRESH_SECRET=votre-secret-généré-refresh
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Base de données (laissez vide pour SQLite local)
# DATABASE_URL=

# Serveur
PORT=3000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:8081
FRONTEND_URL_PROD=https://voyage-planner-backend.onrender.com
```

---

## 🖥️ ÉTAPE 2: Déploiement Backend sur Render

### 2.1 Upgrade vers Plan Payant

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service `voyage-planner-backend`
3. Settings → Plan → **Upgrade to Starter ($7/mois)**

### 2.2 Ajouter PostgreSQL Database

1. Dashboard → **New +** → **PostgreSQL**
2. Name: `voyage-planner-db`
3. Database: `voyageplanner`
4. User: `voyageplanner`
5. Region: **Oregon** (même que votre backend)
6. Plan: **Starter ($7/mois)**
7. Créer la database

### 2.3 Configurer les Variables d'Environnement

Dans votre service backend sur Render:
Settings → Environment Variables → **Add Environment Variable**

Ajoutez ces variables:

```
NODE_ENV=production
PORT=3000

# Database (copier depuis votre PostgreSQL database info)
DATABASE_URL=<coller-internal-database-URL-depuis-render>

# JWT Secrets (ceux générés à l'étape 1.1)
JWT_SECRET=<votre-secret-access>
JWT_REFRESH_SECRET=<votre-secret-refresh>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=<votre-clé-openai>

# Frontend (mettre l'URL de votre app quand disponible)
FRONTEND_URL_PROD=https://votre-app-url.com
```

### 2.4 Redéployer

Après avoir configuré les variables:
- Manual Deploy → **Clear build cache & deploy**
- Attendez ~2-3 minutes
- Vérifiez: `https://voyage-planner-backend.onrender.com/health` doit retourner `{"ok": true}`

---

## 📱 ÉTAPE 3: Configuration EAS Build

### 3.1 Installer EAS CLI Globalement

```bash
# macOS/Linux avec sudo
sudo npm install -g eas-cli

# OU via npx (sans installation)
npx eas-cli --version
```

### 3.2 Login à Expo

```bash
npx eas login
# Entrez vos credentials Expo
```

### 3.3 Configurer le Projet

```bash
npx eas build:configure
```

Cela va:
- Créer un projet EAS
- Générer un `projectId`
- Mettre à jour `app.json`

### 3.4 Personnaliser les Identifiers

Éditez `app.json` et `eas.json` pour remplacer:
- `com.votrecompagnie.voyageplanner` → `com.VOTRENOM.voyageplanner`
- `votre-username-expo` → votre vraitable username Expo

### 3.5 Mettre à Jour config.ts

Éditez `config.ts` pour pointer vers votre backend Render:

```typescript
const ENV = {
  dev: {
    apiUrl: "http://10.1.0.216:3000", // Votre IP locale
  },
  prod: {
    apiUrl: "https://voyage-planner-backend.onrender.com",
  },
};
```

---

## 🍎 ÉTAPE 4: Build et Soumission iOS

### 4.1 Premier Build de Développement

```bash
npx eas build --profile development --platform ios
```

Suivez les instructions pour:
- Configurer les certificats Apple
- Créer le provisioning profile
- Le build prendra ~15-20 minutes

### 4.2 Build pour TestFlight

```bash
npx eas build --profile production --platform ios
```

### 4.3 Soumission à l'App Store

```bash
npx eas submit --platform ios
```

Vous aurez besoin de:
- **Apple ID** (email de votre compte développeur)
- **App-Specific Password** (à générer sur appleid.apple.com)
- **Team ID** (trouvable sur developer.apple.com)

### 4.4 App Store Connect

1. Allez sur [App Store Connect](https://appstoreconnect.apple.com/)
2. **My Apps** → **+** → **New App**
3. Remplissez:
   - Platform: iOS
   - Name: Voyage Planner
   - Primary Language: French
   - Bundle ID: com.VOTRENOM.voyageplanner
   - SKU: voyageplanner

4. **App Information:**
   - Subtitle: "Planifiez vos voyages avec l'IA"
   - Category: Travel
   - Privacy Policy URL: (à créer)

5. **Prepare for Submission:**
   - Screenshots (requis pour 6.5" et 5.5" displays)
   - App Preview (optionnel)
   - Description
   - Keywords
   - Support URL
   - Marketing URL (optionnel)

6. **Pricing:** Gratuit (ou votre stratégie)

7. **Submit for Review**

---

## 🤖 ÉTAPE 5: Build et Soumission Android

### 5.1 Créer Compte Google Play Developer

1. Allez sur [Google Play Console](https://play.google.com/console)
2. Payez les $25 (one-time)
3. Remplissez les informations légales

### 5.2 Créer l'Application

1. **Create app**
2. App name: **Voyage Planner**
3. Default language: French
4. App type: Application
5. Free or Paid: Free
6. Accept declarations

### 5.3 Premier Build

```bash
npx eas build --profile production --platform android
```

Le fichier `.aab` sera généré.

### 5.4 Upload sur Google Play

```bash
npx eas submit --platform android
```

OU manuellement:
1. Google Play Console → votre app
2. Production → **Create new release**
3. Upload `.aab` file
4. Release notes
5. Save → Review release → Start rollout

### 5.5 Remplir le Store Listing

**Store presence → Main store listing:**
- Short description (80 chars)
- Full description (4000 chars)
- App icon (512x512)
- Feature graphic (1024x500)
- Screenshots (min 2)
- Phone screenshots (min 2)

**Store presence → Store settings:**
- App category: Travel & Local
- Tags (optionnel)

---

## 📄 ÉTAPE 6: Conformité Légale

### 6.1 Privacy Policy (REQUIS)

Créez une Privacy Policy incluant:

1. **Données collectées:**
   - Email, nom d'utilisateur
   - Informations de voyage (destination, dates)
   - Données générées par IA

2. **Utilisation des données:**
   - Génération de contenu personnalisé
   - Utilisation d'OpenAI API
   - Stockage sécurisé

3. **Partage des données:**
   - OpenAI pour génération de contenu
   - Aucun partage commercial

4. **Droits des utilisateurs:**
   - Accès aux données
   - Suppression de compte
   - Modification des informations

5. **Sécurité:**
   - Chiffrement des mots de passe
   - Tokens JWT sécurisés
   - HTTPS uniquement

### 6.2 Terms of Service

Incluez:
- Conditions d'utilisation
- Responsabilités
- Limitations de responsabilité
- Politique de remboursement (si applicable)

### 6.3 Héberger les Documents Légaux

Options:
- GitHub Pages (gratuit)
- Votre site web
- Service comme Termly.io ou iubenda.com

URLs à ajouter dans:
- App Store Connect
- Google Play Console
- Dans votre app (Settings screen)

---

## 🔍 ÉTAPE 7: Monitoring Post-Lancement

### 7.1 Sentry (Error Tracking)

```bash
npm install --save @sentry/react-native
npx @sentry/wizard -i reactNative
```

### 7.2 Firebase Analytics

```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

### 7.3 Uptime Monitoring

1. [UptimeRobot](https://uptimerobot.com/) - Gratuit
2. Monitor: `https://voyage-planner-backend.onrender.com/health`
3. Alert par email si down

---

## 📊 Checklist Finale

### Backend
- [x] Render sur plan payant
- [x] PostgreSQL configuré
- [x] Variables d'environnement en prod
- [x] Health check fonctionnel
- [x] HTTPS activé
- [ ] Backups automatiques configurés

### Mobile
- [ ] Bundle identifier configuré
- [ ] Certificats Apple créés
- [ ] Build EAS successful
- [ ] TestFlight beta envoyé
- [ ] Screenshots préparés
- [ ] Privacy Policy publiée
- [ ] Soumission App Store
- [ ] Google Play Developer account créé
- [ ] Build Android successful
- [ ] Soumission Google Play

### Légal
- [ ] Privacy Policy rédigée et publiée
- [ ] Terms of Service rédigés et publiés
- [ ] URL ajoutées aux store listings
- [ ] Data deletion process documenté

### Marketing
- [ ] Description app store optimisée
- [ ] Screenshots attractifs
- [ ] App icon professionnel
- [ ] Landing page (optionnel)

---

## 💰 Coûts Récapitulatifs

| Service | Coût | Fréquence |
|---------|------|-----------|
| Render Backend | $7 | /mois |
| Render PostgreSQL | $7 | /mois |
| OpenAI API | $10-50 | /mois (variable) |
| Apple Developer | $99 | /an |
| Google Play | $25 | one-time |
| EAS Build | $0 | Gratuit (limité) |
| **Total an 1** | **~$300-500** | |
| **Total récurrent** | **~$24-64** | /mois |

---

## 🆘 Troubleshooting

### Build EAS échoue
```bash
npx eas build:list
npx eas build:view <build-id>
```

### Backend ne répond pas
1. Vérifier logs Render
2. Vérifier DATABASE_URL
3. Vérifier JWT_SECRET défini

### App crash au démarrage
1. Vérifier config.ts pointe vers Render
2. Vérifier SecureStore fonctionne
3. Check Sentry logs

---

## 📞 Support

- **Expo Discord:** https://chat.expo.dev
- **Render Support:** support@render.com  
- **Documentation:**
  - [Expo EAS](https://docs.expo.dev/build/introduction/)
  - [Render Docs](https://render.com/docs)
  - [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Bon déploiement! 🚀**
