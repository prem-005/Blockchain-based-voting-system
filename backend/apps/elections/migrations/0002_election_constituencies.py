from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('elections', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='election',
            name='constituencies',
            field=models.ManyToManyField(
                blank=True,
                help_text='Selected Assembly Constituencies for a by-election. Empty means statewide scope for legacy elections.',
                related_name='elections',
                to='elections.constituency',
            ),
        ),
    ]
