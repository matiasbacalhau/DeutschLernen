# Principio de Diseño: Inmersión Lingüística sin Fricción en DeutschLernen

**Documento:** `docs/DESIGN_IMMERSION.md`  
**Proyecto:** DeutschLernen (A1–C1 Vanilla JS PWA)  
**Fecha:** 2026-11-10  
**Estado:** Directriz de Arquitectura UI / Implementación (Milestone 2)

---

## 1. Fundamentación y Filosofía del Principio

El principio de **"Inmersión sin fricción"** (*Reibungslose Immersion*) establece que una plataforma de aprendizaje de idiomas debe maximizar el contacto constante con la lengua meta (alemán) en la experiencia de usuario diaria, sin erigir barreras de usabilidad, frustración cognitiva o riesgos de pérdida de datos.

En niveles iniciales (A1 y A2), obligar al estudiante a descifrar textos metalingüísticos complejos o advertencias de seguridad en la lengua extranjera genera *sobrecarga extrínseca*: la energía mental se gasta en traducir la interfaz en lugar de aprender el contenido pedagógico. Por el contrario, mantener toda la interfaz en español desaprovecha la oportunidad formativa de adquirir vocabulario procedimental, fórmulas operativas y terminología estructural de forma incidental y natural.

Para resolver este dilema, DeutschLernen adopta un **modelo de inmersión en 3 niveles (Three-Tier Immersion Architecture)**.

---

## 2. Los 3 Niveles de Inmersión (Tiered Immersion)

```
+-------------------------------------------------------------------------+
| Tier 1: Inmersión Total Estructural (Alemán 100%)                       |
|   - Navegación, botones de acción, etiquetas de etapa, badges de estado  |
|   - Ej: "Stufe", "Themenkarte", "Start", "Weiter", "Prüfen", "Zurück"   |
+-------------------------------------------------------------------------+
| Tier 2: Inmersión Guiada y Explicaciones Bilingües                      |
|   - Primario: Alemán sintético y directo (rule_de)                      |
|   - Secundario: Desplegable accesible en español (<details>)            |
|   - Ej: "Verb steht auf Position 2." / [Erklärung auf Spanisch]         |
+-------------------------------------------------------------------------+
| Tier 3: Seguridad y Acciones Críticas (Español)                         |
|   - Respaldo de datos (Backup/Restore JSON), borrado, avisos de cuota   |
|   - Diagnóstico técnico de sincronización y almacenamiento persistente  |
+-------------------------------------------------------------------------+
```

### 2.1. Nivel 1 (Tier 1): Inmersión Total Estructural y de Navegación
- **Ámbito:** Toda la estructura de navegación, botones primarios de acción, nombres de etapas de aprendizaje (*Stufen*), tarjetas de teoría y vocabulario, indicadores de estado y anuncios de accesibilidad (*aria-live*).
- **Idioma:** **Alemán exclusivo**.
- **Justificación:** Los términos son concisos, recurrentes y contextualizados por su ubicación espacial e iconografía. El estudiante los internaliza desde la primera sesión sin necesidad de traducción explícita.

### 2.2. Nivel 2 (Tier 2): Inmersión Guiada y Explicaciones Bilingües
- **Ámbito:** Explicaciones gramaticales de feedback, corrección de errores de sintaxis/morfología y consignas de ejercicios.
- **Idioma:** **Alemán sintético primario + Español desplegable secundario**.
- **Mecanismo:** El feedback muestra una regla concisa y directa en alemán (`rule_de`), por ejemplo:
  > *„Das Verb steht auf Position 2.“*
  Inmediatamente debajo se ofrece un componente desplegable accesible:
  ```html
  <details class="rule-accordion">
    <summary lang="de">Erklärung auf Spanisch anzeigen</summary>
    <p class="rule-detailed" lang="es">En oraciones enunciativas principales, el verbo conjugado siempre ocupa la segunda posición sintáctica, independientemente del elemento en el Vorfeld.</p>
  </details>
  ```
- **Justificación:** El alumno lee primero la formulación natural en alemán. Si su competencia actual no le permite comprender el trasfondo teórico exacto, expande el desplegable en un toque sin abandonar el flujo del ejercicio.

### 2.3. Nivel 3 (Tier 3): Seguridad, Persistencia y Acciones Críticas
- **Ámbito:** Pantallas de ajustes del sistema, exportación e importación de copias de seguridad (JSON backups), confirmaciones de sobreescritura de progreso, advertencias de desalojo de IndexedDB en iOS Safari y diagnósticos técnicos de conexión.
- **Idioma:** **Español** (con terminología técnica estándar).
- **Justificación:** La preservación de datos y la configuración del dispositivo no deben correr riesgos por malas interpretaciones lingüísticas del usuario.

---

## 3. Diccionario Canónico de Terminología UI

A continuación se detalla la correspondencia canónica de términos entre la interfaz previa y la interfaz con inmersión estructural:

| Contexto / Componente | Término previo (ES) | Término inmersivo (DE) | Delta de caracteres | Observaciones de diseño |
|---|---|---|---|---|
| **Estructura curricular** | Escalón | **Stufe** | -2 | Usado en títulos: `Stufe 1 · Entdecken` |
| **Navegación principal** | Inicio | **Start** | -1 | Enlaces a la vista de inicio (`#/`) |
| **Navegación curricular** | Mapa / Mapa de temas | **Themenkarte** | 0 a -3 | Reemplaza "Mapa" en cabeceras y botones |
| **Ajustes de sistema** | Ajustes | **Einstellungen** | +6 | Enlace de cabecera (`index.html`) |
| **Ajustes y backup** | Ajustes y backup | **Einstellungen & Backup** | +6 | Enlace secundario en `home.js` |
| **Acción de ejercicio** | Responder | **Prüfen** | -3 | Botón primario de comprobación |
| **Flujo de avance** | Siguiente / Seguir | **Weiter** | -3 a -1 | Botón para avanzar al próximo ítem |
| **Inicio de grupo** | Empezar | **Start** | -2 | Botón para comenzar grupo nuevo |
| **Navegación retorno** | Volver | **Zurück** | 0 | Botón de retorno en vista de ficha |
| **Consulta teórica** | Ver ficha | **Theoriekarte** | +2 | Acceso a la tarjeta gramatical |
| **Consulta léxica** | Glosario | **Wortschatz** | +2 | Acceso al vocabulario temático |
| **Fin de grupo (éxito)** | Siguiente grupo | **Nächste Gruppe** | -1 | Botón de avance al próximo bloque |
| **Fin de grupo (badge)** | Superado | **Geschafft!** | +1 | Celebración concisa y natural |
| **Fin de grupo (badge)** | Para reforzar | **Zu wiederholen** | 0 | Indicador de repaso necesario |
| **Announcer (correcto)** | Sin errores / Bien | **Fehlerfrei / Richtig** | 0 a +1 | Etiquetas accesibles y tags |
| **Announcer (error)** | Con errores / Incorrecto | **Mit Fehlern / Falsch** | 0 a -4 | Etiquetas accesibles y tags |

### 3.1. Nombres Canónicos de las 5 Etapas (Stufen)

Conforme a la fundamentación pedagógica de `docs/PEDAGOGIA_ESCALONES.md`:

| Stufe | Nombre en YAML / UI | Tipología Pedagógica | Foco Metodológico |
|---|---|---|---|
| **Stufe 1** | **Entdecken** | Descubrir | Inducción guiada antes de la regla formal |
| **Stufe 2** | **Erkennen** | Reconocer | Discriminación, selección múltiple y orden |
| **Stufe 3** | **Im Kontext anwenden** | Detectar y usar | Lectura contextual, spot-error y traducción |
| **Stufe 4** | **Angeleitet produzieren** | Producir guiado | Situaciones dialógicas, transformaciones y síntesis |
| **Stufe 5** | **Freies Schreiben** | Redactar | Composición guiada y libre con corrector |

---

## 4. Desacoplamiento Arquitectónico: Lógica vs. Presentación

Una regla arquitectónica no negociable en DeutschLernen es la **separación estricta entre identificadores internos y presentación visual**:

1. **Invarianza de Claves Internas:**  
   Las claves del motor de progreso (`progress.js`), programador espaciado (`srs.js`), cálculo de inicio (`inicio.js`) y base de datos IndexedDB (`store.js`) se mantienen idénticas en código fuente:
   - Estados de tema: `'nuevo'`, `'en-curso'`, `'dominado'`, `'reforzar'`, `'proximamente'`
   - Estados de escalón: `'sin-intentar'`, `'superado'`, `'reforzar'`, `'pendiente'`
   - Estados de ejercicio: `'nuevo'`, `'visto'`, `'repaso'`, `'dominado'`

2. **Capa de Presentación Exclusiva:**  
   La traducción al alemán se inyecta únicamente en el punto final de renderizado:
   - **En CSS:** mediante pseudoelementos `::after { content: "..." }`:
     ```css
     .map-topic[data-status="nuevo"]::after { content: "neu"; }
     .map-topic[data-status="en-curso"]::after { content: "aktiv"; }
     .map-topic[data-status="dominado"]::after { content: "gemeistert"; }
     .map-topic[data-status="reforzar"]::after { content: "wiederholen"; }
     .map-topic[data-status="proximamente"]::after { content: "demnächst"; }
     ```
   - **En Vistas UI:** mediante diccionarios visuales locales:
     ```javascript
     const TEXT = {
       'sin-intentar': 'noch nicht begonnen',
       'superado': 'abgeschlossen',
       'reforzar': 'wiederholen',
       'pendiente': 'ausstehend'
     };
     ```

Esta directriz garantiza que las suites de pruebas unitarias (`progress.test.js`, `inicio.test.js`, etc.) y las migraciones de esquema sigan siendo 100 % confiables y deterministas.

---

## 5. Reglas de Layout Mobile-First (iOS Safari 375×812 px)

El alemán es reconocido morfológicamente por sus palabras compuestas y sintagmas más largos. Para evitar desbordamientos horizontales o solapamientos en pantallas móviles reducidas:

1. **Defensividad en Flexbox:**
   Todo elemento badge o etiqueta de estado dentro de contenedores flexibles horizontales (como `.map-step` o `.group-bar`) debe incorporar defensas CSS explícitas:
   ```css
   .map-step .muted,
   .map-step .badge {
     flex-shrink: 0;
     white-space: nowrap;
   }
   ```
2. **Dimensiones de Botones e Interacciones Táctiles:**
   - La sustitución de `Responder` (9 letras) por `Prüfen` (6 letras) reduce el ancho natural del botón en ~20%, lo que mejora el balance visual en pantallas angostas.
   - Todo botón interactivo conserva un área táctil mínima de 44×44 px (`min-height: 44px;`) conforme a las pautas de accesibilidad y Apple Human Interface Guidelines.
3. **Manejo de Títulos Largos:**
   En encabezados donde confluyen `Stufe N` y nombres extensos como `Im Kontext anwenden` o `Angeleitet produzieren`, el contenedor permite el quiebre de línea ordenado sin truncar ni desbordar la barra fija de navegación.

---

## 6. Verificación y Mantenimiento

Al incorporar nuevas pantallas, ejercicios o componentes a DeutschLernen:
1. Consultar este documento para asignar la terminología estructural en alemán correspondiente.
2. Confirmar que ninguna clave de estado interna haya sido traducida en la capa lógica.
3. Verificar en un viewport simulado de `375×812` px que no se produzcan saltos de línea indeseados ni desbordamientos horizontales (`overflow-x`).
4. Correr la suite completa de pruebas:
   ```bash
   python3 tools/build_content.py
   python3 tools/validate.py
   python3 -m unittest discover -s tests -p '*_test.py'
   node --test tests/*.test.js
   ```
