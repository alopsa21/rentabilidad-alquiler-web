# F0-Deploy-01 — Despliegue en producción (DigitalOcean VPS)

## Objetivo

Documentar y automatizar el despliegue completo del proyecto en un VPS de DigitalOcean:

- rentabilidad-alquiler-engine
- rentabilidad-alquiler-api
- rentabilidad-alquiler-web

Usando:

- Ubuntu Server
- Node.js
- PM2
- Nginx
- HTTPS (Let's Encrypt)

Este ticket sirve como guía operativa permanente.

---

## Arquitectura final

```
Internet
   |
Nginx (443 HTTPS)
   |
   ├── /api  → Fastify API (PM2)
   |
   └── /     → React build estático
```

El engine se consume como librería desde la API.

---

## Requisitos en VPS

### 1. Actualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
```

---

### 2. Instalar Node (recomendado 20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verificar:

```bash
node -v
npm -v
```

---

### 3. Instalar PM2

```bash
sudo npm install -g pm2
```

---

### 4. Instalar Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Despliegue API

### 1. Clonar repo

```bash
git clone <API_REPO>
cd rentabilidad-alquiler-api
npm install
npm run build
```

---

### 2. Variables entorno

Crear:

```bash
nano .env
```

Contenido:

```
OPENAI_API_KEY=...
PORT=3001
```

---

### 3. Arrancar con PM2

```bash
pm2 start dist/index.js --name alquiler-api
pm2 save
pm2 startup
```

---

## Despliegue Web

```bash
git clone <WEB_REPO>
cd rentabilidad-alquiler-web
npm install
npm run build
```

Copiar build:

```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
```

---

## Configurar Nginx

Editar:

```bash
sudo nano /etc/nginx/sites-available/default
```

Ejemplo:

```
server {
    listen 80;
    server_name TU_DOMINIO;

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri /index.html;
    }
}
```

Reiniciar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## HTTPS

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx
```

---

## Health checks

- Web: https://TU_DOMINIO
- API: https://TU_DOMINIO/api/health

---

## Logs

API:

```bash
pm2 logs alquiler-api
```

Nginx:

```bash
sudo tail -f /var/log/nginx/error.log
```

---

## Actualizaciones

### API

```bash
git pull
npm install
npm run build
pm2 restart alquiler-api
```

---

### Web

```bash
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## Criterios de aceptación

- Web accesible por HTTPS
- API responde /api
- PM2 mantiene procesos vivos
- Reinicio VPS mantiene servicios

---

## Nota estratégica

Este despliegue es:

- barato
- simple
- suficiente para MVP

Más adelante se puede migrar a:

- Docker
- Fly.io
- Railway
- Vercel + backend separado
