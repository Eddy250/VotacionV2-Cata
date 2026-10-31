# 🗳️ Sistema Electoral Escolar CATA 2026

Plataforma integral, moderna y segura de sufragio estudiantil desarrollada para el **Colegio Adventista Túpac Amaru (Juliaca - 2026)**. Completamente dockerizada, con soporte multi-sede independiente, asistente inteligente de planes de trabajo y generador institucional de afiches QR.

---

## 🌟 Características Principales

* 🏛️ **Arquitectura Multi-Sede Unificada:** Control centralizado con elecciones de alcaldía independientes para **Sede Central** y **Sede Jerusalén**. Cada estudiante vota únicamente por los candidatos de su respectiva sede.
* 🤖 **Asistente Inteligente de PDF (100% Local y Gratuito):** Extracción automatizada de planes de trabajo electorales sin consumo de APIs externas. Autocompleta nombres de listas, eslóganes, propuestas y cruza las directivas con el padrón oficial escolar detectando la sede del candidato.
* 📱 **Portal Informativo de Campaña (`/portal`):** Diseñado para difusión previa en celulares de estudiantes. Incluye organigrama de listas, lectura de propuestas y visor interactivo de planes de trabajo en PDF.
* 🗳️ **Cabina de Votación Digital (`/`):** Interfaz ágil, minimalista y libre de distracciones con el escudo oficial del colegio, validación por DNI y temporizador de seguridad de 90 segundos por inactividad.
* 🖨️ **Generador de QR y Afiches A4:** Generación instantánea de códigos QR para Wi-Fi local o dominio público en internet, con formato listo para imprimir en afiches oficiales de tamaño A4 para las aulas.
* 📊 **Centro de Control Electoral (`/admin`):** Monitoreo en tiempo real de la participación, importador masivo de estudiantes vía Excel (.xlsx), exportación de actas para auditoría y conteo automático de votos.

---

## 🚀 Despliegue Rápido con Docker

### Requisitos Previos
* Tener instalado **Docker Desktop** (con motor Linux activo).

### Iniciar el Sistema (1 solo comando)
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
docker compose up -d --build
```
Docker compilará la aplicación web en Nginx y levantará los servicios de backend y base de datos automáticamente en segundo plano.

---

## 🌐 Enlaces de Acceso Local

| Módulo | Enlace Local | Descripción |
|---|---|---|
| **Cabina de Votación (Urna)** | [http://localhost:8001](http://localhost:8001) | Pantalla de sufragio digital para los estudiantes. |
| **Portal Informativo de Campaña** | [http://localhost:8001/portal](http://localhost:8001/portal) | Plataforma de revisión de propuestas y listas oficiales. |
| **Centro de Control (Admin)** | [http://localhost:8001/admin](http://localhost:8001/admin) | Panel de gestión docente, importación de padrones y auditoría. |
| **Sede Secundaria (Espejo)** | [http://localhost:8002](http://localhost:8002) | Puerto reservado para servidor independiente de la Sede 2. |

> 📱 **Acceso desde celulares (Misma Red Wi-Fi):** Reemplazar `localhost` por la IP del equipo servidor (Ejemplo: `http://192.168.18.42:8001/portal`).

---

## 🔑 Credenciales para Demostración y Pruebas

### 1. Acceso Administrativo Docente (`/admin`)
* **Director:** `director@cata.edu.pe` | Clave: `admin2026`
* **Profesor:** `profesor@cata.edu.pe` | Clave: `cata2026`
* **Coordinación:** `coordinacion@cata.edu.pe` | Clave: `cata2026`

### 2. Acceso para Estudiantes (Cabina de Votación)
Puedes ingresar a la cabina con cualquiera de estos DNIs de prueba registrados en el padrón:
* `92559000` (Apaza Hancco, Nicolas - Sede Central)
* `92590372` (Aquino Calapuja, Derick - Sede Central)
* `92577076` (Añasco Espinoza, Mateo - Sede Central)

---

## 🛠️ Comandos de Mantenimiento

* **Ver estado de los contenedores:**
  ```bash
  docker compose ps
  ```
* **Ver logs en tiempo real:**
  ```bash
  docker compose logs -f
  ```
* **Recompilar imágenes tras cambios de código:**
  ```bash
  docker compose up -d --build
  ```
* **Detener los servicios:**
  ```bash
  docker compose down
  ```
* **Reiniciar desde cero (eliminando volúmenes de datos):**
  ```bash
  docker compose down -v
  ```

---

## 📁 Estructura del Proyecto

```text
VOTACION-CATA-2026/
├── backend/
│   ├── models/            # Modelos de base de datos (SQLite / MySQL)
│   ├── routes/            # Endpoints de votación, candidatos y admin
│   ├── utils/             # Extractor y analizador local de PDFs
│   ├── static/            # Almacenamiento persistente de fotos y documentos
│   └── Dockerfile         # Imagen PHP 8.2 Apache
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React (Admin, Login, Portal, Voting, QR)
│   │   └── assets/        # Logos y emblemas oficiales en alta resolución
│   ├── nginx.conf         # Servidor web y proxy inverso hacia backend
│   └── Dockerfile         # Multi-stage build Node 20 + Nginx
├── docker-compose.yml     # Orquestación de contenedores y volúmenes persistentes
└── README.md              # Documentación técnica del sistema
```

---

© 2026 Colegio Adventista Túpac Amaru • Comité Electoral Estudiantil
