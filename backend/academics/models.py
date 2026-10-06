from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


ORIENTATIONS_BULLETIN = [
    ('portrait', 'Portrait (vertical)'),
    ('paysage', 'Paysage (horizontal)'),
]

MODELES_BULLETIN = [
    ('standard', 'Standard (trimestre)'),
    ('lycee_semestre', 'Lycée — Semestre (sections littéraires / scientifiques / facultatives)'),
    ('lycee_semestre_2', 'Lycée — Semestre (liste simple avec signatures)'),
    ('college_trimestre', 'Collège — Trimestre (bulletin d\'évaluation)'),
]


class Classe(models.Model):
    nom = models.CharField(max_length=50, unique=True)
    niveau = models.CharField(max_length=50)  # ex: "Collège", "Lycée", "Primaire"
    effectif = models.PositiveIntegerField(default=0)
    professeur_principal = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='classes_titulaire',
        limit_choices_to={'role': 'professeur'},
        help_text="Le titulaire de la classe : voit le bulletin complet, même s'il n'enseigne pas toutes les matières.",
    )
    annee_scolaire = models.CharField(max_length=20, default='2024-2025')
    couleur_bulletin = models.CharField(
        max_length=7, blank=True, default='',
        help_text="Couleur d'accent du bulletin de cette classe (ex. #2563a8). Vide = couleur par défaut de l'établissement.",
    )
    orientation_bulletin = models.CharField(
        max_length=10, choices=ORIENTATIONS_BULLETIN, default='portrait',
        help_text="Orientation de la page (portrait ou paysage) pour l'impression / le PDF des bulletins de cette classe.",
    )
    modele_bulletin = models.CharField(
        max_length=30, choices=MODELES_BULLETIN, default='standard',
        help_text="Modèle d'impression du bulletin de cette classe (choisi par le titulaire ou l'admin).",
    )
    couleur_fond_bulletin = models.CharField(
        max_length=7, blank=True, default='',
        help_text="Couleur de fond du bulletin de cette classe (ex. #ffffff). Vide = couleur par défaut de l'établissement.",
    )

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Matiere(models.Model):
    nom = models.CharField(max_length=100)
    coefficient = models.PositiveSmallIntegerField(default=1)
    professeur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='matieres_enseignees',
        limit_choices_to={'role': 'professeur'},
    )
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='matieres')
    couleur = models.CharField(max_length=7, default='#2563a8')
    compte_dans_moyenne = models.BooleanField(
        default=True,
        help_text="Si coché, les points de cette matière (y compris EPS et autres matières facultatives) "
                  "entrent dans le total des points, le total des coefficients et la moyenne.",
    )

    class Meta:
        ordering = ['classe', 'nom']
        unique_together = ('nom', 'classe')

    def __str__(self):
        return f'{self.nom} ({self.classe.nom})'


class Eleve(models.Model):
    class Status(models.TextChoices):
        ACTIF = 'actif', 'Actif'
        INACTIF = 'inactif', 'Inactif'

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    classe = models.ForeignKey(Classe, on_delete=models.PROTECT, related_name='eleves')
    photo = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIF)
    adresse = models.CharField(max_length=255, blank=True)
    telephone = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ['classe', 'nom', 'prenom']

    def __str__(self):
        return f'{self.prenom} {self.nom}'


class Note(models.Model):
    class Type(models.TextChoices):
        DEVOIR = 'devoir', 'Devoir'
        EXAMEN = 'examen', 'Composition'
        INTERROGATION = 'interrogation', 'Interrogation'

    class Trimestre(models.IntegerChoices):
        T1 = 1, 'Trimestre 1'
        T2 = 2, 'Trimestre 2'
        T3 = 3, 'Trimestre 3'

    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name='notes')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='notes')
    valeur = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(20)])
    type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    commentaire = models.CharField(max_length=255, blank=True)
    trimestre = models.PositiveSmallIntegerField(choices=Trimestre.choices)
    saisi_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes_saisies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f'{self.eleve} — {self.matiere.nom}: {self.valeur}/20'
