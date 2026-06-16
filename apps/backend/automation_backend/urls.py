from django.urls import path

from core import views as core_views
from jobs import views as job_views

urlpatterns = [
    path("api/health/", core_views.health),
    path("api/invocations/", core_views.invocations_view),
    path("api/invocations/summary/", core_views.invocations_summary),
    path("api/invocations/<int:record_id>/", core_views.invocation_detail),
    path("api/mock/multi-task-table/", core_views.multi_task_table_mock),
    path("api/mock/multi-task-table/rows/", core_views.multi_task_table_add_row),
    path("api/mock/multi-task-table/rows/<str:row_id>/", core_views.multi_task_table_row),
    path("api/mock/multi-task-table/rows/<str:row_id>/subtasks/", core_views.multi_task_subtasks),
    path("api/mock/multi-task-table/rows/<str:row_id>/subtasks/<str:subtask_id>/", core_views.multi_task_subtask_detail),
    path("api/mock/multi-task-table/save/", core_views.multi_task_table_save),
    path("api/mock/search-form-2/config/", core_views.search_form_2_config),
    path("api/mock/search-form-2/results/<str:result_id>/export/", core_views.search_form_2_export),
    path("api/mock/grouped-cards/", core_views.grouped_cards_mock),
    path("api/mock/grouped-task/state/", core_views.grouped_task_state),
    path("api/mock/grouped-task/claim/", core_views.grouped_task_claim),
    path("api/mock/grouped-task/return/", core_views.grouped_task_return),
    path("api/jobs/", job_views.jobs_view),
    path("api/jobs/<uuid:job_id>/", job_views.job_detail),
    path("api/jobs/<uuid:job_id>/logs/", job_views.job_logs),
    path("api/jobs/<uuid:job_id>/cancel/", job_views.cancel_job),
]
