# EduManage Pro

Plateforme de gestion des bulletins scolaires — backend Django (`backend/`) + frontend React (`ecole-platform/`).

Ce dépôt est structuré comme un **monorepo** : les deux projets vivent
côte à côte, déployés comme **deux projets Vercel séparés** à partir du
même dépôt GitHub. La base de données Postgres est hébergée sur
**[Neon](https://neon.tech)**.

## 1. Pousser le code sur GitHub

Depuis la racine de ce dossier (celle où se trouve ce README) :

```bash
git init
git add .
git commit -m "Initial commit — EduManage Pro"
```

Puis créez un nouveau dépôt **vide** sur [github.com/new](https://github.com/new)
(ne cochez ni README ni .gitignore ni licence — le dépôt doit être vide),
et connectez-le :

```bash
git remote add origin https://github.com/<votre-compte>/<nom-du-depot>.git
git branch -M main
git push -u origin main
```

## 2. Créer la base de données sur Neon

1. Créez un compte sur [neon.tech](https://neon.tech) (gratuit, pas de carte requise) —
   ou installez l'intégration **Neon** directement depuis le
   [Vercel Marketplace](https://vercel.com/marketplace) au moment de créer le
   projet backend (étape 3), ce qui remplit `DATABASE_URL` automatiquement.
2. Si vous créez le projet directement sur neon.tech : **New Project** → donnez-lui
   un nom (ex. `edumanage`) → région **AWS Europe centrale 1 (Francfort)**
   (pas de région Afrique chez Neon — Francfort est le point le plus proche
   et le mieux connecté au Togo/Afrique de l'Ouest parmi les options).
3. Sur la page du projet, section **Connection string** : choisissez le mode
   **Pooled connection** (important — Django ouvre plusieurs connexions
   simultanées en environnement serverless, la version "pooled" passe par
   PgBouncer et évite d'épuiser la limite de connexions du plan gratuit).
4. Copiez cette chaîne — elle ressemble à :
   `postgresql://<user>:<password>@ep-xxxx-pooler.<region>.aws.neon.tech/<db>?sslmode=require`
   Gardez-la de côté, elle sert de `DATABASE_URL` à l'étape suivante.

## 3. Déployer sur Vercel — deux projets à partir du même dépôt

Vercel prend en charge Django nativement (détection automatique de
`manage.py`, migrations lancées via `backend/vercel.json`, fichiers statiques
servis par son CDN) — pas de configuration serveur à gérer.

### Backend (API Django)

1. Sur [vercel.com](https://vercel.com/new), **Add New → Project** → importez
   votre dépôt GitHub.
2. **Root Directory** → cliquez sur *Edit* et choisissez `backend`.
   Vercel détecte automatiquement le framework Django.
3. Avant de cliquer sur *Deploy*, dépliez **Environment Variables** et ajoutez :

   | Variable | Valeur |
   |---|---|
   | `DJANGO_SECRET_KEY` | une valeur aléatoire longue (ex. générée avec `python -c "import secrets; print(secrets.token_urlsafe(50))"`) |
   | `DJANGO_DEBUG` | `False` |
   | `DJANGO_ALLOWED_HOSTS` | `.vercel.app` (couvre le domaine attribué automatiquement — voir aussi la note ci-dessous) |
   | `DATABASE_URL` | la chaîne de connexion Neon "Pooled connection" (étape 2) — déjà remplie automatiquement si vous êtes passé par l'intégration Neon du Marketplace |
   | `DJANGO_ADMIN_EMAIL` | votre vrai email admin |
   | `DJANGO_ADMIN_PASSWORD` | un mot de passe fort de votre choix |
   | `CORS_ALLOWED_ORIGINS` | laissez vide pour l'instant, à renseigner à l'étape 4 |

4. **Deploy**. Notez l'URL attribuée, du type `https://edumanage-backend.vercel.app`.

> Le backend détecte aussi automatiquement sa propre URL Vercel via la
> variable `VERCEL_URL` fournie par la plateforme (voir `edumanage/settings.py`) —
> `DJANGO_ALLOWED_HOSTS=.vercel.app` ci-dessus est une sécurité supplémentaire
> qui n'est utile que si vous branchez un domaine personnalisé plus tard.

### Frontend (React/Vite)

1. **Add New → Project** à nouveau, **même dépôt GitHub**.
2. **Root Directory** → `ecole-platform`. Vercel détecte le framework Vite
   automatiquement (build command `npm run build`, dossier `dist`).
3. **Environment Variables** :

   | Variable | Valeur |
   |---|---|
   | `VITE_API_URL` | l'URL du backend (étape précédente) **+ `/api`**, ex. `https://edumanage-backend.vercel.app/api` |

4. **Deploy**. Notez l'URL, du type `https://edumanage-frontend.vercel.app`.

## 4. Relier les deux projets (obligatoire)

Une fois les deux projets déployés une première fois, allez dans
**Settings → Environment Variables** de chaque projet Vercel et définissez :

| Projet | Variable | Valeur |
|---|---|---|
| **backend** | `CORS_ALLOWED_ORIGINS` | `https://edumanage-frontend.vercel.app` (l'URL exacte du frontend, sans `/` final) |
| **frontend** | `VITE_API_URL` | *(déjà fait à l'étape 3, à vérifier)* |

Après avoir changé une variable, allez dans l'onglet **Deployments** du
projet concerné et relancez un déploiement (**Redeploy**) — une variable
d'environnement modifiée n'est prise en compte qu'au prochain déploiement,
et une variable `VITE_...` est de toute façon figée au moment du build.

## 5. Seul le compte admin est créé automatiquement

`backend/vercel.json` exécute `python manage.py migrate` puis
`python manage.py create_admin` à chaque déploiement — **un seul compte est
créé, l'admin, promu superutilisateur Django** (accès à `/admin/`). Aucune
fausse donnée de démo (pas de classes, élèves ou profs fictifs) : c'est un
vrai départ propre.

Relancer `create_admin` à un déploiement suivant ne réinitialise jamais un
mot de passe déjà changé — sans danger.

Une fois connecté avec ce compte, c'est à l'admin de créer les comptes
Professeur depuis la page **"Comptes"** de l'interface, et les élèves
depuis la page **"Élèves"**.

*Pour tester rapidement avec des données factices (démo/développement
uniquement), la commande `python manage.py seed_data` existe toujours
localement — voir `backend/README.md`. Ne l'utilisez pas en production.*

## 6. Vérifier

- Backend : `https://edumanage-backend.vercel.app/api/auth/login/` doit
  répondre (405 Method Not Allowed sur un GET est normal — c'est un
  endpoint POST uniquement, ça prouve juste que le serveur répond).
- Frontend : ouvrez l'URL du frontend, l'écran de connexion doit s'afficher,
  et la connexion avec le compte admin (`DJANGO_ADMIN_EMAIL`/`DJANGO_ADMIN_PASSWORD`)
  doit fonctionner.

## 7. Installer l'application (PWA)

Le frontend est une **Progressive Web App** : n'importe qui peut l'installer
depuis son navigateur, sans passer par un store — une icône apparaît sur
l'écran d'accueil (mobile) ou dans les applications (ordinateur), et elle
s'ouvre en plein écran comme une appli native. Rien à faire côté
configuration, c'est déjà actif une fois le frontend déployé — il suffit
d'ouvrir son URL et d'installer :

**Android (Chrome)** : ouvrez le site → une icône d'installation apparaît
dans la barre d'adresse, ou menu ⋮ → **"Installer l'application"**.

**iPhone/iPad (Safari)** : ouvrez le site → bouton **Partager** (le carré
avec une flèche) → **"Sur l'écran d'accueil"**. *(Safari ne propose pas
d'installation automatique — c'est la seule façon sur iOS, une limitation
d'Apple et non de l'application.)*

**Ordinateur (Chrome/Edge)** : une icône d'installation ⊕ apparaît à droite
de la barre d'adresse → cliquez → **"Installer"**.

**Important à savoir** : l'application a toujours besoin d'une connexion
internet pour fonctionner (les notes, bulletins... viennent du serveur en
temps réel). Ce que le mode PWA accélère, c'est le chargement de
l'interface elle-même (elle démarre plus vite, avec une icône et un écran
de démarrage), pas un accès hors-ligne aux données.

## Limites des plans gratuits à connaître

- Vercel (plan Hobby) exécute le backend comme une fonction serverless : pas
  de "mise en veille" comme sur d'autres plateformes, mais chaque fonction a
  une limite de durée d'exécution (par défaut 10s sur le plan gratuit) —
  largement suffisant pour des requêtes API classiques.
- Neon (plan gratuit) met en pause le calcul après ~5 minutes d'inactivité —
  la première requête après une pause peut être un peu plus lente le temps
  qu'il se réactive, mais les données ne sont jamais perdues.
- Neon gratuit limite le stockage (0.5 Go) et le temps de calcul mensuel —
  largement suffisant pour une démo ou un petit établissement, à surveiller
  si l'usage grandit.

## Alternative : déploiement sur Render

Ce dépôt contient aussi `render.yaml` à la racine, qui permet un déploiement
en un clic sur [Render](https://render.com) (Blueprint) avec la même base
Neon — utile si vous préférez éviter le modèle serverless de Vercel pour le
backend. Voir l'historique du README ou `render.yaml` pour le détail des
variables ; les étapes 1 et 2 ci-dessus (GitHub, Neon) restent identiques.

## Structure du dépôt

```
.
├── render.yaml          <- Blueprint Render (déploiement alternatif)
├── backend/             <- API Django (voir backend/README.md)
│   └── vercel.json      <- Build Vercel : migrations + compte admin
└── ecole-platform/      <- Frontend React/Vite (voir ecole-platform/README.md)
```
