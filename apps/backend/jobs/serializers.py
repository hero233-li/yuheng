def serialize_job(job):
    stage_steps = _stage_steps(job)
    return {
        "id": str(job.id),
        "name": job.name,
        "status": job.status,
        "stage": job.stage,
        "stage_label": job.get_stage_display(),
        "stage_steps": stage_steps,
        "stage_index": _stage_index(job.stage, stage_steps),
        "progress": job.progress,
        "current_step": job.current_step,
        "total_steps": job.total_steps,
        "payload": job.payload,
        "result": job.result,
        "error": job.error,
        "created_at": job.created_at.isoformat(),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }


def serialize_log(log):
    return {
        "id": log.id,
        "level": log.level,
        "message": log.message,
        "created_at": log.created_at.isoformat(),
    }


def _stage_steps(job):
    steps = job.payload.get("stage_steps")
    if isinstance(steps, list) and steps:
        return steps
    return [
        {"key": job.STAGE_SUBMITTED, "title": "已提交"},
        {"key": job.STAGE_EXECUTING, "title": "执行中"},
        {"key": job.STAGE_STEP_1, "title": "执行第一步"},
        {"key": job.STAGE_STEP_2, "title": "执行第二步"},
        {"key": job.STAGE_COMPLETED, "title": "执行完成"},
        {"key": job.STAGE_SUCCESS, "title": "执行成功"},
    ]


def _stage_index(stage, stage_steps):
    for index, step in enumerate(stage_steps):
        if step.get("key") == stage:
            return index
    if stage == "failed":
        return max(0, len(stage_steps) - 2)
    return 0
