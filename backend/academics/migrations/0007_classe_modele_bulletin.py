from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0006_matiere_compte_dans_moyenne'),
    ]

    operations = [
        migrations.AddField(
            model_name='classe',
            name='modele_bulletin',
            field=models.CharField(
                choices=[
                    ('standard', 'Standard (trimestre)'),
                    ('lycee_semestre', 'Lycée — Semestre (sections littéraires / scientifiques / facultatives)'),
                    ('lycee_semestre_2', 'Lycée — Semestre (liste simple avec signatures)'),
                    ('college_trimestre', "Collège — Trimestre (bulletin d'évaluation)"),
                ],
                default='standard',
                help_text="Modèle d'impression du bulletin de cette classe (choisi par le titulaire ou l'admin).",
                max_length=30,
            ),
        ),
    ]
