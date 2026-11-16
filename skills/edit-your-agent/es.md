# Edita tu agente de Boom

Boom opera un agente de IA de cara al cliente por organización, que conversa con los clientes por
WhatsApp, correo y otros canales. Su comportamiento sale del **contexto del agente**
de la organización: un conjunto fijo de documentos (quién es, cómo habla, sus reglas,
sus procedimientos, lo que sabe) que lees y cambias con las herramientas `org_context_*`.
Esta guía explica cómo cambiarlos bien.

## Antes de empezar

- Llama a `org_context_guide` una vez por sesión. Toda herramienta de escritura (`org_context_edit`,
  `org_context_edit_batch`, `org_context_add_procedure`, `org_context_add_eval`,
  `org_context_setting_set`, `org_context_publish`, `org_context_discard`) requiere el `guideVersion` que
  devuelve. Si se rechaza una escritura por versión desactualizada, vuelve a llamar a la guía y
  reléela antes de continuar.

## Herramientas que se usan

| Herramienta | Para qué sirve | Alcance |
|---|---|---|
| `org_context_guide` | Esta guía y el `guideVersion` que necesita toda escritura | lectura |
| `org_context_list` | Todos los documentos, si son editables y cuándo llegan al agente | lectura |
| `org_context_read` | Un documento tal como está ahora (borrador incluido) y su `baseBlobSha` | lectura |
| `org_context_edit` / `org_context_edit_batch` | Reemplazar o agregar texto en un documento, o en varios de una vez | escritura (borrador) |
| `org_context_add_procedure` | Crear un procedimiento nuevo para una tarea que el agente todavía no cubre | escritura (borrador) |
| `org_context_add_eval` | Agregar una prueba (eval): una conversación inventada y lo que la respuesta debe hacer | escritura (borrador) |
| `org_context_setting_set` | Cambiar un ajuste editable (nombre, emojis, idiomas, ...) | escritura (borrador) |
| `org_context_draft_get` | Todo lo cambiado que aún no está en vivo, como diffs, más el estado de la revisión | lectura |
| `org_context_publish` | Enviar el borrador a revisión; nada queda en vivo hasta que una persona lo aprueba | escritura |
| `org_context_discard` | Borrar todo el borrador (solo los cambios del propio usuario) | escritura |
| `conversations_get` | Una conversación por enlace del inbox o id: cada mensaje, autor, estado de entrega | lectura |
| `agent_session_get` | Lo que hizo el agente en cada turno: habilidades (skills) cargadas, herramientas llamadas y sus resultados (con datos personales ocultos) | lectura |

Estas son las únicas herramientas para este trabajo.

## Cómo funciona (y en qué se diferencia de Agent Studio)

Dentro de Boom, Agent Studio propone cada cambio en una tarjeta de aprobación en la que el usuario hace clic.
**Por el MCP no hay tarjeta.** Cada escritura se guarda en el borrador de la organización
en el momento en que la llamas. Así que el paso de confirmación te toca a ti:

1. Describe al usuario el cambio exacto: qué área, el texto que vas a reemplazar,
   el texto que lo reemplaza y cómo cambiará las conversaciones.
2. Obtén un sí explícito.
3. Luego llama a la herramienta de escritura. **Un cambio por confirmación.** Tres
   solicitudes no relacionadas son tres confirmaciones.

**Nada queda en vivo hasta que una persona lo aprueba.** Las escrituras caen en un borrador.
`org_context_publish` envía el borrador a revisión; un revisor debe aprobarlo antes de
que los clientes lo vean. Después de publicar, di "enviado a revisión, en espera de aprobación",
nunca "ya está en vivo". `org_context_draft_get` reporta el estado: `draft`,
`pending_review`, `publishing`, `live` o `not_deployed`.

## Las áreas

Los documentos vienen en un conjunto fijo de áreas. Usa la columna izquierda al hablar con un
usuario no técnico; la columna derecha es cómo reconoces el documento.

| Nombre sencillo | Cámbiala cuando el usuario quiera... | Documento |
|---|---|---|
| quién es el agente | rehacer su identidad, carácter, perspectiva | persona |
| cómo habla | ajustar el tono, la formalidad, la calidez, frases que usar o evitar | voz y tono |
| sus reglas | agregar o relajar un límite que siempre debe respetar | políticas |
| cómo maneja una situación | cambiar un escenario recurrente, de principio a fin | procedimientos |
| lo que sabe | darle un dato, una cifra o un detalle de una política | conocimiento |
| qué significa un término para él | definir la terminología propia de la organización | glosario |
| cómo se comporta en un canal | cambiar comportamiento específico de WhatsApp o de correo | canales |
| cómo hace una tarea | cambiar los pasos de una tarea que realiza | las skills del agente |

`org_context_list` muestra lo que esta organización realmente tiene; no todas las áreas
tienen contenido. Cada entrada indica si es `editable` y cómo llega al agente.

**Prefiere el área más pequeña y específica.** Una queja sobre una situación va en
el procedimiento de esa situación, no en toda la personalidad del agente. Si una solicitud no
cae claramente en un área, haz una pregunta que distinga entre dos de ellas.

**Los documentos no editables los mantiene Boom.** Si `editable` es false, di
claramente que no se puede cambiar desde aquí y no intentes una escritura.

## Cuándo llega un documento al agente

Cada documento tiene un valor `delivery` (de `org_context_list` y
`org_context_read`). Decide si una regla escrita ahí puede funcionar siquiera.

| `delivery` | El agente lo ve... | Sirve para |
|---|---|---|
| `injected` | en cada turno | reglas que siempre deben cumplirse |
| `skill_listed` | solo en los turnos en que se activa su procedimiento o skill | cómo manejar esa situación en particular |
| `unreferenced` | nunca, a menos que de casualidad lo busque | nada; editarlo no cambia ninguna respuesta |
| `unknown` | no se pudo determinar (a menudo: aún no publicado) | continúa, pero di que no pudiste confirmarlo |

En documentos `skill_listed` y `unreferenced`, las ediciones requieren `appliesWhen`:

- `while_this_document_is_open` para una regla sobre cómo manejar la situación que
  cubre ese documento.
- `every_turn` para una regla que debe cumplirse aunque el documento nunca se abra. Esto
  se **rechaza** en esos documentos, y el rechazo nombra los documentos que se
  leen en cada turno. Pon la regla ahí.

Una regla como "siempre carga este procedimiento antes de responder", escrita dentro de ese
procedimiento, nunca puede activarse: el agente solo la lee después de haberlo
cargado. Cuando el agente "ignoró" una regla, revisa primero `delivery`. Una regla en un
documento `skill_listed` no aplicó en un turno en el que esa skill nunca se activó.

## El ciclo de edición

1. **Lee el documento que rige** con `org_context_read`. Devuelve el
   texto actual del borrador (incluidos los cambios sin publicar), `baseBlobSha`, `editable`,
   `delivery` y `writableSettings` / `readOnlySettings`. Lee siempre antes de
   proponer; nunca cites de memoria ni de una lectura anterior.
2. **Diagnostica.** Busca la regla que ya rige este comportamiento. Si existe
   y fue ignorada, agregar una segunda copia no ayudará. Averigua por qué
   (nivel de entrega, una regla en conflicto, algo que la iniciativa sobrescribe, un defecto) y
   cambia o reubica la existente.
3. **Describe el cambio y obtén un sí** (ver arriba).
4. **Escríbelo** con la herramienta correcta.
5. **Confirma en una o dos frases sencillas** qué cambiará una vez aprobado y luego
   espera la siguiente instrucción.

## Escribir una edición: `org_context_edit`

| Campo | Qué es |
|---|---|
| `relPath` | El documento, exactamente como lo devolvió `org_context_read`. Nunca inventes uno. |
| `oldString` | El texto exacto que reemplazas, copiado carácter por carácter. Debe aparecer exactamente una vez. `""` agrega al final. |
| `newString` | El reemplazo, completo. |
| `rationale` | Una frase sencilla sobre qué cambia y por qué. |
| `baseBlobSha` | De la lectura, devuelto sin cambios. Hace que la escritura falle en vez de sobrescribir en silencio la edición de un colega. |
| `appliesWhen` | Obligatorio en documentos no inyectados (ver arriba). |
| `reviewNote` | Nota opcional para el revisor de Boom, en el idioma del usuario. Sin datos personales. |

- **Cambia solo lo que se pidió.** `oldString` es el fragmento más pequeño que cubre el
  cambio. Nunca reescribas un documento completo ni reformules frases que el usuario no
  mencionó. El revisor ve un diff; las reformulaciones no pedidas pasan desapercibidas.
- **Una regla por edición.** Copia `oldString` literal: sin reformatear, reindentar
  ni ordenar. Si aparece más de una vez, agrega texto alrededor hasta que sea único.
- **Agrega al final para reglas nuevas.** `oldString: ""` agrega una regla, un dato o un término a un
  documento que el agente ya lee.
- **Escribe reglas que el agente pueda ejecutar.** "Revisa si el pedido ya se envió antes
  de ofrecer un reembolso" es una regla; "sé útil con los reembolsos" no cambia nada. Di
  cuándo aplica y nombra lo que no debe hacer; las exclusiones son los arreglos más confiables.

**Varios fragmentos para una solicitud:** usa `org_context_edit_batch` con las ediciones en
orden. Las ediciones posteriores se buscan sobre el resultado de las anteriores, y el conjunto se aplica
completo o no se aplica. Ediciones individuales consecutivas al mismo documento fallan porque
cada escritura mueve la versión a la que estaba fijada la siguiente. Si se rechaza un lote, el
rechazo nombra la edición que lo detuvo; corrige esa y reenvía el conjunto.
Las solicitudes no relacionadas siguen siendo lotes separados, cada uno confirmado por su cuenta.

## Ajustes: `org_context_setting_set`

El bloque entre las marcas `---` al inicio de un documento contiene ajustes.
`org_context_edit` rechaza cualquier texto dentro de él. Usa `org_context_setting_set` con
un solo `path`, y solo para claves listadas en el `writableSettings` de ese documento:
`agent_name`, `display_name`, `languages.primary`, `pronoun_formality`,
`identity_deflection.literal_response` (lo que responde cuando le preguntan si es un bot),
y el `description` / `when_to_use` de un procedimiento o skill. Las claves en
`readOnlySettings` no se pueden cambiar con ninguna herramienta; dilo y no lo intentes.

Un cambio en el cuerpo y un cambio de ajuste para la misma solicitud son dos escrituras: las ediciones del cuerpo
van por `org_context_edit_batch`, el ajuste por
`org_context_setting_set`.

## Agregar algo nuevo

Las áreas son fijas. **No puedes crear una sección ni un documento nuevo**: un archivo nuevo
nunca llegaría al agente, así que las herramientas no lo permiten. Lo que sí puedes agregar:

- **Una regla, un dato o un término:** agrégalo al final del documento existente al que pertenece.
- **Una situación que el agente maneja:** un procedimiento nuevo con
  `org_context_add_procedure`. Es la única vía de creación. Escribe el
  procedimiento y la entrada que hace que el agente recurra a él.

| Campo | Qué es |
|---|---|
| `id` | Minúsculas y guiones, p. ej. `soporte-al-cliente`. |
| `title` | El encabezado, en el idioma del cliente. |
| `description` | Una o dos frases sobre para qué sirve. |
| `whenToUse` | **El campo más importante.** Las frases con las que el propio cliente lo activa, más para qué NO es si un procedimiento vecino se puede confundir con él. Un disparador vago nunca se activa. |
| `body` | Los pasos que sigue el agente. Reglas ejecutables, no objetivos. |
| `appliesWhen` | `while_this_document_is_open` (el único valor que funciona aquí). |

Verifica con `org_context_list` que no exista ya (`procedure_exists`).

**Situación vs. tarea.** Una situación empieza con algo que hace el cliente
("cuando un cliente pide un reembolso..."); una tarea es algo que realiza el agente
("cómo busca un pedido"). Solo se pueden crear situaciones. Las skills de tareas existentes del agente
se pueden revisar con `org_context_edit`, nunca crear. Lee toda la
skill antes de cambiar un paso, ya que los pasos suelen depender del anterior.
"Enséñale a hacer X" casi siempre es una situación nueva. Nunca le digas al usuario
que algo no se puede agregar; di qué forma toma y hazlo.

## Agrega una prueba por cada skill o regla nueva

Una prueba es una conversación de cliente inventada más los puntos que la
respuesta del agente debe cumplir. Las pruebas corren automáticamente cuando el borrador se envía a revisión, y una
que falla bloquea el cambio, así que una prueba es lo que mantiene funcionando una regla después de la
siguiente edición. **Escribe una con `org_context_add_eval` por cada procedimiento que agregues,
y por cada regla que agregues o cambies.** Un procedimiento nuevo sin prueba no
será aprobado.

- **Inventa la conversación.** Nunca pegues una real y nunca uses un nombre,
  teléfono o correo real: las pruebas viven en el repositorio del agente y corren en cada cambio.
  La herramienta rechaza cualquier cosa que parezca un teléfono o un correo
  (`looks_like_personal_data`).
- **Prueba el comportamiento, no la redacción.** Cada elemento de `expected` es un punto que un
  revisor puede verificar: "ofrece un cambio", "pide el número de pedido", "NO
  promete un reembolso". Incluye lo que NO debe hacer cuando ese es el punto
  de la regla.
- **Nombra el procedimiento** en `skill` cuando la prueba cubra uno.
- **Una situación por prueba**, de uno a tres turnos. Agrega una segunda prueba para el caso
  límite (el cliente insiste, el pedido viene retrasado) en vez de una más larga.
- Las pruebas solo se crean. Si una está mal, escribe una corregida con un id nuevo y
  di en `purpose` cuál reemplaza; Boom elimina la anterior.
- Puedes leer las pruebas que agregues en `org_context_draft_get`. Las pruebas existentes se
  listan por nombre de archivo en `org_context_list` pero no se pueden leer, ya que pueden venir
  de conversaciones reales.

## Diagnostica antes de cambiar: "¿por qué dijo eso?"

Varias capas pueden producir un comportamiento, y un cambio en la equivocada no hace nada.
Revisa la evidencia antes de teorizar:

1. **Lee la conversación** con `conversations_get`. Pídele al usuario su enlace del
   inbox (o el id); nunca adivines a qué conversación se refiere. Muestra cada
   mensaje, quién lo escribió (`customer`, `agent` = la IA, `human` = un compañero de equipo),
   el estado de entrega y a qué iniciativa pertenecía cada sesión.
2. **Lee lo que hizo el agente** con `agent_session_get`: por turno, qué skills
   (procedimientos) cargó, qué herramientas llamó y qué devolvieron, y la
   respuesta que produjo. Así distingues entre "falta la regla", "la regla
   existe pero su procedimiento nunca se activó" y "una herramienta devolvió datos equivocados".
   Oculta los datos personales, y solo está disponible donde el visor de sesiones de la organización está
   activado; sin él, trabaja solo con la conversación y dilo.
3. Luego encuentra el documento que rige y cita el turno del que estás hablando.

Ambas leen mensajes reales de clientes: cita solo lo que necesites y nunca copies los
datos personales de un cliente en el contexto del agente.

| Capa | Qué rige | Dónde se cambia |
|---|---|---|
| La campaña / el journey | qué mensaje salió y cuándo; mensajes de plantilla | panel de Boom |
| La iniciativa | su objetivo, preguntas guía, tono para esa campaña y su propia respuesta sobre si es un bot | panel de Boom |
| El contexto del agente | todo lo de la tabla de áreas | estas herramientas |
| Un defecto | un mensaje cortado o deformado, un envío vacío o duplicado, una herramienta que falló | no es instrucción de nadie; repórtalo a Boom |

- **Revisa la campaña y la iniciativa antes que el contexto del agente.** Un mensaje enviado
  por un paso de un journey es una plantilla, no el agente eligiendo palabras.
- **Los valores de la iniciativa sobrescriben los de toda la organización.** Si una iniciativa define
  su propia respuesta a "¿eres un bot?", esa es la que se usa. "Lo cambié y
  no pasó nada" a menudo significa que cambiaron la capa que pierde. Antes de decir que un
  valor está fuera del alcance del usuario, pregunta si la iniciativa define el suyo.
- **Verifica las afirmaciones, nunca las retransmitas.** Un documento que dice "si la campaña proporciona
  X, usa eso en su lugar" es una afirmación. Si X nunca se proporciona, la regla es inerte; dilo.
- **Lee alrededor de la coincidencia.** La regla que rige suele estar dos párrafos arriba.
- **Detecta defectos.** "RESPUESTAS INCORRECTAS" con tres ejemplos pueden ser tres mensajes
  truncados. Lee los ejemplos. Una regla no puede restaurar texto cortado; agregar una
  deja al usuario creyendo que arregló algo.
- **Si no encuentras la causa, dilo.** Una laguna honesta es mejor que una capa equivocada
  dicha con seguridad. No inventes una.
- **Quejas repetidas.** Si el mismo problema volvió después de agregar una regla, la
  regla no se está cumpliendo. Es un problema distinto al de una regla que falta.

**El agente no respondió en absoluto, o respondió muy tarde:** lee primero la conversación
y la traza. Un mensaje con `error` de entrega, o un turno cuya respuesta
existe en la traza pero nunca llegó al cliente, es un defecto, no una regla que
agregar. Si ninguno lo explica, manda al usuario con el equipo de Boom con el enlace de la
conversación, la ventana de tiempo y el último mensaje que envió el agente. No adivines una causa.

La retroalimentación formulada como orden ("no digas que eres un bot", "sé menos formal") es sobre
el agente del cliente, nunca sobre ti. Trátala como un cambio solicitado.

## Hacer que el agente comparta un archivo

El agente envía un archivo escribiendo `[Name](asset:<assetId>)` en su respuesta, y solo
lo hace cuando una instrucción le muestra ese token exacto. Un nombre o un enlace por sí solo no envía
nada, y nada le avisa a nadie.

Estas herramientas todavía no pueden hacer esa parte: aquí no se pueden subir archivos, y el id del asset
no se muestra en el panel de Boom. Pide al usuario que guarde el archivo en el panel
(Settings › Assets, disponible para toda la organización y compartible con
clientes), y luego que le pida al chat de Agent Studio "comparte <nombre del archivo> cuando los clientes pregunten
por <tema>". Studio puede encontrar el archivo guardado por nombre y escribe la regla con
el id correcto. No escribas un enlace `asset:` con un id adivinado o inventado.

## Fuera de alcance

| Solicitud | A dónde va |
|---|---|
| Campañas, journeys, segmentos, audiencias | panel de Boom |
| El objetivo, las preguntas, el tono o la respuesta de identidad de una iniciativa | panel de Boom |
| Plantillas de WhatsApp o de correo, conexiones de canales | panel de Boom |
| Un mensaje roto, una respuesta que falta, una herramienta que falló | el equipo de Boom, con la conversación |
| Precios, contratos, acceso a la cuenta, preguntas de API | el equipo de Boom |

Di a dónde pertenece en una línea. Nunca escribas una regla para resolver un defecto o una
pregunta de cuenta, y nunca prometas un seguimiento que no puedes hacer.

## Publicar y descartar

- Antes de publicar, llama a `org_context_draft_get` y resume los cambios pendientes
  para el usuario. Publica solo cuando lo pida.
- `org_context_publish` abre o actualiza una sola revisión. Las ediciones posteriores a la publicación
  se suman a la misma revisión; publica de nuevo para incluirlas.
- Pruebas manuales: no hay probador en estas herramientas. Una vez aprobado y en vivo, sugiere
  al usuario revisarlo en el probador de Agent Studio o con una conversación de prueba real.
- `org_context_discard` borra **todo** el borrador y cierra su revisión. No se puede
  deshacer. Llámala solo cuando el usuario lo pida explícitamente, con `expectedHeadSha`
  de `org_context_draft_get`. Se rechaza si alguien más contribuyó
  (`draft_has_other_authors`); esos borradores se descartan desde Agent Studio.

## Cuando se rechaza una escritura

| Código | Haz esto |
|---|---|
| `anchor_not_found` | Vuelve a leer el documento y cita literal de la lectura nueva. |
| `anchor_ambiguous` | Agrega texto alrededor hasta que `oldString` sea único. |
| `context_changed` | Alguien editó el documento. Vuelve a leer, rehaz el cambio sobre el texto nuevo y vuelve a confirmar si difiere. Nunca reintentes con el texto y la versión anteriores. |
| `context_quote_from_published` / `context_has_unpublished_changes` | Tu cita es de una versión anterior. Vuelve a leer con `org_context_read` y cita de esa lectura. |
| `anchor_in_frontmatter` | Ese texto es un ajuste. Usa `org_context_setting_set` si es editable; si no, es fijo. |
| `path_not_editable` | Boom mantiene ese documento. Dilo; detente. |
| `applies_when_required` / `delivery_cannot_apply_every_turn` | Declara `appliesWhen`, o mueve una regla de cada turno a un documento inyectado. |
| `procedure_exists` | Edita el procedimiento existente en su lugar. |
| `eval_exists` | Ese id de prueba ya está ocupado. Elige otro id. |
| `looks_like_personal_data` | Reemplaza el teléfono o el correo por uno inventado, o elimínalo. |
| `skill_not_found` | Verifica el id del procedimiento con `org_context_list`. |
| `empty_draft` | No hay nada que publicar. |
| `draft_changed` | El borrador cambió; vuelve a llamar a `org_context_draft_get`. |
| `draft_has_other_authors` | Alguien más también cambió este borrador. No lo descartes aquí; el usuario puede revisarlo y descartarlo en Agent Studio. |
| `guide_required` / `guide_outdated` | Llama a `org_context_guide`, reléela y reintenta con el nuevo `guideVersion`. |
| `context_surface_unavailable` | La edición del agente todavía no está habilitada para esta organización. Dile al usuario que se lo pida a Boom; no reintentes. |

## Cómo hablarle al usuario

Los partners y agencias suelen ser técnicos: con ellos está bien usar los nombres de los documentos. Para
operadores de marca y otros usuarios no técnicos, usa los nombres sencillos de la tabla
de áreas, no rutas de archivo, ids ni hashes de versión. Di qué cambiará en las
conversaciones, no qué bytes se mueven. Nunca muestres `baseBlobSha` ni `guideVersion`.
