# Sistema de Reservas de Canchas de Fútbol

Una aplicación web moderna y responsive para gestionar reservas de canchas de fútbol, desarrollada con Node.js, Express y SQLite.

## 🚀 Características

### Para Clientes
- **Reserva sin registro**: No requiere autenticación de usuarios
- **Búsqueda inteligente**: Consulta disponibilidad por fecha y tipo de cancha
- **Proceso simplificado**: Reserva en menos de 3 pasos
- **Validaciones automáticas**: Una reserva por persona por día (validado por DNI)
- **Gestión de reservas**: Cancelación y reprogramación con política de 24 horas
- **Interfaz responsive**: Optimizada para móviles y desktop

### Para Administradores
- **Panel de control completo**: Dashboard con estadísticas en tiempo real
- **Gestión de canchas**: CRUD completo (F5, F7, F11)
- **Gestión de reservas**: Visualización y cancelación administrativa
- **Reportes**: Próximas reservas y estadísticas del sistema

## 🏗️ Arquitectura

- **Backend**: Node.js + Express
- **Base de datos**: SQLite (ideal para desarrollo y despliegue simple)
- **Frontend**: HTML5 + Bootstrap 5 + JavaScript vanilla
- **Seguridad**: Rate limiting, validación de formularios, protección anti-spam

## 📋 Requisitos del Sistema

- Node.js 14+ 
- npm 6+
- Puerto 3000 disponible (configurable)

## 🛠️ Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd App-Canchas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   Para desarrollo con auto-reload:
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación**
   - Cliente: http://localhost:3000
   - Admin: http://localhost:3000/admin

## 📊 Estructura del Proyecto

```
App-Canchas/
├── server.js              # Servidor principal y API REST
├── package.json           # Dependencias y scripts
├── canchas.db            # Base de datos SQLite (se crea automáticamente)
├── public/               # Archivos estáticos del frontend
│   ├── index.html        # Interfaz para clientes
│   ├── admin.html        # Panel administrativo
│   ├── client.js         # Lógica del cliente
│   └── admin.js          # Lógica del administrador
└── README.md             # Documentación
```

## 🎯 Funcionalidades Principales

### Sistema de Reservas
- **Horarios**: 8:00 - 23:00 hs en bloques de 1 hora
- **Tipos de cancha**: F5 (10 jugadores), F7 (14 jugadores), F11 (22 jugadores)
- **Validaciones**: 
  - Una reserva por DNI por día
  - No superposición de horarios
  - Fechas futuras únicamente
  - Política de cancelación de 24 horas

### API REST Endpoints

#### Clientes
- `GET /api/disponibilidad` - Consultar canchas disponibles
- `POST /api/reservas` - Crear nueva reserva
- `DELETE /api/reservas` - Cancelar reserva
- `PUT /api/reservas/reprogramar` - Reprogramar reserva

#### Administradores
- `GET /api/admin/canchas` - Listar canchas
- `POST /api/admin/canchas` - Crear cancha
- `PUT /api/admin/canchas/:id` - Actualizar cancha
- `DELETE /api/admin/canchas/:id` - Eliminar cancha (baja lógica)
- `GET /api/admin/reservas` - Listar todas las reservas
- `PUT /api/admin/reservas/:id/cancelar` - Cancelar reserva (admin)

## 🔧 Configuración

### Variables de Entorno (Opcionales)
```bash
PORT=3000                 # Puerto del servidor
```

### Base de Datos
La base de datos SQLite se crea automáticamente al iniciar la aplicación por primera vez, incluyendo:
- Tablas necesarias (canchas, reservas)
- Datos de ejemplo (5 canchas predefinidas)

## 🎨 Interfaz de Usuario

### Cliente (Público)
- **Paso 1**: Selección de fecha y tipo de cancha
- **Paso 2**: Elección de cancha y horario disponible
- **Paso 3**: Ingreso de datos personales y confirmación
- **Gestión**: Sección para cancelar o reprogramar reservas

### Administrador
- **Dashboard**: Estadísticas y próximas reservas
- **Canchas**: Gestión completa de canchas
- **Reservas**: Visualización y gestión de todas las reservas

## 🚦 Reglas de Negocio

1. **Una reserva por persona por día** (validado por DNI)
2. **Duración fija de 1 hora** por turno
3. **Cancelación/reprogramación** solo con más de 24 horas de anticipación
4. **Canchas no modificables** si tienen reservas futuras
5. **Horario de funcionamiento**: 8:00 a 23:00 hs
6. **Baja lógica** para canchas eliminadas

## 🔒 Seguridad

- Rate limiting (100 requests por 15 minutos)
- Validación de entrada en cliente y servidor
- Sanitización de datos
- Protección contra reservas duplicadas
- Validación de formato de DNI y email

## 🚀 Próximas Mejoras

- [ ] Sistema de notificaciones por email/WhatsApp
- [ ] Reportes avanzados y exportación
- [ ] Integración con sistemas de pago
- [ ] API para aplicaciones móviles
- [ ] Sistema de usuarios con roles
- [ ] Gestión de múltiples sedes

## 🐛 Solución de Problemas

### Error de puerto ocupado
```bash
# Cambiar puerto en server.js o usar variable de entorno
PORT=3001 npm start
```

### Error de base de datos
```bash
# Eliminar base de datos y reiniciar (se recreará automáticamente)
rm canchas.db
npm start
```

### Problemas de dependencias
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

## 📞 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, por favor contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para optimizar la gestión de canchas de fútbol**
