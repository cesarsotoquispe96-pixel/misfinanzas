// ═══════════════════════════════════════════════════════
//  CONFIGURACIÓN DE FIREBASE
//  Edita este archivo con los datos de tu proyecto Firebase
// ═══════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "PEGA_AQUI_TU_apiKey",
  authDomain:        "PEGA_AQUI_TU_authDomain",
  projectId:         "PEGA_AQUI_TU_projectId",
  storageBucket:     "PEGA_AQUI_TU_storageBucket",
  messagingSenderId: "PEGA_AQUI_TU_messagingSenderId",
  appId:             "PEGA_AQUI_TU_appId"
};

// Tu identificador de usuario — cámbialo por tu nombre sin espacios
// Esto asegura que tus datos sean privados aunque otros usen el mismo proyecto
const USER_ID = "usuario_principal";

export { FIREBASE_CONFIG, USER_ID };
