from rest_framework.routers import DefaultRouter
from .views import ClasseViewSet, MatiereViewSet, EleveViewSet, NoteViewSet

router = DefaultRouter()
router.register('classes', ClasseViewSet, basename='classe')
router.register('matieres', MatiereViewSet, basename='matiere')
router.register('eleves', EleveViewSet, basename='eleve')
router.register('notes', NoteViewSet, basename='note')

urlpatterns = router.urls
