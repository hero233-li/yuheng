from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_delete_setting"),
    ]

    operations = [
        migrations.CreateModel(
            name="InvocationRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("record_type", models.CharField(choices=[("menu", "菜单访问"), ("api", "接口调用")], max_length=20)),
                ("name", models.CharField(max_length=120)),
                ("path", models.CharField(blank=True, default="", max_length=300)),
                ("method", models.CharField(blank=True, default="", max_length=20)),
                ("status_code", models.IntegerField(blank=True, null=True)),
                ("success", models.BooleanField(default=True)),
                ("duration_ms", models.IntegerField(default=0)),
                ("detail", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="invocationrecord",
            index=models.Index(fields=["record_type", "created_at"], name="core_invoca_record__64ea24_idx"),
        ),
        migrations.AddIndex(
            model_name="invocationrecord",
            index=models.Index(fields=["path", "created_at"], name="core_invoca_path_0d634c_idx"),
        ),
    ]
