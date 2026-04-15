# ---- Frontend builder stage ----
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# ---- Dev stage (used by docker-compose) ----
FROM python:3 AS dev

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Node is added at dev time via the devcontainer "node" feature,
# but we include it here too so `docker compose up` without the
# devcontainer still has a working frontend toolchain.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" ]


# ---- Production stage ----
FROM python:3-slim AS prod

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py config.py models.py argocd.py dev_store.py ./
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

EXPOSE 8000
CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" ]
