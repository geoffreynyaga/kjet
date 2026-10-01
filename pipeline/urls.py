from django.urls import path

from pipeline import views

app_name = "pipeline"

urlpatterns = [
    path("me/", views.WhoAmIView.as_view(), name="me"),
    path(
        "applications/<str:application_id>/documents/",
        views.ApplicationDocumentListView.as_view(),
        name="application-documents",
    ),
    path(
        "applications/<str:application_id>/documents/<path:document_path>/",
        views.ApplicationDocumentView.as_view(),
        name="application-document",
    ),
    path("cohorts/", views.CohortListView.as_view(), name="cohort-list"),
    path("submit/", views.SubmitCsvView.as_view(), name="submit"),
    path("runs/<int:pk>/", views.RunDetailView.as_view(), name="run-detail"),
    path("runs/<int:pk>/publish/", views.RunPublishView.as_view(), name="run-publish"),
    path("runs/<int:pk>/discard/", views.RunDiscardView.as_view(), name="run-discard"),
    path("versions/", views.VersionListView.as_view(), name="version-list"),
    path(
        "versions/<int:pk>/rerun/",
        views.VersionRerunView.as_view(),
        name="version-rerun",
    ),
]
