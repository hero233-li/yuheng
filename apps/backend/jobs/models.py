import uuid

from django.db import models


class Job(models.Model):
    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]
    STAGE_SUBMITTED = "submitted"
    STAGE_EXECUTING = "executing"
    STAGE_STEP_1 = "step_1"
    STAGE_STEP_2 = "step_2"
    STAGE_COMPLETED = "completed"
    STAGE_SUCCESS = "success"
    STAGE_FAILED = "failed"
    STAGE_CHOICES = [
        (STAGE_SUBMITTED, "已提交"),
        (STAGE_EXECUTING, "执行中"),
        (STAGE_STEP_1, "执行第一步"),
        (STAGE_STEP_2, "执行第二步"),
        (STAGE_COMPLETED, "执行完成"),
        (STAGE_SUCCESS, "执行成功"),
        (STAGE_FAILED, "执行失败"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default=STAGE_SUBMITTED)
    progress = models.PositiveSmallIntegerField(default=5)
    current_step = models.PositiveSmallIntegerField(default=0)
    total_steps = models.PositiveSmallIntegerField(default=6)
    payload = models.JSONField(default=dict, blank=True)
    result = models.JSONField(null=True, blank=True)
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class JobLog(models.Model):
    LEVEL_INFO = "info"
    LEVEL_WARNING = "warning"
    LEVEL_ERROR = "error"
    LEVEL_CHOICES = [
        (LEVEL_INFO, "Info"),
        (LEVEL_WARNING, "Warning"),
        (LEVEL_ERROR, "Error"),
    ]

    job = models.ForeignKey(Job, related_name="logs", on_delete=models.CASCADE)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_INFO)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
