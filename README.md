# ⚽ ISIFOOT — Application Mobile

Application de gestion du terrain de football de l'**ISIMA Mahdia**.
Développée en React Native avec un backend Supabase.

---

## 📁 Structure du projet

```
ISIFOOT/
├── App.js                          # Point d'entrée React Native
├── index.js                        # Enregistrement AppRegistry
├── app.json                        # Nom de l'app
├── package.json                    # Dépendances
├── babel.config.js
├── supabase/
│   └── schema.sql                  # ← Schéma BDD complet à importer dans Supabase
└── src/
    ├── navigation/
    │   └── AppNavigator.js         # Navigation (auth guard inclus)
    ├── screens/
    │   ├── AuthScreen.js           # 🔐 Connexion / Inscription
    │   ├── HomeScreen.js           # 🏠 Dashboard
    │   ├── PlanningScreen.js       # 📅 Calendrier du terrain
    │   ├── ReservationScreen.js    # 🔖 Réserver / Mes réservations
    │   ├── FixturesScreen.js       # ⚽ Matches / Rejoindre équipe
    │   └── ProfileScreen.js        # 👤 Profil & statistiques
    └── services/
        ├── supabase.js             # 🔑 Client Supabase (à configurer)
        ├── authService.js          # Authentification
        ├── reservationService.js   # CRUD réservations
        └── fixtureService.js       # CRUD fixtures / joueurs
```

---

## 🚀 Installation & Lancement

### Étape 1 — Cloner et installer

```powershell
# Dans votre dossier de projets
cd C:\Users\Mega-PC\Documents

# Copier/déplacer le dossier ISIFOOT ici, puis :
cd ISIFOOT
npm install
```

### Étape 2 — Configurer Supabase

1. Allez sur [https://supabase.com](https://supabase.com) et créez un **nouveau projet**
2. Nommez-le `isifoot`, choisissez une région proche (ex: EU West)
3. Attendez que le projet se crée (1-2 minutes)
4. Allez dans **SQL Editor** → New Query → Collez tout le contenu de `supabase/schema.sql` → **Run**
5. Allez dans **Project Settings → API** :
   - Copiez **Project URL**
   - Copiez **anon public key**
6. Créez un fichier `.env` à la racine (vous pouvez copier `.env.example`) et ajoutez :

```env
SUPABASE_URL=https://abcdefghij.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

### Étape 3 — Activer Email Auth dans Supabase

1. **Authentication → Providers → Email** : activé par défaut ✅
2. **Authentication → Settings** → désactivez "Confirm email" pendant le dev
   (ou laissez activé pour la production)

### Étape 4 — Lancer l'application

```powershell
# Démarrer Metro bundler
npx react-native start

# Dans un nouveau terminal PowerShell :
npx react-native run-android
```

> Assurez-vous qu'un émulateur Android est démarré dans Android Studio
> (AVD Manager → Play sur un émulateur API 35 ou 36)

---

## 🔧 Dépannage courant

### Erreur "Unable to load script"
```powershell
npx react-native start --reset-cache
```

### Erreur Gradle
```powershell
cd android
.\gradlew clean
cd ..
npx react-native run-android
```

### AsyncStorage warning
Déjà inclus dans les dépendances. Si erreur :
```powershell
npm install @react-native-async-storage/async-storage
```

---

## 📱 Fonctionnalités

| Feature | Écran | Description |
|---------|-------|-------------|
| 🔐 Auth | AuthScreen | Connexion + Inscription avec validation complète |
| 🏠 Dashboard | HomeScreen | Vue d'ensemble, actions rapides, matchs à venir |
| 📅 Planning | PlanningScreen | Calendrier hebdomadaire, créneaux libres/occupés |
| 🔖 Réservation | ReservationScreen | Réserver un créneau, voir/annuler ses réservations |
| ⚽ Fixtures | FixturesScreen | Voir les matchs, rejoindre/quitter une équipe |
| 👤 Profil | ProfileScreen | Infos perso, stats, modifier profil, déconnexion |

---

## 🗄️ Schéma Base de données

| Table | Description |
|-------|-------------|
| `profiles` | Infos utilisateurs (étend auth.users) |
| `reservations` | Réservations du terrain |
| `fixtures` | Matchs associés aux réservations |
| `fixture_players` | Joueurs inscrits dans chaque match |

Toutes les tables ont **Row Level Security (RLS)** activé.

---

## 🔗 Git — Initialisation

```powershell
cd C:\Users\Mega-PC\Documents\ISIFOOT
git init
git add .
git commit -m "feat: initial ISIFOOT app with Supabase backend"

# Créez un repo sur GitHub, puis :
git remote add origin https://github.com/VOTRE_USERNAME/isifoot.git
git push -u origin main
```

Ajoutez un `.gitignore` :
```
node_modules/
android/
ios/
.env
*.keystore
```

---

## 👨‍💻 Développeurs

**Dhia Edinne Bejaoui & Rayen Ben Maaoui** — GLSI2C, ISIMA Mahdia

---

## Reservation Confirmation + Reminder + Chat (New)

This project now supports:

- `pending_confirmation` reservations (email confirmation required)
- auto-cancel after 15 minutes without confirmation
- reservation visibility: `private` or `public`
- public reservations create public fixtures that users can join
- group chat per public fixture
- push-token storage and scheduled 2-hour reminder function

### 1. Re-run SQL schema

Run `supabase/schema.sql` again in Supabase SQL Editor to apply new columns/tables/functions/policies.

### 2. Deploy Edge Functions

```powershell
supabase functions deploy send-reservation-confirmation
supabase functions deploy confirm-reservation
supabase functions deploy send-match-reminders
```

### 3. Set required secrets

```powershell
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set RESERVATION_FROM_EMAIL="ISIFOOT <no-reply@yourdomain.com>"
```

Optional (for push reminders): install and configure `expo-notifications` (recommended), or Firebase messaging if you will wire your own FCM sender.

### 4. Schedule reminders function

Use Supabase Dashboard:
- Go to **Edge Functions > send-match-reminders > Schedules**
- Add schedule every 5 minutes (or 1 minute for testing)

The function sends reminders for reservations starting in ~2 hours.
