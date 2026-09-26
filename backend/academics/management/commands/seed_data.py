"""
Peuple la base avec des donnees de demo pour la gestion des bulletins,
pour que les comptes de demo (admin@ecole.tg, prof@ecole.tg, ...) fonctionnent
immediatement contre l'API.

Usage : python manage.py seed_data [--flush]
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from academics.models import Classe, Matiere, Eleve, Note

DEMO_PASSWORD = 'password123'


class Command(BaseCommand):
    help = "Peuple la base avec les donnees de demo (gestion des bulletins)."

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Supprime les donnees existantes avant de re-peupler.')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Suppression des donnees existantes...')
            Note.objects.all().delete()
            Eleve.objects.all().delete()
            Matiere.objects.all().delete()
            Classe.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        # ------------------------------------------------------------ Users
        users_data = [
            dict(key='u1', username='admin', nom='Kouassi', prenom='Ama', email='admin@ecole.tg', role='admin'),
            dict(key='u2', username='kossi.agbodjan', nom='Agbodjan', prenom='Kossi', email='prof@ecole.tg', role='professeur'),
            dict(key='u5', username='sena.adjovi', nom='Adjovi', prenom='Sena', email='sena.adjovi@ecole.tg', role='professeur'),
            dict(key='u6', username='yao.bakoma', nom='Bakoma', prenom='Yao', email='yao.bakoma@ecole.tg', role='professeur'),
        ]
        users = {}
        for u in users_data:
            user, created = User.objects.update_or_create(
                email=u['email'],
                defaults=dict(username=u['username'], nom=u['nom'], prenom=u['prenom'], role=u['role'], is_staff=(u['role'] == 'admin')),
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            users[u['key']] = user
        self.stdout.write(self.style.SUCCESS(f'{len(users)} utilisateurs.'))

        # ---------------------------------------------------------- Classes
        classes_data = [
            dict(key='c1', nom='6ème A', niveau='Collège', effectif=38, prof='u2', annee='2024-2025'),
            dict(key='c2', nom='6ème B', niveau='Collège', effectif=35, prof='u5', annee='2024-2025'),
            dict(key='c3', nom='5ème A', niveau='Collège', effectif=40, prof='u5', annee='2024-2025'),
            dict(key='c4', nom='Terminale S', niveau='Lycée', effectif=32, prof='u6', annee='2024-2025'),
            dict(key='c5', nom='Première L', niveau='Lycée', effectif=28, prof='u6', annee='2024-2025'),
        ]
        classes = {}
        for c in classes_data:
            classe, _ = Classe.objects.update_or_create(
                nom=c['nom'],
                defaults=dict(niveau=c['niveau'], effectif=c['effectif'], professeur_principal=users[c['prof']], annee_scolaire=c['annee']),
            )
            classes[c['key']] = classe
        self.stdout.write(self.style.SUCCESS(f'{len(classes)} classes.'))

        # --------------------------------------------------------- Matieres
        matieres_data = [
            dict(key='m1', nom='Mathématiques', coeff=4, prof='u2', classe='c1', couleur='#2563a8'),
            dict(key='m2', nom='Français', coeff=4, prof='u5', classe='c1', couleur='#16a34a'),
            dict(key='m3', nom='Histoire-Géo', coeff=3, prof='u5', classe='c1', couleur='#d97706'),
            dict(key='m4', nom='SVT', coeff=3, prof='u5', classe='c1', couleur='#0891b2'),
            dict(key='m5', nom='Anglais', coeff=3, prof='u5', classe='c1', couleur='#7c3aed'),
            dict(key='m6', nom='Physique-Chimie', coeff=3, prof='u2', classe='c1', couleur='#dc2626'),
            dict(key='m7', nom='EPS', coeff=2, prof='u5', classe='c1', couleur='#f97316'),
            # 5ème A (c3) : Sena est titulaire mais n'enseigne pas les maths -> Kossi les enseigne ici
            dict(key='m8', nom='Mathématiques', coeff=4, prof='u2', classe='c3', couleur='#2563a8'),
            dict(key='m9', nom='Français', coeff=4, prof='u5', classe='c3', couleur='#16a34a'),
        ]
        matieres = {}
        for m in matieres_data:
            matiere, _ = Matiere.objects.update_or_create(
                nom=m['nom'], classe=classes[m['classe']],
                defaults=dict(coefficient=m['coeff'], professeur=users[m['prof']], couleur=m['couleur']),
            )
            matieres[m['key']] = matiere
        self.stdout.write(self.style.SUCCESS(f'{len(matieres)} matières.'))

        # ----------------------------------------------------------- Eleves
        eleves_data = [
            dict(key='e1', nom='Amedegnato', prenom='Koffi', naissance='2010-03-15', classe='c1', status='actif', adresse='Lomé, Tokoin', tel='+228 90 00 00 01'),
            dict(key='e2', nom='Blamey', prenom='Afi', naissance='2010-07-22', classe='c1', status='actif', adresse='Lomé, Adidogomé', tel='+228 90 00 00 02'),
            dict(key='e3', nom='Dossou', prenom='Yawo', naissance='2009-11-08', classe='c3', status='actif', adresse='Lomé, Bè', tel='+228 90 00 00 03'),
            dict(key='e4', nom='Gnassingbé', prenom='Akua', naissance='2011-01-30', classe='c2', status='actif', adresse='Lomé, Agbalépédogan', tel='+228 90 00 00 04'),
            dict(key='e5', nom='Ekoué', prenom='Mawuli', naissance='2007-05-12', classe='c4', status='actif', adresse='Lomé, Djidjolé', tel='+228 90 00 00 05'),
            dict(key='e6', nom='Foli', prenom='Enyonam', naissance='2008-09-19', classe='c5', status='actif', adresse='Lomé, Agoè', tel='+228 90 00 00 06'),
            dict(key='e7', nom='Goka', prenom='Delali', naissance='2010-12-03', classe='c1', status='actif', adresse='Lomé, Nyékonakpoè', tel='+228 90 00 00 07'),
            dict(key='e8', nom='Houngbé', prenom='Seyram', naissance='2009-04-25', classe='c3', status='inactif', adresse='Lomé, Cassablanca', tel='+228 90 00 00 08'),
        ]
        eleves = {}
        for e in eleves_data:
            eleve, _ = Eleve.objects.update_or_create(
                nom=e['nom'], prenom=e['prenom'],
                defaults=dict(
                    date_naissance=e['naissance'], classe=classes[e['classe']],
                    status=e['status'], adresse=e['adresse'], telephone=e['tel'],
                ),
            )
            eleves[e['key']] = eleve
        self.stdout.write(self.style.SUCCESS(f'{len(eleves)} élèves.'))

        # ------------------------------------------------------------ Notes
        notes_data = [
            dict(eleve='e1', matiere='m1', valeur=15.5, type='devoir', date='2024-10-10', trimestre=1),
            dict(eleve='e1', matiere='m1', valeur=12, type='examen', date='2024-11-20', trimestre=1),
            dict(eleve='e1', matiere='m2', valeur=14, type='devoir', date='2024-10-15', trimestre=1),
            dict(eleve='e1', matiere='m2', valeur=16, type='examen', date='2024-11-22', trimestre=1),
            dict(eleve='e1', matiere='m3', valeur=11.5, type='devoir', date='2024-10-18', trimestre=1),
            dict(eleve='e1', matiere='m4', valeur=13, type='interrogation', date='2024-10-22', trimestre=1),
            dict(eleve='e1', matiere='m5', valeur=17, type='devoir', date='2024-10-25', trimestre=1),
            dict(eleve='e1', matiere='m6', valeur=9.5, type='examen', date='2024-11-25', trimestre=1),
            dict(eleve='e2', matiere='m1', valeur=18, type='devoir', date='2024-10-10', trimestre=1),
            dict(eleve='e2', matiere='m2', valeur=13.5, type='examen', date='2024-11-22', trimestre=1),
            dict(eleve='e3', matiere='m8', valeur=7, type='devoir', date='2024-10-10', trimestre=1),
            dict(eleve='e3', matiere='m9', valeur=10, type='examen', date='2024-11-22', trimestre=1),
        ]
        for n in notes_data:
            Note.objects.get_or_create(
                eleve=eleves[n['eleve']], matiere=matieres[n['matiere']], valeur=n['valeur'],
                type=n['type'], date=n['date'], trimestre=n['trimestre'],
                defaults=dict(saisi_par=matieres[n['matiere']].professeur),
            )
        self.stdout.write(self.style.SUCCESS(f'{len(notes_data)} notes.'))

        self.stdout.write(self.style.SUCCESS('\nDonnées de démo prêtes.'))
        self.stdout.write('Mot de passe pour tous les comptes de démo : ' + self.style.WARNING(DEMO_PASSWORD))
        for u in users_data:
            self.stdout.write(f"  {u['role']:<12} {u['email']}")

        # L'admin de démo devient superutilisateur Django (accès à /admin/),
        # utile notamment quand le Shell n'est pas disponible (plan gratuit
        # Render) pour créer un compte admin autrement.
        admin_user = users['u1']
        if not admin_user.is_superuser or not admin_user.is_staff:
            admin_user.is_superuser = True
            admin_user.is_staff = True
            admin_user.save(update_fields=['is_superuser', 'is_staff'])
        self.stdout.write(self.style.SUCCESS(f'{admin_user.email} promu superutilisateur Django (/admin/).'))
