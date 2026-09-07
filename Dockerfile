FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads /app/procesadas /app/static/fonts && \
    chmod -R 777 /app/uploads /app/procesadas /app/static/fonts

EXPOSE 5000

CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 app:app