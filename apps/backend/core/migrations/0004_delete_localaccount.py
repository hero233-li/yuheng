from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_rename_branch_name_terminal_name"),
    ]

    operations = [
        migrations.DeleteModel(
            name="LocalAccount",
        ),
    ]
