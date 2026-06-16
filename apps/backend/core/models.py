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


class MultiTaskMainTask(models.Model):
    id = models.CharField(max_length=40, primary_key=True)
    task_name = models.CharField(max_length=200)
    task_category = models.CharField(max_length=80, default="申请处理")
    product = models.CharField(max_length=80, default="产品A")
    owner = models.CharField(max_length=80, blank=True, default="")
    environment = models.CharField(max_length=80, default="环境1")
    origin = models.CharField(max_length=80, default="产地1")
    region = models.CharField(max_length=80, default="地区1")
    city = models.CharField(max_length=80, default="城市1")
    apply_count = models.IntegerField(default=0)
    patch_count = models.IntegerField(default=0)
    approve_count = models.IntegerField(default=0)
    priority = models.CharField(max_length=20, default="中")
    status = models.CharField(max_length=40, default="未提交")
    due_date = models.CharField(max_length=20, blank=True, default="")
    completion = models.PositiveSmallIntegerField(default=0)
    remark = models.TextField(blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "created_at"]


class MultiTaskSubTask(models.Model):
    id = models.CharField(max_length=40, primary_key=True)
    main_task = models.ForeignKey(MultiTaskMainTask, related_name="subtasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=300)
    status = models.CharField(max_length=40, default="未开始")
    remark = models.TextField(blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "created_at"]
