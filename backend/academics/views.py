from django.db.models import Q
from rest_framework import viewsets, permissions

from .models import Classe, Matiere, Eleve, Note
from .serializers import ClasseSerializer, MatiereSerializer, EleveSerializer, NoteSerializer
from .permissions import classes_du_professeur, eleves_du_professeur


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture pour tout utilisateur authentifié, écriture réservée à l'admin."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class ClasseViewSet(viewsets.ModelViewSet):
    serializer_class = ClasseSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Classe.objects.all()
        if user.role == 'professeur':
            return classes_du_professeur(user.id)
        return Classe.objects.none()


class MatiereViewSet(viewsets.ModelViewSet):
    serializer_class = MatiereSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Matiere.objects.all()
        if user.role == 'admin':
            return qs
        if user.role == 'professeur':
            return qs.filter(classe__in=classes_du_professeur(user.id))
        return Matiere.objects.none()


class EleveViewSet(viewsets.ModelViewSet):
    serializer_class = EleveSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Eleve.objects.all()
        if user.role == 'professeur':
            return eleves_du_professeur(user.id)
        return Eleve.objects.none()


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Note.objects.all()
        if user.role == 'professeur':
            # Ses propres matières, + toutes les notes des classes dont il est titulaire.
            return Note.objects.filter(
                Q(matiere__professeur=user) | Q(eleve__classe__professeur_principal=user)
            ).distinct()
        return Note.objects.none()

    def perform_update(self, serializer):
        user = self.request.user
        note = self.get_object()
        if user.role == 'professeur' and note.matiere.professeur_id != user.id:
            raise permissions.PermissionDenied("Vous ne pouvez modifier que vos propres notes.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'professeur' and instance.matiere.professeur_id != user.id:
            raise permissions.PermissionDenied("Vous ne pouvez supprimer que vos propres notes.")
        if user.role not in ('admin', 'professeur'):
            raise permissions.PermissionDenied("Action non autorisée.")
        instance.delete()
