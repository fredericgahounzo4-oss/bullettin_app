from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

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

    def perform_destroy(self, instance):
        if instance.eleves.exists():
            raise ValidationError(
                "Impossible de supprimer cette classe : elle contient encore des élèves. "
                "Déplacez ou supprimez d'abord ses élèves."
            )
        instance.delete()

    @action(detail=True, methods=['patch'], url_path='couleur', permission_classes=[permissions.IsAuthenticated])
    def couleur(self, request, pk=None):
        """
        Permet au TITULAIRE d'une classe (ou à un admin) de personnaliser la couleur
        du bulletin de SA classe uniquement — contrairement au reste de la fiche classe
        (nom, niveau, effectif...), réservé à l'admin via le endpoint standard.
        """
        try:
            classe = Classe.objects.get(pk=pk)
        except Classe.DoesNotExist:
            return Response({'detail': 'Classe introuvable.'}, status=404)

        user = request.user
        est_titulaire = user.role == 'professeur' and classe.professeur_principal_id == user.id
        if user.role != 'admin' and not est_titulaire:
            return Response(
                {'detail': "Seul le titulaire de cette classe (ou un administrateur) peut modifier sa couleur."},
                status=403,
            )

        if 'couleur_bulletin' in request.data:
            classe.couleur_bulletin = request.data.get('couleur_bulletin') or ''
        if 'couleur_fond_bulletin' in request.data:
            classe.couleur_fond_bulletin = request.data.get('couleur_fond_bulletin') or ''
        classe.save(update_fields=['couleur_bulletin', 'couleur_fond_bulletin'])
        return Response(ClasseSerializer(classe).data)


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
