const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting para prevenir spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por ventana de tiempo
});
app.use(limiter);

// Inicializar base de datos
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/canchas.db' : './canchas.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    console.error('Intentando crear base de datos en memoria...');
    // Fallback a base de datos en memoria si hay problemas con el archivo
    const memoryDb = new sqlite3.Database(':memory:', (memErr) => {
      if (memErr) {
        console.error('Error crítico con base de datos:', memErr.message);
      } else {
        console.log('Usando base de datos en memoria como fallback.');
        initializeDatabase();
      }
    });
  } else {
    console.log('Conectado a la base de datos SQLite en:', dbPath);
    initializeDatabase();
  }
});

// Crear tablas si no existen
function initializeDatabase() {
  // Tabla de canchas
  db.run(`CREATE TABLE IF NOT EXISTS canchas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('F5', 'F7', 'F11')),
    capacidad INTEGER NOT NULL,
    activa BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de reservas
  db.run(`CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dni TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL,
    cancha_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado TEXT DEFAULT 'activa' CHECK(estado IN ('activa', 'cancelada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cancha_id) REFERENCES canchas (id)
  )`);

  // Insertar canchas de ejemplo
  db.get("SELECT COUNT(*) as count FROM canchas", (err, row) => {
    if (err) {
      console.error('Error al verificar canchas existentes:', err);
      return;
    }
    if (row && row.count === 0) {
      const canchasEjemplo = [
        ['Cancha Principal F11', 'F11', 22],
        ['Cancha Norte F7', 'F7', 14],
        ['Cancha Sur F7', 'F7', 14],
        ['Cancha Este F5', 'F5', 10],
        ['Cancha Oeste F5', 'F5', 10]
      ];

      canchasEjemplo.forEach(cancha => {
        db.run("INSERT INTO canchas (nombre, tipo, capacidad) VALUES (?, ?, ?)", cancha);
      });
      console.log('Canchas de ejemplo creadas.');
    }
  });
}

// RUTAS PARA ADMINISTRADOR

// Obtener todas las canchas
app.get('/api/admin/canchas', (req, res) => {
  db.all("SELECT * FROM canchas ORDER BY tipo, nombre", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear nueva cancha
app.post('/api/admin/canchas', (req, res) => {
  const { nombre, tipo, capacidad } = req.body;
  
  if (!nombre || !tipo || !capacidad) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!['F5', 'F7', 'F11'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de cancha inválido' });
  }

  // Verificar duplicación
  db.get("SELECT id FROM canchas WHERE nombre = ? AND tipo = ? AND activa = 1", 
    [nombre, tipo], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (row) {
      return res.status(400).json({ error: 'Ya existe una cancha con ese nombre y tipo' });
    }

    db.run("INSERT INTO canchas (nombre, tipo, capacidad) VALUES (?, ?, ?)",
      [nombre, tipo, capacidad], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        message: 'Cancha creada exitosamente',
        cancha: { id: this.lastID, nombre, tipo, capacidad, activa: 1 }
      });
    });
  });
});

// Actualizar cancha
app.put('/api/admin/canchas/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, capacidad } = req.body;

  // Verificar si la cancha tiene reservas futuras
  const fechaActual = moment().format('YYYY-MM-DD');
  db.get(`SELECT COUNT(*) as count FROM reservas 
          WHERE cancha_id = ? AND fecha >= ? AND estado = 'activa'`, 
    [id, fechaActual], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede modificar una cancha con reservas futuras' 
      });
    }

    db.run("UPDATE canchas SET nombre = ?, tipo = ?, capacidad = ? WHERE id = ?",
      [nombre, tipo, capacidad, id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Cancha actualizada exitosamente' });
    });
  });
});

// Eliminar cancha (baja lógica)
app.delete('/api/admin/canchas/:id', (req, res) => {
  const { id } = req.params;

  db.run("UPDATE canchas SET activa = 0 WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Cancha eliminada exitosamente' });
  });
});

// Obtener todas las reservas
app.get('/api/admin/reservas', (req, res) => {
  const query = `
    SELECT r.*, c.nombre as cancha_nombre, c.tipo as cancha_tipo
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    ORDER BY r.fecha DESC, r.hora_inicio DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Cancelar reserva (admin)
app.put('/api/admin/reservas/:id/cancelar', (req, res) => {
  const { id } = req.params;

  db.run("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Reserva cancelada exitosamente' });
  });
});

// RUTAS PARA CLIENTES

// Consultar disponibilidad
app.get('/api/disponibilidad', (req, res) => {
  const { fecha, tipo } = req.query;
  
  if (!fecha) {
    return res.status(400).json({ error: 'La fecha es obligatoria' });
  }

  // Validar que la fecha no sea pasada
  if (moment(fecha).isBefore(moment(), 'day')) {
    return res.status(400).json({ error: 'No se pueden consultar fechas pasadas' });
  }

  let query = `
    SELECT c.*, 
           GROUP_CONCAT(r.hora_inicio || '-' || r.hora_fin) as horarios_ocupados
    FROM canchas c
    LEFT JOIN reservas r ON c.id = r.cancha_id 
                         AND r.fecha = ? 
                         AND r.estado = 'activa'
    WHERE c.activa = 1
  `;
  
  let params = [fecha];
  
  if (tipo) {
    query += ' AND c.tipo = ?';
    params.push(tipo);
  }
  
  query += ' GROUP BY c.id ORDER BY c.tipo, c.nombre';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Generar horarios disponibles (8:00 a 23:00)
    const horariosCompletos = [];
    for (let hora = 8; hora < 24; hora++) {
      horariosCompletos.push(`${hora.toString().padStart(2, '0')}:00`);
    }

    const canchasDisponibles = rows.map(cancha => {
      const horariosOcupados = cancha.horarios_ocupados ? 
        cancha.horarios_ocupados.split(',').map(h => h.split('-')[0]) : [];
      
      const horariosDisponibles = horariosCompletos.filter(
        hora => !horariosOcupados.includes(hora)
      );

      return {
        id: cancha.id,
        nombre: cancha.nombre,
        tipo: cancha.tipo,
        capacidad: cancha.capacidad,
        horariosDisponibles
      };
    });

    res.json(canchasDisponibles);
  });
});

// Crear reserva
app.post('/api/reservas', (req, res) => {
  const { dni, nombre, telefono, email, cancha_id, fecha, hora_inicio } = req.body;

  // Validaciones básicas
  if (!dni || !nombre || !telefono || !email || !cancha_id || !fecha || !hora_inicio) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Validar formato de DNI
  if (!/^\d{7,8}$/.test(dni)) {
    return res.status(400).json({ error: 'DNI debe tener 7 u 8 dígitos' });
  }

  // Validar email
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Validar que la fecha no sea pasada
  if (moment(fecha).isBefore(moment(), 'day')) {
    return res.status(400).json({ error: 'No se pueden hacer reservas para fechas pasadas' });
  }

  // Verificar que no tenga otra reserva el mismo día
  db.get("SELECT id FROM reservas WHERE dni = ? AND fecha = ? AND estado = 'activa'", 
    [dni, fecha], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      return res.status(400).json({ 
        error: 'Ya tienes una reserva para esta fecha' 
      });
    }

    // Calcular hora fin (1 hora después)
    const horaFin = moment(hora_inicio, 'HH:mm').add(1, 'hour').format('HH:mm');

    // Verificar disponibilidad del horario
    db.get(`SELECT id FROM reservas 
            WHERE cancha_id = ? AND fecha = ? 
            AND ((hora_inicio <= ? AND hora_fin > ?) 
                 OR (hora_inicio < ? AND hora_fin >= ?))
            AND estado = 'activa'`, 
      [cancha_id, fecha, hora_inicio, hora_inicio, horaFin, horaFin], (err, conflict) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (conflict) {
        return res.status(400).json({ 
          error: 'El horario seleccionado no está disponible' 
        });
      }

      // Crear la reserva
      db.run(`INSERT INTO reservas 
              (dni, nombre, telefono, email, cancha_id, fecha, hora_inicio, hora_fin) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [dni, nombre, telefono, email, cancha_id, fecha, hora_inicio, horaFin], 
        function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // Obtener datos completos de la reserva para la respuesta
        db.get(`SELECT r.*, c.nombre as cancha_nombre, c.tipo as cancha_tipo
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                WHERE r.id = ?`, [this.lastID], (err, reserva) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          res.json({
            message: 'Reserva creada exitosamente',
            reserva: reserva
          });

          // TODO: Enviar notificación (implementar más adelante)
        });
      });
    });
  });
});

// Cancelar reserva (cliente)
app.delete('/api/reservas', (req, res) => {
  const { dni, fecha, hora_inicio } = req.body;

  if (!dni || !fecha || !hora_inicio) {
    return res.status(400).json({ error: 'DNI, fecha y hora son obligatorios' });
  }

  // Buscar la reserva
  db.get(`SELECT * FROM reservas 
          WHERE dni = ? AND fecha = ? AND hora_inicio = ? AND estado = 'activa'`,
    [dni, fecha, hora_inicio], (err, reserva) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Verificar que falten más de 24 horas
    const fechaHoraReserva = moment(`${fecha} ${hora_inicio}`, 'YYYY-MM-DD HH:mm');
    const ahora = moment();
    const horasRestantes = fechaHoraReserva.diff(ahora, 'hours');

    if (horasRestantes <= 24) {
      return res.status(400).json({ 
        error: 'Solo se puede cancelar con más de 24 horas de anticipación' 
      });
    }

    // Cancelar la reserva
    db.run("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", 
      [reserva.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Reserva cancelada exitosamente' });
    });
  });
});

// Reprogramar reserva (cliente)
app.put('/api/reservas/reprogramar', (req, res) => {
  const { dni, fecha_actual, hora_actual, nueva_fecha, nueva_hora, cancha_id } = req.body;

  if (!dni || !fecha_actual || !hora_actual || !nueva_fecha || !nueva_hora) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Buscar la reserva actual
  db.get(`SELECT * FROM reservas 
          WHERE dni = ? AND fecha = ? AND hora_inicio = ? AND estado = 'activa'`,
    [dni, fecha_actual, hora_actual], (err, reservaActual) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!reservaActual) {
      return res.status(404).json({ error: 'Reserva actual no encontrada' });
    }

    // Verificar política de 24 horas para la reserva actual
    const fechaHoraActual = moment(`${fecha_actual} ${hora_actual}`, 'YYYY-MM-DD HH:mm');
    const ahora = moment();
    const horasRestantes = fechaHoraActual.diff(ahora, 'hours');

    if (horasRestantes <= 24) {
      return res.status(400).json({ 
        error: 'Solo se puede reprogramar con más de 24 horas de anticipación' 
      });
    }

    // Verificar que no tenga otra reserva en la nueva fecha
    db.get("SELECT id FROM reservas WHERE dni = ? AND fecha = ? AND estado = 'activa' AND id != ?", 
      [dni, nueva_fecha, reservaActual.id], (err, conflicto) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (conflicto) {
        return res.status(400).json({ 
          error: 'Ya tienes una reserva para la nueva fecha seleccionada' 
        });
      }

      const nuevaHoraFin = moment(nueva_hora, 'HH:mm').add(1, 'hour').format('HH:mm');
      const nuevaCanchaId = cancha_id || reservaActual.cancha_id;

      // Verificar disponibilidad del nuevo horario
      db.get(`SELECT id FROM reservas 
              WHERE cancha_id = ? AND fecha = ? 
              AND ((hora_inicio <= ? AND hora_fin > ?) 
                   OR (hora_inicio < ? AND hora_fin >= ?))
              AND estado = 'activa' AND id != ?`, 
        [nuevaCanchaId, nueva_fecha, nueva_hora, nueva_hora, nuevaHoraFin, nuevaHoraFin, reservaActual.id], 
        (err, conflictoHorario) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        if (conflictoHorario) {
          return res.status(400).json({ 
            error: 'El nuevo horario seleccionado no está disponible' 
          });
        }

        // Actualizar la reserva
        db.run(`UPDATE reservas 
                SET cancha_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ?
                WHERE id = ?`,
          [nuevaCanchaId, nueva_fecha, nueva_hora, nuevaHoraFin, reservaActual.id], 
          function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: 'Reserva reprogramada exitosamente' });
        });
      });
    });
  });
});

// Servir páginas estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Cerrar base de datos al terminar la aplicación
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Conexión a la base de datos cerrada.');
    process.exit(0);
  });
});
