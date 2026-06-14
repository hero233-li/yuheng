import signal
import time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from jobs.models import Job, JobLog
from workflows.registry import run_workflow


class Command(BaseCommand):
    help = "Run the local serial job worker for branch mode."

    def handle(self, *args, **options):
        self._running = True
        signal.signal(signal.SIGINT, self._stop)
        signal.signal(signal.SIGTERM, self._stop)
        self.stdout.write(self.style.SUCCESS("Local worker started."))

        while self._running:
            job = self._claim_next_job()
            if not job:
                time.sleep(1)
                continue

            self._run_job(job)

        self.stdout.write(self.style.WARNING("Local worker stopped."))

    def _stop(self, signum, frame):
        self._running = False

    def _claim_next_job(self):
        with transaction.atomic():
            job = (
                Job.objects.select_for_update()
                .filter(status=Job.STATUS_PENDING)
                .order_by("created_at")
                .first()
            )
            if not job:
                return None
            job.status = Job.STATUS_RUNNING
            job.stage = Job.STAGE_EXECUTING
            job.progress = 15
            job.started_at = timezone.now()
            job.save(update_fields=["status", "stage", "progress", "started_at"])
            JobLog.objects.create(job=job, message="本机 worker 已开始执行")
            return job

    def _run_job(self, job):
        try:
            result = run_workflow(job)
        except Exception as exc:
            job.status = Job.STATUS_FAILED
            job.stage = Job.STAGE_FAILED
            job.progress = 100
            job.error = str(exc)
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "stage", "progress", "error", "finished_at"])
            JobLog.objects.create(job=job, level=JobLog.LEVEL_ERROR, message=f"任务失败：{exc}")
            return

        job.status = Job.STATUS_SUCCESS
        job.stage = Job.STAGE_SUCCESS
        job.progress = 100
        job.current_step = job.total_steps
        job.result = result
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "stage", "progress", "current_step", "result", "finished_at"])
        JobLog.objects.create(job=job, message="任务执行成功")
