# MisFinanzas 💰

App web de control financiero personal — gastos, ingresos, cobros, tarjetas de crédito.

## Archivos del proyecto

```
misfinanzas/
├── index.html          ← La app (no tocar)
├── app.js              ← Lógica (no tocar)
├── firebase-config.js  ← ⭐ EDITA ESTE ARCHIVO con tus datos Firebase
├── manifest.json       ← Configuración PWA
└── README.md           ← Esta guía
```

---

## PASO 1 — Subir a GitHub Pages (para tener URL fija)

1. Ve a **github.com** y crea una cuenta (gratis)
2. Clic en **"New repository"**
   - Nombre: `misfinanzas`
   - Tipo: **Public**
   - Clic en **"Create repository"**
3. Clic en **"uploading an existing file"**
4. Arrastra los 4 archivos: `index.html`, `app.js`, `firebase-config.js`, `manifest.json`
5. Clic en **"Commit changes"**
6. Ve a **Settings → Pages → Source: Deploy from branch → Branch: main → / (root)**
7. Clic en **Save**
8. Espera 2 minutos y tu app estará en:
   **`https://TU_USUARIO.github.io/misfinanzas`**

¡Esa URL funciona en cualquier celular, tablet o computadora!

---

## PASO 2 — Conectar Firebase (datos en la nube)

1. Ve a **console.firebase.google.com** con tu cuenta Google
2. **"Agregar proyecto"** → nombre: `misfinanzas` → desactiva Analytics → **"Crear proyecto"**
3. Clic en el ícono **`</>`** (Web) → nombre: `web` → **"Registrar app"**
4. Copia el bloque `firebaseConfig` que aparece (tiene apiKey, projectId, etc.)
5. Ve a **Compilación → Firestore Database → Crear base de datos → Modo producción → us-east1 → Listo**
6. En Firestore → **Reglas** → reemplaza todo con:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   Clic en **Publicar**

7. **Edita el archivo `firebase-config.js`** con los valores copiados:
   ```js
   const FIREBASE_CONFIG = {
     apiKey:            "AIzaSy...",
     authDomain:        "misfinanzas-xxx.firebaseapp.com",
     projectId:         "misfinanzas-xxx",
     storageBucket:     "misfinanzas-xxx.appspot.com",
     messagingSenderId: "123456789",
     appId:             "1:123456789:web:abc123"
   };
   const USER_ID = "tu_nombre";  // Cámbialo por tu nombre sin espacios
   ```

8. Sube el archivo `firebase-config.js` actualizado a GitHub (reemplaza el anterior)

¡Listo! Tus datos se sincronizan en tiempo real entre todos tus dispositivos.

---

## Agregar al inicio del celular (como app)

### Android (Chrome):
1. Abre la URL de tu app en Chrome
2. Menú (⋮) → **"Añadir a pantalla de inicio"**
3. Se instala como app nativa

### iPhone (Safari):
1. Abre la URL en Safari
2. Botón compartir → **"Añadir a pantalla de inicio"**

---

## Funcionalidades

- ✅ Registrar gastos con foto de evidencia (boleta, Yape)
- ✅ Indicar quién generó el gasto (Yo, Mamá, Anny, Carlos, Hermana de Anny, otro)
- ✅ Cobros automáticos vinculados al gasto — fecha límite calculada por tarjeta
- ✅ Registrar pagos parciales o completos de cada persona
- ✅ Ver estado en tiempo real: Pendiente / Parcial / Pagado
- ✅ Aplazar cobros al siguiente ciclo de facturación
- ✅ Control de 4 tarjetas de crédito con fechas exactas
- ✅ Flujo de dinero de Mamá (efectivo / Yape)
- ✅ Balance mensual con distribución 50/20/10
- ✅ Editar cualquier registro con botón ✏
- ✅ Backup en JSON y exportar a Excel (CSV)
- ✅ Funciona offline — datos locales como respaldo
- ✅ Instalable como app en cualquier celular
