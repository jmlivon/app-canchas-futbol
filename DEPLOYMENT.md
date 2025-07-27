# Guía de Despliegue - App Canchas de Fútbol

## Opciones de Despliegue

### Opción 1: Railway (Recomendado para Node.js + SQLite)

1. **Crear cuenta en Railway**: Visita [railway.app](https://railway.app) y crea una cuenta
2. **Conectar repositorio**: 
   - Sube tu código a GitHub
   - Conecta Railway con tu repositorio de GitHub
3. **Configurar variables de entorno**:
   - `NODE_ENV=production`
   - `PORT=3000`
4. **Desplegar**: Railway detectará automáticamente que es una app Node.js y la desplegará

### Opción 2: Render

1. **Crear cuenta en Render**: Visita [render.com](https://render.com)
2. **Crear nuevo Web Service**:
   - Conecta tu repositorio de GitHub
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Configurar variables de entorno**:
   - `NODE_ENV=production`

### Opción 3: Heroku

1. **Instalar Heroku CLI**
2. **Comandos de despliegue**:
   ```bash
   heroku create app-canchas-futbol
   git add .
   git commit -m "Deploy to production"
   git push heroku main
   ```

### Opción 4: VPS (DigitalOcean, AWS, etc.)

1. **Configurar servidor**:
   ```bash
   # Instalar Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clonar repositorio
   git clone <tu-repositorio>
   cd App-Canchas
   
   # Instalar dependencias
   npm install
   
   # Configurar PM2 para producción
   npm install -g pm2
   pm2 start server.js --name "app-canchas"
   pm2 startup
   pm2 save
   ```

2. **Configurar Nginx** (opcional):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Configuración de Producción

### Variables de Entorno Requeridas

```env
NODE_ENV=production
PORT=3000
```

### Base de Datos

La aplicación usa SQLite que se crea automáticamente. Para producción considera:

1. **SQLite**: Funciona bien para aplicaciones pequeñas/medianas
2. **PostgreSQL**: Para mayor escalabilidad
3. **MySQL**: Alternativa robusta

### Consideraciones de Seguridad

1. **HTTPS**: Configura SSL/TLS en producción
2. **Rate Limiting**: Ya implementado en la app
3. **CORS**: Configurado para permitir requests del frontend
4. **Variables de entorno**: No hardcodear credenciales

## Pasos Rápidos para Railway (Recomendado)

1. Sube el código a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/app-canchas.git
   git push -u origin main
   ```

2. Ve a [railway.app](https://railway.app) y:
   - Haz clic en "Start a New Project"
   - Selecciona "Deploy from GitHub repo"
   - Elige tu repositorio
   - Railway detectará automáticamente la configuración

3. La app estará disponible en una URL como: `https://app-canchas-production.up.railway.app`

## Testing en Producción

Una vez desplegado, prueba:

1. **Frontend**: Accede a la URL principal
2. **API Endpoints**:
   - `GET /api/disponibilidad?fecha=2024-01-15`
   - `POST /api/reservas` (con datos de prueba)
   - `GET /api/admin/canchas`

## Monitoreo

- **Logs**: Revisa los logs de la plataforma elegida
- **Uptime**: Configura alertas de disponibilidad
- **Performance**: Monitorea tiempo de respuesta

## Backup de Base de Datos

Para SQLite en producción:
```bash
# Crear backup
sqlite3 canchas.db ".backup backup_$(date +%Y%m%d).db"

# Restaurar backup
sqlite3 canchas.db ".restore backup_20240115.db"
```
