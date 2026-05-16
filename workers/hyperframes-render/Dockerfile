# Fase 2 — Worker de render HyperFrames (Node 22 + FFmpeg)
# Despliega en Cloud Run y define HYPERFRAMES_RENDER_WORKER_URL en la app principal.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json server.mjs ./
RUN npm install --omit=dev 2>/dev/null || true

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
