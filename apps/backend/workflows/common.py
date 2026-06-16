import json
import time
from dataclasses import dataclass
from typing import Callable

from jobs.models import JobLog


@dataclass
class WorkflowStep:
    name: str
    handler: Callable[[], str]


def run_steps(job, workflow, start_message, result_message, complete_message=None):
    steps = workflow.build_steps()
    JobLog.objects.create(job=job, message=start_message)
    job.total_steps = len(steps)
    job.save(update_fields=["total_steps"])

    for index, step in enumerate(steps, start=1):
        if index == 1:
            job.stage = job.STAGE_STEP_1
        elif index == 2:
            job.stage = job.STAGE_STEP_2
        else:
            job.stage = job.STAGE_EXECUTING
        job.current_step = index
        job.progress = min(95, 15 + int(index / len(steps) * 75))
        job.save(update_fields=["stage", "current_step", "progress"])
        JobLog.objects.create(job=job, message=f"[{step.name}] {step.handler()}")
        time.sleep(1)

    job.stage = job.STAGE_COMPLETED
    job.progress = 98
    job.save(update_fields=["stage", "progress"])
    JobLog.objects.create(job=job, message=result_message)
    if complete_message:
        JobLog.objects.create(job=job, message=complete_message)
    return workflow.build_result()


def parse_payload(raw_payload):
    if not raw_payload:
        return {}
    if isinstance(raw_payload, dict):
        return raw_payload
    if not isinstance(raw_payload, str):
        return {"value": raw_payload}

    try:
        return json.loads(raw_payload)
    except json.JSONDecodeError:
        return {"text": raw_payload}
