# Configuration Google Places API

## Vue d'ensemble
L'application utilise Google Places API pour l'autocomplétion des destinations lors de la création d'un voyage.

## Étapes de configuration

### 1. Créer un projet Google Cloud
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez la facturation pour le projet (API gratuite jusqu'à une certaine limite)

### 2. Activer l'API Google Places
1. Dans le menu de navigation, allez à **APIs & Services > Library**
2. Recherchez "Places API"
3. Cliquez sur **Places API** et activez-la

### 3. Créer une clé API
1. Allez à **APIs & Services > Credentials**
2. Cliquez sur **Create Credentials > API Key**
3. Copiez la clé API générée

### 4. Restreindre la clé API (recommandé)
1. Cliquez sur la clé que vous venez de créer
2. Sous **API restrictions**, sélectionnez "Restrict key"
3. Sélectionnez uniquement **Places API**
4. Sous **Application restrictions**, vous pouvez:
   - Pour le développement: Ne pas restreindre
   - Pour la production: Restreindre aux identifiants de votre application

### 5. Configurer dans l'application
1. Ouvrez le fichier `app/new-trip/index.tsx`
2. Trouvez la ligne avec `key: 'YOUR_GOOGLE_PLACES_API_KEY'`
3. Remplacez `'YOUR_GOOGLE_PLACES_API_KEY'` par votre clé API:
   ```typescript
   query={{
     key: 'AIzaSyC_VOTRE_CLE_API_ICI',
     language: 'fr',
     types: '(cities)',
   }}
   ```

## Important - Sécurité

⚠️ **NE JAMAIS** committer votre clé API dans le code source!

Pour une meilleure sécurité:

### Option 1: Utiliser des variables d'environnement
1. Créez un fichier `.env` à la racine (déjà dans .gitignore):
   ```
   GOOGLE_PLACES_API_KEY=votre_clé_ici
   ```

2. Installez `react-native-dotenv`:
   ```bash
   npm install react-native-dotenv
   ```

3. Utilisez la variable:
   ```typescript
   import { GOOGLE_PLACES_API_KEY } from '@env';
   
   query={{
     key: GOOGLE_PLACES_API_KEY,
     language: 'fr',
     types: '(cities)',
   }}
   ```

### Option 2: Créer un fichier config (non versionné)
1. Créez `config/secrets.ts` (ajoutez ce fichier au .gitignore):
   ```typescript
   export const GOOGLE_PLACES_API_KEY = 'votre_clé_ici';
   ```

2. Utilisez-le dans le code:
   ```typescript
   import { GOOGLE_PLACES_API_KEY } from '../../config/secrets';
   ```

## Coûts et limites

- **Gratuit**: Jusqu'à $200 de crédit mensuel
- **Autocomplete**: ~$2.83 par 1000 requêtes (avec crédit gratuit)
- **Quota gratuit**: Environ 70,000 requêtes d'autocomplétion par mois

Plus d'infos: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

## Alternatives gratuites

Si vous ne voulez pas utiliser Google Places API, vous pouvez:

1. **Utiliser un champ texte simple** (comme avant les modifications)
2. **Utiliser Nominatim** (OpenStreetMap) - gratuit mais limité
3. **Créer une liste prédéfinie** de villes populaires

## Dépannage

### L'autocomplétion ne fonctionne pas
- Vérifiez que la clé API est correcte
- Vérifiez que Places API est activée dans Google Cloud Console
- Vérifiez la console pour les erreurs réseau
- Vérifiez que la facturation est activée (même pour le tier gratuit)

### Erreur "This API project is not authorized"
- La clé API n'est pas configurée correctement
- Places API n'est pas activée pour ce projet
- Les restrictions de la clé bloquent les requêtes

## Support

Pour plus d'informations:
- [Documentation Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Documentation react-native-google-places-autocomplete](https://github.com/FaridSafi/react-native-google-places-autocomplete)
