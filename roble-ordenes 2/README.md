# Módulo de Órdenes · Roble Capital (prototipo)

Prototipo del Obligatorio de HGTD (Universidad ORT Uruguay). Implementa la canalización de órdenes con aprobación del cliente:

- **Enviar órdenes**: formulario único con los campos obligatorios del formato BCU y vista previa del mail.
- **Trading Desk hoy**: órdenes por estado (por revisar, esperando cliente, para ejecutar, ejecutadas) con operador asignado.
- **Respuestas de clientes**: lectura del código de confirmación y asociación a cada orden; las no asociables quedan "Sin orden asociada".
- **Blotter**: historial con filtros, exportación CSV y Registro de Instrucciones en XML.

Roles: asesor, Mesa de operaciones y cumplimiento. Cada orden guarda su historial de actividad.

En esta versión el ingreso con Google y el envío/lectura de Gmail están simulados. Los datos son ficticios.

## Ejecutar

```
npm install
npm start
```

Abre en http://localhost:3000. En Railway alcanza con conectar el repositorio: usa `npm start` y la variable `PORT`.
