from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0005_classe_couleur_bulletin_classe_couleur_fond_bulletin'),
    ]

    operations = [
        migrations.AddField(
            model_name='matiere',
            name='compte_dans_moyenne',
            field=models.BooleanField(
                default=True,
                help_text="Si coché, les points de cette matière (y compris EPS et autres matières facultatives) entrent dans le total des points, le total des coefficients et la moyenne.",
            ),
        ),
    ]
