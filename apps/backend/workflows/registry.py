from workflows.product_apply import run_product_apply_workflow
from workflows.reset_password import run_reset_password_workflow
from workflows.search_form_2 import run_search_form_2_workflow


WORKFLOW_RUNNERS = {
    "product_apply": run_product_apply_workflow,
    "search_form_2": run_search_form_2_workflow,
    "reset_password": run_reset_password_workflow,
}


def run_workflow(job):
    workflow = job.payload.get("workflow") or "product_apply"
    runner = WORKFLOW_RUNNERS.get(workflow, run_product_apply_workflow)
    return runner(job)
