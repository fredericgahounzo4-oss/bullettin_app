from django.contrib import admin
from .models import Classe, Matiere, Eleve, Note


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ('nom', 'niveau', 'effectif', 'professeur_principal', 'annee_scolaire')
    list_filter = ('niveau', 'annee_scolaire')
    search_fields = ('nom',)


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ('nom', 'classe', 'professeur', 'coefficient')
    list_filter = ('classe',)
    search_fields = ('nom',)


@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = ('nom', 'prenom', 'classe', 'status')
    list_filter = ('classe', 'status')
    search_fields = ('nom', 'prenom')


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('eleve', 'matiere', 'valeur', 'type', 'trimestre', 'date')
    list_filter = ('matiere__classe', 'type', 'trimestre')
    search_fields = ('eleve__nom', 'eleve__prenom')
