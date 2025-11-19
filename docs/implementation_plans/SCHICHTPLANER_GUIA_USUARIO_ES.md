# Guía Completa del Usuario - Planificador de Turnos

## 📋 Índice

1. [Introducción](#introducción)
2. [Roles y Responsabilidades](#roles-y-responsabilidades)
3. [Navegación](#navegación)
4. [Configuración Inicial](#configuración-inicial)
5. [Gestión de Plantillas de Turnos](#gestión-de-plantillas-de-turnos)
6. [Gestión de Disponibilidades](#gestión-de-disponibilidades)
7. [Creación de Turnos](#creación-de-turnos)
8. [Gestión de Turnos](#gestión-de-turnos)
9. [Intercambio de Turnos](#intercambio-de-turnos)
10. [Filtros y Búsqueda](#filtros-y-búsqueda)
11. [Resolución de Problemas](#resolución-de-problemas)
12. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El Planificador de Turnos es una herramienta completa para gestionar los horarios de trabajo de los empleados. Permite crear turnos, asignarlos a empleados, gestionar disponibilidades y facilitar el intercambio de turnos entre empleados.

**Ubicación:** Centro de Trabajo → Tab "Plan de Turno"

---

## Roles y Responsabilidades

### 👨‍💼 Administrador / Planificador de Turnos

**Puede:**
- Crear y gestionar plantillas de turnos
- Generar planes de turnos automáticamente
- Crear turnos manualmente
- Asignar turnos a empleados
- Gestionar disponibilidades (opcional, para otros usuarios)
- Ver y gestionar todas las solicitudes de intercambio

**Debe:**
- Crear plantillas antes de generar turnos
- Asignar turnos después de la generación automática
- Revisar y aprobar/rechazar solicitudes de intercambio (si es necesario)

---

### 👤 Empleado (Usuario)

**Puede:**
- Definir sus propias disponibilidades
- Confirmar turnos asignados
- Crear solicitudes de intercambio de turnos
- Responder a solicitudes de intercambio recibidas
- Ver sus propios turnos en el calendario

**Debe:**
- Mantener sus disponibilidades actualizadas
- Confirmar turnos asignados a tiempo
- Responder a solicitudes de intercambio a tiempo
- Cancelar turnos con suficiente antelación

---

## Navegación

### Cómo acceder al Planificador de Turnos

1. **Menú Principal** (lado izquierdo)
   - Buscar y hacer clic en **"Centro de Trabajo"** (Team Worktime Control)

2. **Tabs** (parte superior de la página)
   - Hacer clic en el tab **"Plan de Turno"** (entre "Tiempo de trabajo y actividades" y "Evaluaciones de tarea")

3. **Calendario de Turnos**
   - Se mostrará el calendario con los turnos de la semana actual

---

## Configuración Inicial

### ⚠️ IMPORTANTE: Antes de empezar

Para que el Planificador de Turnos funcione correctamente, se deben cumplir los siguientes requisitos:

1. **Sucursales** deben existir en el sistema
2. **Roles** deben existir en el sistema
3. **Usuarios/Empleados** deben existir en el sistema
4. **Plantillas de Turnos** deben crearse (ver sección siguiente)
5. **Disponibilidades** pueden crearse (opcional, pero recomendado)

---

## Gestión de Plantillas de Turnos

### ¿Qué son las Plantillas de Turnos?

Las plantillas definen qué tipos de turnos puede tener un rol en un día. Por ejemplo:
- "Turno Matutino" (08:00-16:00)
- "Turno Vespertino" (16:00-00:00)
- "Turno Nocturno" (00:00-08:00)

**⚠️ CRÍTICO:** Sin plantillas, la generación automática creará **0 turnos**.

---

### Crear una Plantilla de Turno (Administrador)

**Ubicación:**
- Tab "Plan de Turno" → Botón **"Plantillas de Turnos"** (icono de documento, parte superior derecha)

**Pasos:**

1. **Abrir Gestión de Plantillas**
   - En el header superior derecho, hacer clic en el botón **"Plantillas de Turnos"** (icono de documento)
   - Se abrirá un panel lateral (Desktop) o modal (Mobile)

2. **Crear Nueva Plantilla**
   - Hacer clic en el icono **"+"** (arriba a la derecha del panel/modal)
   - Se abrirá el formulario

3. **Completar Formulario**
   - **Nombre:** Ingresar un nombre descriptivo (ej: "Turno Matutino", "Turno Vespertino")
   - **Sucursal:** Seleccionar del menú desplegable (debe coincidir con la sucursal para la que se generarán turnos)
   - **Rol:** Seleccionar del menú desplegable (debe coincidir con el rol para el que se generarán turnos)
   - **Hora de Inicio:** Ingresar en formato HH:mm (ej: "08:00", "16:00")
   - **Hora de Fin:** Ingresar en formato HH:mm (ej: "16:00", "00:00")
   - **Duración:** Opcional (se calcula automáticamente)
   - **Activo:** ✅ Dejar marcado (solo las plantillas activas se usan en la generación)

4. **Guardar**
   - Hacer clic en el botón **"Guardar"** (abajo del formulario)
   - La plantilla aparecerá en la lista

**Ejemplo:**
- Nombre: "Turno Matutino"
- Sucursal: "Zúrich"
- Rol: "Camarero"
- Hora de Inicio: "08:00"
- Hora de Fin: "16:00"
- Activo: ✅

---

### Editar una Plantilla (Administrador)

1. Tab "Plan de Turno" → Botón "Plantillas de Turnos"
2. En la lista, hacer clic en el botón **"Editar"** (icono de lápiz, a la derecha de la plantilla)
3. Modificar los campos necesarios
4. **Nota:** Sucursal y Rol no se pueden cambiar al editar (aparecen deshabilitados)
5. Hacer clic en **"Guardar"**

---

### Eliminar una Plantilla (Administrador)

1. Tab "Plan de Turno" → Botón "Plantillas de Turnos"
2. En la lista, hacer clic en el botón **"Eliminar"** (icono de papelera, a la derecha de la plantilla)
3. Confirmar en el diálogo: "¿Realmente desea eliminar esta plantilla?"
4. Hacer clic en **"OK"**

**⚠️ ADVERTENCIA:** Las plantillas eliminadas no se pueden recuperar.

---

### Desactivar una Plantilla (Administrador)

1. Editar la plantilla
2. Desmarcar la casilla **"Activo"**
3. Guardar

**Uso:** Para archivar plantillas temporalmente sin eliminarlas (ej: durante renovaciones).

---

## Gestión de Disponibilidades

### ¿Qué son las Disponibilidades?

Las disponibilidades definen cuándo un empleado está disponible para trabajar. Se utilizan en la generación automática para asignar turnos a los empleados correctos.

**Tipos de Disponibilidad:**
- **Disponible:** Disponibilidad estándar
- **Preferida:** Disponibilidad preferida (mayor prioridad en la asignación)
- **No Disponible:** No disponible para trabajar

---

### Crear una Disponibilidad (Empleado)

**Ubicación:**
- Tab "Plan de Turno" → Botón **"Disponibilidades"** (icono de casilla, parte superior derecha)

**Pasos:**

1. **Abrir Gestión de Disponibilidades**
   - En el header superior derecho, hacer clic en el botón **"Disponibilidades"** (icono de casilla)
   - Se abrirá un panel lateral (Desktop) o modal (Mobile)

2. **Crear Nueva Disponibilidad**
   - Hacer clic en el icono **"+"** (arriba a la derecha del panel/modal)
   - Se abrirá el formulario

3. **Completar Formulario**
   - **Sucursal:** Opcional (seleccionar si solo aplica a una sucursal específica)
   - **Rol:** Opcional (seleccionar si solo aplica a un rol específico)
   - **Día de la Semana:** Seleccionar (Todos los días / Domingo / Lunes / ... / Sábado)
   - **Hora de Inicio:** Opcional (ej: "08:00") - Si está vacío, todo el día disponible
   - **Hora de Fin:** Opcional (ej: "16:00") - Si está vacío, todo el día disponible
   - **Fecha de Inicio:** Opcional (inicio del período de validez)
   - **Fecha de Fin:** Opcional (fin del período de validez)
   - **Tipo:** Seleccionar (Disponible / Preferida / No Disponible)
   - **Prioridad:** Número del 1 al 10 (mayor = más preferido, por defecto: 5)
   - **Notas:** Opcional
   - **Activo:** ✅ Dejar marcado

4. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - La disponibilidad aparecerá en la lista

**Ejemplos:**

**Ejemplo 1: Disponibilidad Estándar**
- Día: Lunes
- Hora de Inicio: "08:00"
- Hora de Fin: "16:00"
- Tipo: Disponible
- Prioridad: 5

**Ejemplo 2: Disponibilidad Preferida**
- Día: Sábado
- Hora de Inicio: "10:00"
- Hora de Fin: "14:00"
- Tipo: Preferida
- Prioridad: 8

**Ejemplo 3: No Disponible**
- Día: Domingo
- Tipo: No Disponible

---

### Editar una Disponibilidad (Empleado)

1. Tab "Plan de Turno" → Botón "Disponibilidades"
2. En la lista, hacer clic en el botón **"Editar"** (icono de lápiz)
3. Modificar los campos necesarios
4. Hacer clic en **"Guardar"**

---

### Eliminar una Disponibilidad (Empleado)

1. Tab "Plan de Turno" → Botón "Disponibilidades"
2. En la lista, hacer clic en el botón **"Eliminar"** (icono de papelera)
3. Confirmar en el diálogo
4. Hacer clic en **"OK"**

---

## Creación de Turnos

### Generación Automática de Turnos (Administrador)

**Ubicación:**
- Tab "Plan de Turno" → Botón **"Generar"** (icono de refresco/generar, parte superior derecha)

**⚠️ PREREQUISITOS:**
- ✅ Plantillas de Turnos deben existir para la Sucursal + Roles seleccionados
- ✅ Plantillas deben estar activas
- ⚠️ Disponibilidades son opcionales (sin disponibilidades, los turnos se crean sin usuario asignado)

**Pasos:**

1. **Abrir Generador**
   - En el header superior derecho, hacer clic en el botón **"Generar"** (icono de refresco/generar)
   - Se abrirá un panel lateral (Desktop) o modal (Mobile)

2. **Completar Formulario**
   - **Fecha de Inicio:** Seleccionar fecha (ej: "2025-01-20")
   - **Fecha de Fin:** Seleccionar fecha (ej: "2025-01-26")
   - **Sucursal:** Seleccionar del menú desplegable
   - **Roles:** Seleccionar una o más roles (casillas de verificación)
     - **Nota:** Si no se seleccionan roles, se usarán todos los roles de la sucursal

3. **Generar**
   - Hacer clic en el botón **"Generar"** (abajo del formulario)
   - El sistema procesará la generación

4. **Revisar Resultados**
   - Se mostrará una página de resultados con:
     - Número de turnos generados
     - Conflictos (si los hay):
       - Turnos sin usuario asignado (no hay disponibilidades)
       - Solapamientos de tiempo
   - Revisar la lista de turnos generados

5. **Cerrar**
   - Hacer clic en el botón **"Cerrar"**
   - Los turnos aparecerán en el calendario

**Resultado:**
- Los turnos se crean con estado "Planificado" (scheduled)
- Si hay disponibilidades, el sistema intenta asignar usuarios automáticamente
- Si no hay disponibilidades, los turnos se crean sin usuario asignado (userId = null)
- El administrador debe asignar usuarios manualmente si es necesario

---

### Creación Manual de Turnos (Administrador)

**Ubicación:**
- **Opción A:** Botón **"Añadir turno"** (icono de "+" en círculo azul, parte superior izquierda)
- **Opción B:** Hacer clic en una fecha en el calendario

**Pasos:**

1. **Abrir Formulario**
   - **Opción A:** Hacer clic en el botón **"Añadir turno"** (parte superior izquierda)
   - **Opción B:** Hacer clic en una fecha en el calendario (el formulario se abrirá con esa fecha prellenada)

2. **Completar Formulario**
   - **Sucursal:** Seleccionar del menú desplegable
   - **Rol:** Seleccionar del menú desplegable
   - **Plantilla de Turno:** Seleccionar del menú desplegable (define hora de inicio/fin)
   - **Empleado:** Opcional (seleccionar o dejar vacío para asignar después)
   - **Fecha:** Seleccionar (si se usó Opción B, ya está prellenada)
   - **Notas:** Opcional

3. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - El turno aparecerá en el calendario

---

### Asignar Turnos a Empleados (Administrador)

**Ubicación:**
- Calendario → Hacer clic en un turno

**Pasos:**

1. **Seleccionar Turno**
   - En el calendario, hacer clic en un turno (aparece como bloque de evento)

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral (Desktop) o modal (Mobile) con los detalles del turno

3. **Asignar Empleado**
   - En el campo **"Empleado"** (menú desplegable), seleccionar un empleado
   - El sistema verificará automáticamente:
     - Solapamientos (el empleado ya tiene un turno a la misma hora)
     - Disponibilidades (el empleado está disponible)

4. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - El turno se asignará y el empleado recibirá una notificación

**Resultado:**
- El turno se asigna (userId se establece, estado = "Planificado")
- El empleado recibe una notificación
- El turno aparece en el calendario con el nombre del empleado

---

## Gestión de Turnos

### Confirmar un Turno (Empleado)

**Cuándo:** Después de que un turno ha sido asignado

**Pasos:**

1. **Seleccionar Turno Propio**
   - En el calendario, hacer clic en uno de tus turnos (turnos donde userId = tu usuario)
   - Los turnos propios aparecen con un color diferente

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral o modal con los detalles del turno

3. **Cambiar Estado**
   - En el campo **"Estado"** (menú desplegable), seleccionar **"Confirmado"**

4. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - El turno se confirmará y el administrador recibirá una notificación

**Resultado:**
- Estado = "Confirmado" (confirmed)
- confirmedAt se establece
- El administrador recibe una notificación

---

### Cancelar un Turno (Empleado o Administrador)

**Cuándo:** Cuando un turno no se puede realizar (enfermedad, vacaciones, etc.)

**Pasos:**

1. **Seleccionar Turno**
   - En el calendario, hacer clic en el turno

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral o modal

3. **Cambiar Estado**
   - En el campo **"Estado"** (menú desplegable), seleccionar **"Cancelado"**

4. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - El turno se cancelará y el administrador recibirá una notificación

**Resultado:**
- Estado = "Cancelado" (cancelled)
- El turno puede ser reasignado a otro empleado
- El administrador recibe una notificación

---

### Eliminar un Turno (Administrador)

**Pasos:**

1. **Seleccionar Turno**
   - En el calendario, hacer clic en el turno

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral o modal

3. **Eliminar**
   - Hacer clic en el botón **"Eliminar"** (rojo, abajo del formulario)
   - Aparecerá un diálogo de confirmación: "¿Realmente desea eliminar este turno?"

4. **Confirmar**
   - Hacer clic en **"OK"** en el diálogo
   - El turno se eliminará permanentemente

**⚠️ ADVERTENCIA:** Los turnos eliminados no se pueden recuperar.

---

### Editar un Turno (Administrador)

**Pasos:**

1. **Seleccionar Turno**
   - En el calendario, hacer clic en el turno

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral o modal

3. **Modificar Campos**
   - **Empleado:** Cambiar (menú desplegable)
   - **Fecha:** Cambiar (campo de fecha)
   - **Estado:** Cambiar (menú desplegable)
   - **Notas:** Modificar (área de texto)
   - **Nota:** Sucursal, Rol y Plantilla no se pueden cambiar (aparecen deshabilitados)

4. **Guardar**
   - Hacer clic en el botón **"Guardar"**
   - Los cambios se aplicarán

---

## Intercambio de Turnos

### Crear una Solicitud de Intercambio (Empleado)

**Cuándo:** Cuando un empleado quiere intercambiar su turno con otro empleado

**Prerequisitos:**
- El turno debe pertenecer al empleado (userId = empleado actual)
- El turno no debe estar cancelado o ya intercambiado

**Pasos:**

1. **Seleccionar Turno Propio**
   - En el calendario, hacer clic en uno de tus turnos

2. **Abrir Formulario de Edición**
   - Se abrirá un panel lateral o modal

3. **Iniciar Intercambio**
   - Hacer clic en el botón **"Intercambiar turno"** (en el formulario, junto a "Guardar")
   - Se abrirá un nuevo panel/modal: `SwapRequestModal`

4. **Completar Formulario**
   - **Turno Propio:** Solo lectura (muestra tu turno actual)
   - **Turno Objetivo:** Seleccionar del menú desplegable
     - **Filtros automáticos:** Solo muestra turnos que:
       - Tienen el mismo Rol
       - Tienen la misma Sucursal
       - Tienen un usuario asignado
       - No están cancelados o ya intercambiados
   - **Mensaje:** Opcional (área de texto para agregar un mensaje)

5. **Crear Solicitud**
   - Hacer clic en el botón **"Crear solicitud de intercambio"** (abajo del formulario)
   - La solicitud se creará

**Resultado:**
- Se crea una solicitud de intercambio (estado = "Pendiente" / pending)
- El usuario objetivo recibe una notificación

---

### Responder a una Solicitud de Intercambio (Empleado)

**Cuándo:** Después de recibir una solicitud de intercambio

**Pasos:**

1. **Abrir Gestión de Solicitudes**
   - Tab "Plan de Turno" → Botón **"Solicitudes de Intercambio"** (icono de flecha, parte superior derecha)
   - Se abrirá un panel lateral o modal con dos tabs:
     - **"Enviadas":** Tus solicitudes (las que has creado)
     - **"Recibidas":** Solicitudes recibidas (de otros empleados)

2. **Ver Solicitudes Recibidas**
   - Hacer clic en el tab **"Recibidas"**
   - Se mostrará una lista de solicitudes recibidas

3. **Seleccionar Solicitud**
   - Hacer clic en una solicitud de la lista
   - Se mostrarán los detalles:
     - Turno original (tu turno)
     - Turno objetivo (turno del solicitante)
     - Mensaje (si hay uno)
     - Estado (Pendiente)

4. **Responder**
   - Hacer clic en el botón **"Aceptar"** (verde, a la derecha de la solicitud)
     - **O**
   - Hacer clic en el botón **"Rechazar"** (rojo, a la derecha de la solicitud)

**Resultado:**

**Si se Acepta:**
- Ambos turnos se intercambian (userId se intercambia)
- Estado = "Intercambiado" (swapped)
- Ambos usuarios reciben una notificación

**Si se Rechaza:**
- Estado = "Rechazado" (rejected)
- El solicitante recibe una notificación

---

### Ver Solicitudes de Intercambio (Administrador)

**Pasos:**

1. Tab "Plan de Turno" → Botón "Solicitudes de Intercambio"
2. Se abrirá un panel lateral o modal con dos tabs:
   - **"Enviadas":** Todas las solicitudes enviadas
   - **"Recibidas":** Todas las solicitudes recibidas
3. **Filtrar por Estado:** Menú desplegable arriba (todas / pendiente / aprobada / rechazada)
4. **Ver Detalles:**
   - Solicitante (quien creó la solicitud)
   - Usuario objetivo (quien debe responder)
   - Turno original (detalles)
   - Turno objetivo (detalles)
   - Estado (pendiente / aprobada / rechazada)
   - Mensaje (si hay uno)

**Propósito:** El administrador tiene una visión general de todas las solicitudes de intercambio.

---

## Filtros y Búsqueda

### Filtrar Turnos (Todos los Usuarios)

**Ubicación:**
- Tab "Plan de Turno" → Botón **"Filtro"** (icono de embudo, parte superior derecha)
- **Badge:**** Muestra el número de filtros activos (si > 0, círculo azul arriba a la derecha del botón)

**Pasos:**

1. **Abrir Panel de Filtros**
   - En el header superior derecho, hacer clic en el botón **"Filtro"** (icono de embudo)
   - Se mostrará un panel de filtros debajo del header (caja blanca con borde)

2. **Seleccionar Filtros**
   - **Sucursal:** Lista de casillas de verificación (selección múltiple, desplazable)
   - **Rol:** Lista de casillas de verificación (selección múltiple, desplazable)
   - **Estado:** Lista de casillas de verificación (selección múltiple, desplazable)
     - Planificado (scheduled)
     - Confirmado (confirmed)
     - Cancelado (cancelled)
     - Intercambiado (swapped)
   - **Empleado:** Lista de casillas de verificación (selección múltiple, desplazable)

3. **Aplicar Filtros**
   - Marcar las casillas deseadas (múltiples por categoría)
   - Hacer clic en el botón **"Aplicar"** (azul, abajo a la derecha del panel)
     - **O** hacer clic en el botón **"Restablecer"** (gris, abajo a la izquierda) para limpiar todos los filtros
   - El panel se cerrará y el calendario mostrará solo los turnos filtrados

**Resultado:**
- El calendario muestra solo los turnos que coinciden con los filtros seleccionados
- El botón de filtro muestra un badge con el número de filtros activos

---

### Navegar entre Semanas (Todos los Usuarios)

**Ubicación:**
- Header central del planificador de turnos

**Controles:**
- **"Anterior"** (←): Botón de flecha izquierda (izquierda de la visualización de semana)
- **"Siguiente"** (→): Botón de flecha derecha (derecha de la visualización de semana)
- **"Hoy"** (📅): Botón de calendario (derecha de la visualización de semana)
- **Visualización de Semana:** Texto en el centro (ej: "17.11.2025 - 23.11.2025")

**Pasos:**

1. **Semana Anterior**
   - Hacer clic en el botón **"Anterior"** (←)
   - El calendario cargará los turnos de la semana anterior

2. **Semana Siguiente**
   - Hacer clic en el botón **"Siguiente"** (→)
   - El calendario cargará los turnos de la semana siguiente

3. **Semana Actual**
   - Hacer clic en el botón **"Hoy"** (📅)
   - El calendario cargará los turnos de la semana actual

---

### Cambiar Vista (Todos los Usuarios)

**Ubicación:**
- Header superior derecho, después de los otros botones

**Controles:**
- **"Semana"** (📅): Botón de calendario (vista semanal)
- **"Mes"** (📊): Botón de cuadrícula (vista mensual)

**Pasos:**

1. **Vista Semanal**
   - Hacer clic en el botón **"Semana"** (📅)
   - El calendario cambiará a vista semanal (timeGridWeek)

2. **Vista Mensual**
   - Hacer clic en el botón **"Mes"** (📊)
   - El calendario cambiará a vista mensual (dayGridMonth)

---

## Resolución de Problemas

### Problema: La generación automática crea 0 turnos

**Causa:** No hay plantillas de turnos para la Sucursal + Roles seleccionados.

**Solución:**
1. Verificar que existen plantillas:
   - Tab "Plan de Turno" → Botón "Plantillas de Turnos"
   - Revisar la lista: ¿Hay plantillas para la Sucursal y Roles seleccionados?
2. Si no hay plantillas:
   - Crear plantillas (ver sección "Gestión de Plantillas de Turnos")
   - Asegurarse de que las plantillas estén activas
3. Verificar que la Sucursal y Roles en las plantillas coincidan con la generación

**Checklist:**
- [ ] Plantillas existen para la Sucursal seleccionada
- [ ] Plantillas existen para los Roles seleccionados
- [ ] Plantillas están activas (isActive = true)
- [ ] Plantillas tienen hora de inicio y fin

---

### Problema: Los turnos se crean sin empleado asignado

**Causa:** No hay disponibilidades que coincidan con los turnos.

**Solución:**
1. **Opción A: Crear Disponibilidades**
   - Los empleados deben crear sus disponibilidades
   - Tab "Plan de Turno" → Botón "Disponibilidades"
   - Crear disponibilidades que coincidan con los turnos

2. **Opción B: Asignar Manualmente**
   - El administrador puede asignar empleados manualmente
   - Hacer clic en el turno → Seleccionar empleado → Guardar

---

### Problema: No puedo crear una solicitud de intercambio

**Causas posibles:**
1. El turno no es tuyo (userId ≠ tu usuario)
2. El turno está cancelado o ya intercambiado
3. No hay turnos objetivo disponibles (mismo rol/sucursal, con usuario, no cancelado/intercambiado)

**Solución:**
1. Verificar que el turno es tuyo
2. Verificar que el turno no está cancelado o intercambiado
3. Verificar que existen turnos objetivo disponibles

---

### Problema: No veo el botón "Plantillas de Turnos"

**Causa:** El botón no está visible o la página no se ha recargado.

**Solución:**
1. Recargar la página (F5 o Ctrl+R)
2. Verificar que estás en el tab "Plan de Turno"
3. Buscar el botón en el header superior derecho (icono de documento)
4. Si aún no aparece, contactar al administrador del sistema

---

### Problema: Error al guardar una plantilla

**Causas posibles:**
1. Nombre duplicado (dentro de la misma Sucursal + Rol)
2. Hora de inicio >= hora de fin (excepto para turnos nocturnos)
3. Campos requeridos vacíos

**Solución:**
1. Cambiar el nombre de la plantilla
2. Verificar que la hora de inicio < hora de fin (o usar formato correcto para turnos nocturnos)
3. Completar todos los campos requeridos (Nombre, Sucursal, Rol, Hora de Inicio, Hora de Fin)

---

## Preguntas Frecuentes

### ¿Puedo tener múltiples plantillas para la misma Sucursal + Rol?

**Sí.** Puedes tener múltiples plantillas para la misma combinación. Por ejemplo:
- "Turno Matutino" (08:00-16:00)
- "Turno Vespertino" (16:00-00:00)
- "Turno Nocturno" (00:00-08:00)

Durante la generación, se crearán turnos para **todas las plantillas activas**.

---

### ¿Qué pasa si no creo disponibilidades?

**Sin disponibilidades:**
- ✅ Los turnos se crean (basados en plantillas)
- ❌ Los turnos **no tienen usuario asignado** (userId = null)
- ⚠️ El administrador debe asignar usuarios manualmente

**Con disponibilidades:**
- ✅ Los turnos se crean
- ✅ El sistema intenta asignar usuarios automáticamente
- ✅ Los usuarios con mayor prioridad son preferidos

---

### ¿Puedo cambiar la Sucursal o Rol de una plantilla después de crearla?

**No.** Sucursal y Rol no se pueden cambiar al editar una plantilla (aparecen deshabilitados). Si necesitas cambiar estos campos, debes crear una nueva plantilla.

---

### ¿Qué significa "Prioridad" en las disponibilidades?

La prioridad (1-10) determina qué empleados son preferidos durante la asignación automática:
- **Mayor prioridad = más preferido**
- Se combina con el tipo de disponibilidad (Disponible / Preferida)
- Los empleados con disponibilidad "Preferida" reciben un bonus de +5 a la prioridad

---

### ¿Puedo intercambiar un turno que ya está confirmado?

**Sí.** Puedes crear una solicitud de intercambio para un turno confirmado, siempre que:
- El turno es tuyo
- El turno no está cancelado o ya intercambiado
- Existe un turno objetivo disponible

---

### ¿Qué pasa si rechazo una solicitud de intercambio?

**Si rechazas:**
- La solicitud se marca como "Rechazada"
- El solicitante recibe una notificación
- Los turnos **no se intercambian**

---

### ¿Puedo ver todos los turnos de todos los empleados?

**Depende de tus permisos:**
- **Administradores:** Pueden ver todos los turnos
- **Empleados:** Solo pueden ver sus propios turnos y turnos no asignados

---

### ¿Cómo sé si un turno está asignado a mí?

**En el calendario:**
- Los turnos asignados a ti aparecen con un color diferente
- Al hacer clic, verás tu nombre en el formulario de edición
- En la vista de lista, puedes filtrar por "Empleado" = tu nombre

---

## Flujos de Trabajo Típicos

### Flujo 1: Creación Semanal de Plan de Turnos

**Para Administradores:**

1. **Preparación (Una vez)**
   - Crear plantillas de turnos para todas las Sucursales + Roles necesarios
   - Verificar que los empleados tienen disponibilidades actualizadas

2. **Generación Semanal**
   - Tab "Plan de Turno" → Botón "Generar"
   - Seleccionar rango de fechas (ej: próxima semana)
   - Seleccionar Sucursal y Roles
   - Hacer clic en "Generar"
   - Revisar resultados y conflictos

3. **Asignación**
   - Revisar turnos sin usuario asignado
   - Hacer clic en cada turno → Asignar empleado → Guardar
   - O dejar que el sistema asigne automáticamente (si hay disponibilidades)

4. **Seguimiento**
   - Esperar confirmaciones de empleados
   - Reasignar turnos cancelados si es necesario

**Para Empleados:**

1. **Recibir Notificación**
   - Notificación: "Se te ha asignado un turno"
   - Hacer clic en el icono de notificaciones

2. **Confirmar Turno**
   - Tab "Plan de Turno" → Hacer clic en tu turno
   - Cambiar estado a "Confirmado" → Guardar

---

### Flujo 2: Intercambio de Turnos

**Empleado A (Solicitante):**

1. Tab "Plan de Turno" → Hacer clic en tu turno
2. Botón "Intercambiar turno" → Seleccionar turno objetivo → Crear solicitud

**Empleado B (Receptor):**

1. Recibir notificación: "Solicitud de intercambio recibida"
2. Tab "Plan de Turno" → Botón "Solicitudes de Intercambio" → Tab "Recibidas"
3. Revisar solicitud → Aceptar o Rechazar

**Resultado:**
- Si se acepta: Turnos intercambiados, ambos reciben notificación
- Si se rechaza: Solicitud rechazada, solicitante recibe notificación

---

### Flujo 3: Cancelación de Turno

**Empleado:**

1. Tab "Plan de Turno" → Hacer clic en tu turno
2. Cambiar estado a "Cancelado" → Guardar
3. Administrador recibe notificación

**Administrador:**

1. Recibir notificación: "Turno cancelado"
2. Tab "Plan de Turno" → Ver turno cancelado
3. Opciones:
   - Crear nuevo turno
   - Asignar otro empleado al turno existente

---

## Notificaciones

### ¿Cuándo se envían notificaciones?

1. **Turno Asignado**
   - **A:** Empleado (quien recibe el turno)
   - **Cuándo:** Después de la asignación (userId se establece)
   - **Dónde:** Icono de notificaciones (arriba a la derecha en la navegación)

2. **Turno Confirmado**
   - **A:** Administrador (quien creó el turno)
   - **Cuándo:** Después de la confirmación (estado = "Confirmado")
   - **Dónde:** Icono de notificaciones

3. **Turno Cancelado**
   - **A:** Administrador (quien creó el turno)
   - **Cuándo:** Después de la cancelación (estado = "Cancelado")
   - **Dónde:** Icono de notificaciones

4. **Solicitud de Intercambio Creada**
   - **A:** Usuario objetivo (quien tiene el turno objetivo)
   - **Cuándo:** Después de crear la solicitud
   - **Dónde:** Icono de notificaciones

5. **Solicitud de Intercambio Aceptada**
   - **A:** Ambos usuarios (solicitante y objetivo)
   - **Cuándo:** Después de aceptar (estado = "Aprobada")
   - **Dónde:** Icono de notificaciones

6. **Solicitud de Intercambio Rechazada**
   - **A:** Solicitante (quien creó la solicitud)
   - **Cuándo:** Después de rechazar (estado = "Rechazada")
   - **Dónde:** Icono de notificaciones

---

## Estados de Turnos

### Estados en el Calendario (codificados por color)

1. **Planificado** (scheduled) - Color: Amarillo/Naranja
   - Turno creado pero no confirmado
   - Puede estar sin usuario asignado (userId = null)
   - O con usuario asignado pero no confirmado

2. **Confirmado** (confirmed) - Color: Verde
   - Empleado ha confirmado el turno
   - confirmedAt se establece

3. **Cancelado** (cancelled) - Color: Rojo
   - Turno cancelado
   - Puede ser reasignado

4. **Intercambiado** (swapped) - Color: Azul
   - Turno intercambiado con otro
   - userId se intercambió

---

### Estados de Solicitudes de Intercambio

1. **Pendiente** (pending) - Badge: Amarillo
   - Solicitud creada, esperando respuesta

2. **Aprobada** (approved) - Badge: Verde
   - Solicitud aceptada
   - Turnos intercambiados

3. **Rechazada** (rejected) - Badge: Rojo
   - Solicitud rechazada

4. **Cancelada** (cancelled) - Badge: Gris
   - Solicitud cancelada

---

## Consejos y Mejores Prácticas

### Para Administradores:

- **Plantillas:** Crear plantillas para todas las combinaciones Sucursal + Rol que necesitas
- **Generación Automática:** Revisa los conflictos después de la generación
- **Asignación:** Asigna usuarios manualmente si no hay disponibilidades
- **Seguimiento:** Revisa regularmente los turnos no confirmados

### Para Empleados:

- **Disponibilidades:** Mantén tus disponibilidades actualizadas
- **Confirmación:** Confirma turnos asignados a tiempo
- **Intercambios:** Responde a solicitudes de intercambio a tiempo
- **Cancelaciones:** Cancela turnos con suficiente antelación

---

## Resumen Rápido

### ¿Quién hace qué?

- **Administrador:** Plantillas, Generación, Asignación, Gestión
- **Empleado:** Disponibilidades, Confirmación, Solicitudes de Intercambio

### ¿Cuándo?

- **Plantillas:** Una vez / Cuando sea necesario
- **Disponibilidades:** Regularmente (cuando cambien)
- **Generación:** Regularmente (semanal, mensual)
- **Asignación:** Después de la generación
- **Confirmación:** Después de la asignación
- **Intercambio:** Cuando sea necesario

### ¿Dónde en el Frontend?

- **Página:** `/team-worktime-control`
- **Tab:** "Plan de Turno"
- **Header:** Arriba (Izquierda: Botón Añadir, Centro: Navegación de Semana, Derecha: Filtros/Disponibilidades/Plantillas/Intercambio/Generar/Actualizar/Botones de Vista)
- **Calendario:** Área principal (muestra turnos como eventos)
- **Paneles/Modales:** Se abren al hacer clic en botones (Desktop: Panel lateral derecha, Mobile: Modal centrado)

---

## Soporte

Si tienes problemas o preguntas:

1. Revisar esta guía
2. Revisar la sección "Resolución de Problemas"
3. Contactar al administrador del sistema
4. Revisar los logs del sistema (si tienes acceso)

---

**Última actualización:** 2025-01-XX  
**Versión:** 1.0

