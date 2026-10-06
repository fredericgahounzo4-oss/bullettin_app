from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0007_classe_modele_bulletin'),
    ]

    operations = [
        migrations.AddField(
            model_name='classe',
            name='orientation_bulletin',
            field=models.CharField(
                choices=[('portrait', 'Portrait (vertical)'), ('paysage', 'Paysage (horizontal)')],
                default='portrait',
                help_text="Orientation de la page (portrait ou paysage) pour l'impression / le PDF des bulletins de cette classe.",
                max_length=10,
            ),
        ),
    ]
