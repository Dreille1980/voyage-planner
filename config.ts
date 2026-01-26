// Configuration de l'app
const ENV = {
  dev: {
    // apiUrl: "http://10.1.0.216:3000", // IP locale (change localhost qui ne fonctionne pas sur iOS)
    apiUrl: "https://voyage-planner.onrender.com", // Utilise Render pour l'instant
  },
  prod: {
    apiUrl: "https://voyage-planner.onrender.com",
  },
};

// Détecte automatiquement l'environnement
const getEnvVars = () => {
  if (__DEV__) {
    return ENV.dev;
  }
  return ENV.prod;
};

export default getEnvVars();
