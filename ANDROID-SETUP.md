# Configuration Android pour Voyage Planner

## Étape 1: Lancer Android Studio (après installation)

Une fois l'installation terminée via Homebrew, Android Studio sera dans `/Applications/Android Studio.app`

Lancez-le avec:
```bash
open -a "Android Studio"
```

## Étape 2: Suivre l'assistant de configuration

Au premier démarrage:
1. **Welcome Screen** → Cliquez sur "Next"
2. **Install Type** → Sélectionnez "Standard" (recommandé)
3. **Verify Settings** → Vérifiez que ces composants seront installés:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
4. Cliquez sur "Finish" et attendez le téléchargement (peut prendre 10-30 minutes)

## Étape 3: Configurer les variables d'environnement

Ajoutez ces lignes à votre fichier `~/.zshrc`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Puis rechargez:
```bash
source ~/.zshrc
```

## Étape 4: Vérifier l'installation

```bash
# Vérifier que ANDROID_HOME est défini
echo $ANDROID_HOME

# Vérifier que adb est accessible
adb --version

# Vérifier que emulator est accessible
emulator -list-avds
```

## Étape 5: Créer un émulateur Android

### Option A: Via Android Studio (recommandé)
1. Ouvrez Android Studio
2. Allez dans **More Actions** → **Virtual Device Manager**
3. Cliquez sur **Create Device**
4. Sélectionnez un appareil (ex: Pixel 7)
5. Choisissez une image système (ex: **Tiramisu - API 33**)
6. Nommez votre AVD et cliquez sur "Finish"

### Option B: Via ligne de commande
```bash
# Lister les images système disponibles
sdkmanager --list | grep system-images

# Installer une image système
sdkmanager "system-images;android-33;google_apis;arm64-v8a"

# Créer un AVD
avdmanager create avd -n Pixel_7_API_33 -k "system-images;android-33;google_apis;arm64-v8a" -d "pixel_7"
```

## Étape 6: Lancer l'émulateur

```bash
# Via Android Studio
# Cliquez sur le bouton "Play" dans Device Manager

# OU via ligne de commande
emulator -avd Pixel_7_API_33
```

## Étape 7: Tester l'application

Dans le répertoire du projet:
```bash
# Assurez-vous que le backend est démarré
cd backend
npm run dev

# Dans un autre terminal, lancez l'app
cd /Users/freddreyer/voyage-planner
npx expo run:android
```

## Dépannage

### Si `adb` n'est pas trouvé
```bash
# Vérifier le chemin
ls -la ~/Library/Android/sdk/platform-tools/adb

# Ajouter explicitement au PATH
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
```

### Si l'émulateur ne démarre pas
```bash
# Vérifier la configuration de l'AVD
emulator -list-avds

# Lancer avec plus de logs
emulator -avd Pixel_7_API_33 -verbose
```

### Si Expo ne trouve pas l'appareil
```bash
# Redémarrer adb
adb kill-server
adb start-server

# Vérifier que l'appareil est détecté
adb devices
```

## Ressources

- [Documentation Android Studio](https://developer.android.com/studio)
- [Documentation Expo - Android](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Configurer l'émulateur Android](https://developer.android.com/studio/run/managing-avds)
