# Stage 1: Build with Bun and cache
FROM oven/bun AS builder

WORKDIR /app

COPY . .
RUN bun install
RUN bun run build

# Stage 2: Serve with Caddy
FROM caddy:alpine

COPY --from=builder /app/dist /usr/share/caddy

# Optional: Caddyfile for SPA
# COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
