# Multi-stage build: compile the frontend, then serve it from the FastAPI
# backend as one deployable service (one URL, no CORS wiring needed).

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Left empty on purpose: an empty VITE_API_URL means "call the same origin
# that served this page", which is exactly right once frontend + backend
# are one deployed service. Only override this if you deploy them separately.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./app/static

# Render (and most PaaS hosts) inject $PORT; default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
