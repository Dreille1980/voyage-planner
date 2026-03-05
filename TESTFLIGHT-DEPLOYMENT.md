# 🚀 Déploiement TestFlight - Guide Rapide

## ✅ Ce qui a été fait

1. ✅ **Documents légaux créés**
   - Privacy Policy: `docs/privacy-policy.md` et `.html`
   - Terms of Service: `docs/terms-of-service.md` et `.html`
   - Page d'accueil: `docs/index.html`
   - Committés et poussés vers GitHub

2. ✅ **Configuration**
   - Backend URL configurée: `https://voyage-planner.onrender.com`
   - Build number iOS incrémenté: **3**
   - EAS connection vérifiée: connecté comme **dreille**

## 📋 Prochaines étapes

### Étape 1: Activer GitHub Pages (MAINTENANT)

1. Ouvrez: https://github.com/Dreille1980/voyage-planner/settings/pages
2. Sous "Source", sélectionnez:
   - **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs**
3. Cliquez sur **Save**
4. Attendez 1-2 minutes, puis vérifiez: https://dreille1980.github.io/voyage-planner/

Vos URLs finales seront:
- **Privacy Policy**: https://dreille1980.github.io/voyage-planner/privacy-policy.html
- **Terms of Service**: https://dreille1980.github.io/voyage-planner/terms-of-service.html

### Étape 2: Lancer le Build iOS (APRÈS activation GitHub Pages)

```bash
cd /Users/freddreyer/voyage-planner
npm run build:ios:prod
```

Ou avec EAS CLI directement:
```bash
npx eas build --profile production --platform ios
```

Le build prendra **15-20 minutes**. EAS vous demandera:
- ✅ Approbation pour créer les certificats Apple (acceptez)
- ✅ Configuration du provisioning profile (acceptez)

### Étape 3: Soumettre à TestFlight (APRÈS le build)

Une fois le build terminé, soumettez-le:

```bash
npm run submit:ios
```

Ou:
```bash
npx eas submit --platform ios
```

Vous aurez besoin de:
- **Apple ID** (email): votre email de développeur Apple
- **App-Specific Password**: à générer sur https://appleid.apple.com
  1. Allez dans "Sign-in and Security"
  2. "App-Specific Passwords"
  3. Générez un nouveau mot de passe
  4. Copiez-le et utilisez-le pour la soumission

### Étape 4: Configurer App Store Connect

1. Allez sur: https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Remplissez:
   - **Platform**: iOS
   - **Name**: Voyage Planner
   - **Primary Language**: French - France
   - **Bundle ID**: com.dreille.voyageplanner
   - **SKU**: voyageplanner

4. **App Information**:
   - **Category**: Primary: Travel, Secondary: Productivity
   - **Privacy Policy URL**: https://dreille1980.github.io/voyage-planner/privacy-policy.html
   - **Support URL**: (votre site web ou GitHub: https://github.com/Dreille1980/voyage-planner)

5. **Version Information** (après upload):
   - **What's New**: "Première version de Voyage Planner - Planifiez vos voyages avec l'IA"
   - **Description**: 
     ```
     Voyage Planner vous aide à organiser vos voyages de manière simple et efficace.
     
     Fonctionnalités:
     • Planification de voyages avec assistant IA intelligent
     • Gestion de destinations multiples
     • Listes de vérification personnalisées
     • Synchronisation sécurisée de vos données
     
     Utilisez l'intelligence artificielle pour obtenir des recommandations personnalisées et planifier le voyage parfait!
     ```
   - **Keywords**: voyage, planification, IA, assistant, travel, trip
   - **Screenshots**: (à prendre depuis votre iPhone/simulateur)

6. **TestFlight**:
   - Le build apparaîtra automatiquement après soumission
   - Ajoutez des testeurs internes/externes
   - Testez l'app avant de soumettre pour review

## 🎯 Timeline estimé

| Étape | Temps |
|-------|-------|
| Activer GitHub Pages | 2 minutes |
| Build iOS (EAS) | 15-20 minutes |
| Soumission TestFlight | 5 minutes |
| Processing par Apple | 10-30 minutes |
| **Total** | **~30-60 minutes** |

## ⚠️ Important

### Avant de soumettre pour review App Store:

1. **Testez l'app via TestFlight** pendant quelques jours
2. **Vérifiez** que le backend fonctionne correctement
3. **Prenez des screenshots** pour l'App Store:
   - iPhone 6.7" (iPhone 15 Pro Max): minimum 2 screenshots
   - iPhone 5.5" (iPhone 8 Plus): minimum 2 screenshots
4. **Préparez l'icône de l'app** (1024x1024)
5. **Vérifiez les URLs légales** fonctionnent

### Informations requises pour App Store Review:

- **App Review Information**:
  - First Name: Frederic
  - Last Name: Dreyer
  - Email: dreyerfred@gmail.com
  - Phone: (votre numéro)

- **Demo Account** (si nécessaire):
  - Username: (créez un compte de test)
  - Password: (mot de passe du compte de test)

## 🔄 Mises à jour futures

Pour les prochaines versions:

1. Incrémentez `buildNumber` dans `app.json`
2. Mettez à jour `version` si nécessaire (ex: "1.0.1")
3. Relancez le build: `npm run build:ios:prod`
4. Soumettez: `npm run submit:ios`

## 📞 Support

- **Expo EAS**: https://docs.expo.dev/build/introduction/
- **App Store Connect**: https://developer.apple.com/support/app-store-connect/
- **TestFlight**: https://developer.apple.com/testflight/

---

**Bon déploiement! 🎉**
