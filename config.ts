// Configuration de l'app
const ENV = {
  dev: {
    apiUrl: "http://localhost:3000",
  },
  prod: {
    apiUrl: "https://voyage-planner-backend.onrender.com", // Remplacez par votre URL Render
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
