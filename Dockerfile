FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DASHBOARD_HOST=0.0.0.0 \
    DASHBOARD_PORT=8788

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py launch.sh ./
COPY templates/ ./templates/
COPY static/ ./static/

# NOTE: The container does NOT ship a `hermes` binary. Bind-mount or
# volume-mount a hermes install at /opt/hermes and set HERMES_BIN / HERMES_HOME
# accordingly (see docker-compose.yml for an example).

RUN chmod +x /app/launch.sh

EXPOSE 8788

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+__import__('os').environ.get('DASHBOARD_PORT','8788')+'/healthz').status==200 else 1)"

CMD ["./launch.sh"]
