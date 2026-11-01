from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/elections/', include('apps.elections.urls')),
    path('api/voters/', include('apps.voters.urls')),
    path('api/candidates/', include('apps.parties_candidates.urls')),
    path('api/receipts/', include('apps.receipts.urls')),
    path('api/explorer/', include('apps.explorer.urls')),
    path('api/research/', include('apps.research.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
