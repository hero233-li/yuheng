from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_localaccount"),
    ]

    operations = [
        migrations.RenameField(
            model_name="localaccount",
            old_name="branch_name",
            new_name="terminal_name",
        ),
        migrations.AlterField(
            model_name="localaccount",
            name="terminal_name",
            field=models.CharField(default="terminal001", max_length=100),
        ),
    ]
