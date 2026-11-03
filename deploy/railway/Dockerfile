# Serves the built app; CI copies dist/ to site/ before `railway up`.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY site /srv
