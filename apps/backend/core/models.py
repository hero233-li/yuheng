from django.db import models


class InvocationRecord(models.Model):
    TYPE_MENU = "menu"
    TYPE_API = "api"
    TYPE_CHOICES = [
        (TYPE_MENU, "菜单访问"),
        (TYPE_API, "接口调用"),
    ]

    record_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    name = models.CharField(max_length=120)
    path = models.CharField(max_length=300, blank=True, default="")
    method = models.CharField(max_length=20, blank=True, default="")
    status_code = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    duration_ms = models.IntegerField(default=0)
    detail = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["record_type", "created_at"], name="core_invoca_record__64ea24_idx"),
            models.Index(fields=["path", "created_at"], name="core_invoca_path_0d634c_idx"),
        ]
