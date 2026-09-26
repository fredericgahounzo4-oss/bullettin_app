# EduManage Pro — Backend Django

API REST (Django + Django REST Framework + JWT) pour l'application de
**gestion des bulletins** : classes, matières, élèves, notes et bulletins.
Reproduit exactement les mêmes règles d'accès que le frontend React
(`src/utils/permissions.ts`) : titulaire de classe, matières enseignées, etc.

> Pour déployer sur Vercel + Neon (avec le frontend), voir le README à la
> racine du dépôt. Ce fichier couvre l'installation locale et la référence
> de l'API.

## Installation

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # puis éditez .env si besoin

python manage.py migrate
python manage.py seed_data        # charge les données de démo (identiques au frontend)
python manage.py runserver
```

L'API tourne sur `http://localhost:8000/`. Un compte admin Django existe déjà
parmi les comptes de démo (`admin@ecole.tg` a été promu superutilisateur par
`seed_data`) — accessible aussi via `/admin/`.

Comptes de démo (mot de passe unique : **`password123`**) :

| Rôle | Email | Particularité |
|---|---|---|
| Admin | admin@ecole.tg | accès complet + Django admin |
| Professeur | prof@ecole.tg | Kossi, titulaire de 6ème A |
| Professeur | sena.adjovi@ecole.tg | Sena, non-titulaire en 6ème A, titulaire de 6ème B et 5ème A |
| Professeur | yao.bakoma@ecole.tg | Yao, titulaire de Terminale S et Première L |

Pour repartir de zéro : `python manage.py seed_data --flush`.

**Pour un départ propre sans données factices** (ce qui est utilisé
automatiquement à chaque déploiement, voir `vercel.json` ou `build.sh`) :
```bash
python manage.py create_admin
```
Ne crée qu'un seul compte admin (superutilisateur), lu depuis les variables
d'environnement `DJANGO_ADMIN_EMAIL`/`DJANGO_ADMIN_PASSWORD` (par défaut :
`admin@ecole.tg` / `changeme123` — à changer). Ensuite, c'est à cet admin de
créer les comptes Professeur (page "Comptes") et les élèves (page "Élèves")
depuis l'interface.

## Connecter le frontend React

**C'est fait** — le frontend (`../ecole-platform`) est déjà branché sur cette
API (voir `../ecole-platform/README.md`). Il consomme les endpoints
ci-dessous via `src/api/`, avec les tokens JWT stockés côté client et
rafraîchis automatiquement.

## Authentification (JWT)

```
POST /api/auth/login/     { "email": "...", "password": "..." }  -> { access, refresh, user }
POST /api/auth/refresh/   { "refresh": "..." }                    -> { access }
GET  /api/auth/me/        (Authorization: Bearer <access>)        -> profil de l'utilisateur connecté
```

Toutes les autres routes exigent l'en-tête `Authorization: Bearer <access>`.
Il n'y a pas d'auto-inscription publique : seuls deux types de comptes
existent (Admin, Professeur), et seul l'admin peut créer un compte Professeur.

## Gestion des comptes (remplace le Django admin pour ça)

L'admin crée et gère les comptes Professeur directement depuis l'interface
(page "Comptes"), plus besoin du panneau `/admin/` de Django pour ça au
quotidien :

```
GET    /api/auth/users/?role=professeur      -> liste des comptes (accessible à tout utilisateur connecté,
                                                  en lecture seule et uniquement avec ce filtre — utile pour
                                                  afficher les noms des professeurs ailleurs dans l'appli ;
                                                  l'admin a en plus accès au détail et à l'écriture)
POST   /api/auth/users/                      -> créer un compte (role: professeur uniquement, admin uniquement)
                                                  { email, nom, prenom, role, password? }
                                                  Si password est omis, un mot de passe est généré
                                                  et renvoyé une seule fois dans generated_password.
PATCH  /api/auth/users/{id}/                 -> modifier nom/prenom/is_active (pas le rôle ni l'email)
POST   /api/auth/users/{id}/reset_password/  -> régénère un mot de passe { password? }
```

Ces routes rejettent toute tentative de créer un compte autre que Professeur
(400), et tout appel en écriture par un non-admin (403) — vérifié par les
tests d'intégration.

## Endpoints métier

Toutes les ressources sont exposées en REST standard (`GET` liste/détail,
`POST`, `PATCH`, `DELETE`) et **déjà filtrées côté serveur selon le rôle** —
le frontend n'a pas besoin de refaire ce filtrage, il reçoit uniquement ce
que l'utilisateur a le droit de voir :

| Endpoint | Contenu | Qui voit quoi |
|---|---|---|
| `/api/classes/` | Classes | Admin : tout. Professeur : ses classes (matière enseignée ou titulaire). Écriture : admin uniquement. |
| `/api/matieres/` | Matières | Même logique que `/classes/`. |
| `/api/eleves/` | Élèves | Admin : tous. Professeur : élèves de ses classes. Écriture : admin uniquement. |
| `/api/notes/` | Notes | Admin : tout. Professeur : ses matières + toutes les notes des classes dont il est **titulaire**. Écriture : un professeur ne peut noter que les matières qu'il enseigne réellement (vérifié serveur, même s'il est titulaire). |

Filtrage/pagination : tous les endpoints supportent `django-filter` et la
pagination standard DRF (`?page=2`), taille de page par défaut : 50.

## Où vivent les règles d'accès

- `academics/permissions.py` — fonctions pures (titulaire, matières
  enseignées, classes du prof...), **traduction directe** de
  `src/utils/permissions.ts` côté frontend. Gardez les deux synchronisés si
  vous changez une règle métier.
- `academics/views.py` — chaque `ViewSet.get_queryset()` applique ces règles
  pour la lecture ; `academics/serializers.py` (`NoteSerializer.validate`)
  applique la règle d'écriture (un prof ne note que sa matière).

## Prochaines étapes suggérées

- Remplacer SQLite par PostgreSQL en production (`DATABASE_URL`, déjà le cas
  sur Vercel/Render avec Neon — voir le README à la racine).
- Génération de bulletins PDF côté serveur (actuellement le frontend imprime
  via `window.print()`) — par ex. avec `WeasyPrint` ou `reportlab`.
- Déploiement : voir le README à la racine (Vercel + Neon, ou alternative
  Render via `render.yaml`). Pour un déploiement traditionnel sur un VPS,
  `gunicorn edumanage.wsgi` derrière Nginx, `DEBUG=False`,
  `DJANGO_ALLOWED_HOSTS` et `CORS_ALLOWED_ORIGINS` positionnés sur le vrai domaine.
