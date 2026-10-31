# 🗳️ Sistema de Votación Electrónica - Colegio Adventista Tupac Amaru (CATA 2026)

Versión completa y empaquetada lista para desplegar en cualquier servidor compartido con **PHP y Apache (cPanel, LiteSpeed o hosting estándar)**.

---

## 🌟 Novedades y Características Principales

### 1. 🛡️ Seguridad y Control de Acceso Docente
* **Guardas de Seguridad en Backend y Frontend:** Toda la información estadística y padrón de estudiantes está protegida. Solo docentes y directivos autorizados pueden acceder a `/#/admin`.
* **Cuentas Docentes Preconfiguradas:**
  * `profesor@cata.edu.pe` / Contraseña: `cata2026`
  * `coordinacion@cata.edu.pe` / Contraseña: `cata2026`
  * `director@cata.edu.pe` / Contraseña: `admin2026`
  *(Pueden modificarse o agregarse más cuentas en la tabla `admins`).*

### 2. 🎲 Generación Automática de Códigos Secretos Únicos
* Para evitar que los alumnos usen el DNI de sus compañeros para votar fraudulentamente, **el sistema genera automáticamente un código secreto único e irrepetible de 6 dígitos** (ej: `783729`).
* El alumno solo vota ingresando este código privado.

### 3. 📂 Carga Masiva Multi-Excel (Salones, Secciones y Sedes)
* Permite arrastrar **múltiples archivos Excel (.xlsx / .xls)** al mismo tiempo (ej: 20 archivos de salones o sedes distintas).
* **Filtro automático de elegibilidad:**
  * Descarta automáticamente a los alumnos con `Estado = "Retirado"` o `Matriculado = "No"`.
  * Evita duplicados identificándolos por DNI o código escolar.
* **Descarga de Tickets para Profesores:** Un botón permite descargar inmediatamente un archivo Excel con los nombres concatenados, grado/sección y su **código secreto de votación** listo para imprimir y repartir en las aulas.

### 4. 📊 Dashboard Analítico Filtrable en Tiempo Real
* En el panel administrativo puedes filtrar el recuento de votos en vivo por:
  * **Sede:** (ej. `Sede Central`, `Sede Juliaca`)
  * **Salón / Sección:** (ej. `S1E`, `S2F`, `S3A`)
* El gráfico de barras y la tabla de resultados se recalculan al instante para mostrar qué candidato gana en cada salón o sede.

### 5. 📋 Módulo "Padrón en Vivo" (Seguimiento sin descargar Excel)
* Pestaña dedicada donde los profesores pueden ver la lista completa de alumnos.
* Buscador por nombre, DNI o código.
* Filtros por estado: `Todos`, `Ya Votaron` o `Pendientes`.
* Muestra el porcentaje de participación del salón en vivo.
* Muestra el **código secreto con botón de copiar**, muy útil si un alumno pierde su ticket de papel durante las elecciones.

### 6. ⏱️ Temporizador de Seguridad en la Cabina
* Si un alumno deja la pantalla de votación abierta por más de 90 segundos sin votar, la cabina se cierra automáticamente por inactividad para evitar suplantaciones.

---

## 🚀 Despliegue en el Servidor del Ingeniero

1. Copia todos los archivos de esta carpeta `php/` a:
   * `public_html/` (si va en la raíz de su dominio)
   * `public_html/votacion/` (si va en una subcarpeta)
2. Permisos de escritura: Asegúrate de que las carpetas `data/` y `static/img/` tengan permisos `755` o `775`.
3. ¡Listo! Todo funciona con SQLite protegido en modo concurrente WAL (o MySQL si configuras `config.php`).
