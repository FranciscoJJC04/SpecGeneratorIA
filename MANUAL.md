# 📋 Generador de Especificaciones Técnicas con IA
### Manual de instalación y uso

Genera especificaciones técnicas de software (SRS) completas en PDF a partir de una
descripción en lenguaje natural: requisitos, casos de uso, diagramas UML, análisis de
calidad, matriz de trazabilidad, estudios de viabilidad y más. También puede **ampliar
una especificación existente** subiendo su PDF y describiendo los cambios.

Todo corre **en tu máquina** con Docker. Solo la generación de texto usa la API
gratuita de Groq (IA en la nube).

---

## 1. ¿Qué incluye el paquete?

| Archivo / carpeta | Qué es |
|---|---|
| `compose.yaml` | Define los 5 contenedores del sistema |
| `.env.example` | Plantilla de configuración (claves y puertos) |
| `spec-generator-workflow.json` | El workflow que se importa en n8n |
| `web/` | La interfaz web (HTML/CSS/JS + config del proxy) |
| `ejemplos/` | Dos textos de ejemplo para probar los dos modos |
| `MANUAL.md` | Este manual |

**Arquitectura** (5 contenedores que se levantan juntos):

- **n8n** (v1.118.1) — motor de automatización que orquesta todo el flujo
- **web** (nginx) — la interfaz que usas en el navegador
- **gotenberg** — convierte el documento HTML a PDF
- **kroki + kroki-mermaid** — renderizan los diagramas UML como imágenes

> ⚠️ La versión de n8n está **fijada a 1.118.1 a propósito**. No la cambies a
> `latest`: las versiones 2.x tienen un bug conocido que rompe los webhooks de
> producción y el proyecto deja de funcionar.

---

## 2. Requisitos previos

1. **Docker**
   - Windows / Mac: instala [Docker Desktop](https://www.docker.com/products/docker-desktop/)
     y ábrelo (debe estar corriendo).
   - Linux: instala Docker Engine y el plugin Docker Compose.
2. **Una clave API de Groq (gratuita)**
   - Regístrate en [console.groq.com](https://console.groq.com)
   - Ve a **API Keys** → **Create API Key** → copia la clave (empieza por `gsk_...`)
3. ~2 GB de espacio libre para las imágenes Docker.

---

## 3. Instalación paso a paso

### 3.1 Descomprimir
Descomprime el `.zip` en cualquier carpeta (por ejemplo `C:\SpecGenerator-IA` o
`~/SpecGenerator-IA`). Evita rutas con caracteres raros.

### 3.2 Configurar el archivo `.env`
1. En la carpeta del proyecto, **copia** `.env.example` y renombra la copia a `.env`
   - Windows (PowerShell): `Copy-Item .env.example .env`
   - Linux/Mac: `cp .env.example .env`
2. Ábrelo con cualquier editor de texto y pon tu clave de Groq:
   ```
   GROQ_API_KEY=gsk_tu_clave_real_aqui
   ```

### 3.3 ¿Puertos ocupados? (opcional)
El proyecto usa **2 puertos** de tu máquina: `5678` (editor de n8n) y `8080`
(interfaz web). Si alguno ya está en uso, cámbialo en el `.env`:

```
N8N_PORT=5679
WEB_PORT=8081
```

Para comprobar si un puerto está ocupado:
- **Windows (PowerShell):** `Test-NetConnection localhost -Port 8080`
  (si dice `TcpTestSucceeded : True`, está ocupado → elige otro)
- **Linux/Mac:** `lsof -i :8080` (si devuelve algo, está ocupado)

> Los servicios internos (Gotenberg, Kroki) **no** ocupan puertos de tu máquina:
> solo se comunican dentro de la red de Docker.

### 3.4 Levantar los contenedores
Abre una terminal **en la carpeta del proyecto** y ejecuta:

```
docker compose up -d
```

La primera vez descargará las imágenes (puede tardar unos minutos).
Comprueba que los 5 contenedores están corriendo:

```
docker ps
```

Deberías ver: `n8n`, `spec-web`, `gotenberg`, `kroki`, `kroki-mermaid`.

### 3.5 Configurar n8n (solo la primera vez)
1. Abre **http://localhost:5678** (o el puerto que pusieras en `N8N_PORT`).
2. n8n te pedirá **crear una cuenta de administrador local**: pon un email y
   contraseña cualquiera (es solo local, no se envía a ningún sitio).
3. Si aparecen preguntas de personalización, puedes saltarlas.

### 3.6 Importar el workflow
1. En n8n, crea un workflow nuevo (botón **+ / New workflow**).
2. Menú `⋮` (arriba a la derecha) → **Import from File...**
3. Selecciona el archivo `spec-generator-workflow.json` del paquete.
4. Pulsa **Save** (Ctrl+S) para guardarlo.

### 3.7 Activar el workflow  ← paso imprescindible
En la barra superior del editor verás un interruptor **"Inactive"**.
Haz clic para ponerlo en **"Active"** (verde).

> Sin este paso, la interfaz web dará error porque el webhook de producción
> no está registrado. El estado Active **se conserva** aunque reinicies Docker.

### 3.8 ¡Listo!
Abre **http://localhost:8080** (o tu `WEB_PORT`) y ya puedes generar
especificaciones.

---

## 4. Manual de uso

### 4.1 Generar una especificación desde cero
1. En la web, elige **"Generar desde cero"**.
2. Describe el sistema que necesitas:
   - Escribiendo directamente en el cuadro de texto, **o**
   - Cargando un archivo **.txt** (por ejemplo, las notas de una entrevista
     con el cliente). Prueba con `ejemplos/ejemplo-generar-desde-cero.txt`.
   - Cuanta más información des (usuarios, funcionalidades, restricciones,
     presupuesto, plazos), más completa saldrá la especificación.
3. Pulsa **"Generar especificación"** y espera 30–90 segundos.
4. Se muestra el PDF en pantalla: puedes **previsualizarlo**, **descargarlo**
   o pulsar **"Generar otra"**.

### 4.2 Modificar / ampliar una especificación existente
1. Elige **"Modificar existente"**.
2. Sube el **PDF** de la especificación anterior (una generada por esta misma
   herramienta funciona perfecto).
3. Describe los **cambios o nuevas funcionalidades** (texto o .txt).
   Prueba con `ejemplos/ejemplo-modificar-existente.txt`.
4. Pulsa **"Generar especificación"**. El sistema:
   - Analiza si el PDF y tus cambios hablan **del mismo sistema**.
   - Si **sí**: genera una versión ampliada (v1.1) que conserva lo anterior e
     integra lo nuevo, con una página de *Análisis Previo* (solapamientos,
     colisiones, elementos nuevos).
   - Si **no** (p. ej. subes la spec de una tienda y pides cambios de una app
     bancaria): **aborta** y te avisa de que son sistemas distintos, sin
     generar nada.

### 4.3 ¿Qué contiene el PDF generado?
Portada · Resumen ejecutivo · Introducción · Requisitos funcionales, no
funcionales y de información · Fuera de alcance · Análisis de calidad de los
requisitos · Matriz de trazabilidad requisitos↔casos de uso (con alertas si un
requisito queda sin cubrir) · Identificación de actores · Casos de uso ·
4 diagramas UML (casos de uso, actividad, clases y componentes) · Glosario ·
Estudios de viabilidad (técnica, económica con proyección, legal, recursos,
mercado, operacional y temporal con cronograma) · Estudio de alternativas con
recomendaciones y aprobaciones · Riesgos.

### 4.4 Límites del plan gratuito de Groq
- **100.000 tokens al día** para el modelo grande: da para **10–20 PDFs diarios**.
- Si lo superas, verás un error; se restablece a lo largo del día.
- También hay un límite por minuto: si generas varias veces muy seguido y falla,
  espera un minuto y reintenta.

---

## 5. Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| La web da *"El servidor respondió 404"* | El workflow no está **Active** en n8n | Abre n8n y activa el interruptor (paso 3.7) |
| *"El servidor no devolvió JSON válido"* | El workflow falló a mitad | Abre n8n → **Executions** y mira qué nodo está en rojo |
| Error que menciona *rate limit* o *tokens* | Límite diario/minuto de Groq | Espera y reintenta (ver 4.4) |
| `port is already allocated` al levantar | Puerto ocupado en tu máquina | Cambia `N8N_PORT` o `WEB_PORT` en `.env` y repite `docker compose up -d` |
| Los diagramas salen como "no disponible" | Kroki no arrancó | `docker ps` debe mostrar `kroki` y `kroki-mermaid`; si no: `docker compose up -d` |
| La web no carga | Contenedor web caído o puerto mal | `docker ps`, revisa `WEB_PORT`, y `docker compose up -d` |
| Cambié el `.env` y no hace efecto | Compose no recargó | `docker compose down` y luego `docker compose up -d` |

**Ver los registros de un contenedor** (para diagnosticar):
```
docker logs n8n --tail 50
docker logs spec-web --tail 50
```

**Parar todo:** `docker compose down` · **Arrancar de nuevo:** `docker compose up -d`
(los datos de n8n se conservan en un volumen de Docker).

**Empezar de cero** (borra la cuenta y el workflow importado en n8n):
```
docker compose down
docker volume rm specgenerator-ia_n8n_data
docker compose up -d
```
*(el nombre exacto del volumen puede variar; míralo con `docker volume ls`)*

---

## 6. Preguntas frecuentes

**¿Mis datos salen de mi ordenador?**
Solo el texto que escribes se envía a la API de Groq para generar el contenido.
El PDF, los diagramas y todo lo demás se procesan localmente.

**¿Puedo usarlo sin conexión a internet?**
No: la generación de texto necesita la API de Groq. Todo lo demás es local.

**¿Puedo cambiar el modelo de IA?**
Sí, editando los nodos `Code - Preparar Body Groq *` del workflow en n8n
(campo `model`). Por defecto usa `llama-3.3-70b-versatile` para generar y
`llama-3.1-8b-instant` para tareas ligeras.

**¿Funciona en Mac / Linux?**
Sí. Todo corre en Docker; los pasos son los mismos.
