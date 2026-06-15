from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_delete_localaccount"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Setting",
        ),
    ]
