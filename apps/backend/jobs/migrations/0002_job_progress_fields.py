from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="stage",
            field=models.CharField(choices=[("submitted", "已提交"), ("executing", "执行中"), ("step_1", "执行第一步"), ("step_2", "执行第二步"), ("completed", "执行完成"), ("success", "执行成功"), ("failed", "执行失败")], default="submitted", max_length=30),
        ),
        migrations.AddField(
            model_name="job",
            name="progress",
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="job",
            name="current_step",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="job",
            name="total_steps",
            field=models.PositiveSmallIntegerField(default=6),
        ),
    ]
