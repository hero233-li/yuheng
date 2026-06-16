import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Job, JobLog
from .serializers import serialize_job, serialize_log


@csrf_exempt
@require_http_methods(["GET", "POST"])
def jobs_view(request):
    if request.method == "GET":
        return JsonResponse([serialize_job(job) for job in Job.objects.all()[:100]], safe=False)

    payload = json.loads(request.body or "{}")
    name = payload.pop("name", "") or "未命名任务"
    job = Job.objects.create(
        name=name,
        payload=payload,
        stage=Job.STAGE_SUBMITTED,
        progress=5,
        current_step=0,
        total_steps=6,
    )
    JobLog.objects.create(job=job, message="任务已创建，等待 worker 执行")
    return JsonResponse(serialize_job(job), status=201)


@require_http_methods(["GET"])
def job_detail(request, job_id):
    job = get_object_or_404(Job, id=job_id)
    return JsonResponse(serialize_job(job))


@require_http_methods(["GET"])
def job_logs(request, job_id):
    job = get_object_or_404(Job, id=job_id)
    return JsonResponse([serialize_log(log) for log in job.logs.all()], safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def cancel_job(request, job_id):
    job = get_object_or_404(Job, id=job_id)
    if job.status == Job.STATUS_PENDING:
        job.status = Job.STATUS_CANCELLED
        job.stage = Job.STAGE_FAILED
        job.progress = 0
        job.save(update_fields=["status", "stage", "progress"])
        JobLog.objects.create(job=job, level=JobLog.LEVEL_WARNING, message="任务已取消")
    return JsonResponse(serialize_job(job))
