import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Job",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("success", "Success"), ("failed", "Failed"), ("cancelled", "Cancelled")], default="pending", max_length=20)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("result", models.JSONField(blank=True, null=True)),
                ("error", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="JobLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("level", models.CharField(choices=[("info", "Info"), ("warning", "Warning"), ("error", "Error")], default="info", max_length=20)),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("job", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="logs", to="jobs.job")),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
