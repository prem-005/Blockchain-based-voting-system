# Backend Dockerfile for LightVote Django REST Framework
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . /app/

# Expose Django port
EXPOSE 8000

# Run entrypoint script
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn lightvote_core.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
