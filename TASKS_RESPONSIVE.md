# Tareas: Corrección de Responsividad Mobile y Bugs de UI — TattooSuite.app

Generado a partir de una auditoría de código (estática) + verificación visual en desktop (1440px) realizada el 2026-08-10. El layout general (sidebar) ya es responsive (patrón shadcn con Sheet/drawer bajo el breakpoint `md`) — NO tocar `src/components/ui/sidebar.tsx` ni `src/components/AppSidebar.tsx`.

TattooSuite.app comparte arquitectura con una app hermana (Glamtica.app) que tiene un archivo de tareas equivalente (`TASKS_RESPONSIVE.md` en su propio repo) — varios bugs son idénticos porque el componente base es el mismo, pero **este archivo es autocontenido**: no depende de tocar el otro repo.

## Reglas generales para quien ejecute este archivo

1. Cada tarea es independiente y atómica. Ejecutarlas en el orden numerado, una por una.
2. **No cambiar el comportamiento visual en desktop (≥ `md`, 768px)**. Todos los fixes deben ser puramente aditivos (agregar clases de Tailwind con prefijo de breakpoint), nunca eliminar o reemplazar el comportamiento desktop existente.
3. No refactorizar, no renombrar variables, no "mejorar" código fuera de lo pedido en cada tarea.
4. Después de cada tarea, correr `npm run build` (o el comando de build configurado) y confirmar que compila sin errores de TypeScript antes de pasar a la siguiente.
5. Marcar el checkbox `[ ]` → `[x]` de cada tarea al completarla.

---

## 0. [ ] CAUSA RAÍZ GLOBAL — Falta `min-w-0` en el wrapper de contenido, rompe TODA la app en mobile cuando hay contenido ancho no-shrinkable

**Archivo:** `src/components/Layout.tsx`
**Línea:** 87 (`<div className="flex-1 flex flex-col">`)

**Problema:** Este div es un hijo `flex-1` dentro del flex row raíz (`sidebar + contenido`). En CSS Flexbox, un item `flex-1` sin `min-width: 0` nunca se encoge por debajo del ancho intrínseco de su contenido. Cuando cualquier página tiene un elemento que no puede achicarse (ej. la barra de herramientas del editor de texto enriquecido "Quill" en Configuración > Identidad, que tiene ~15 íconos en una fila con `flex-wrap: nowrap`), **toda la app** se estira horizontalmente para acomodarlo — en vez de que `<main className="overflow-auto">` contenga ese desborde con scroll interno, como está pensado. Esto se confirmó en vivo (en Glamtica.app, que comparte este mismo archivo): en `/app/settings?tab=identity` a 412px de ancho, el body termina con `scrollWidth: 510px` y aparece scroll horizontal en toda la página. TattooSuite.app tiene el mismo `Layout.tsx` línea por línea, así que aplica igual aunque no se haya vuelto a verificar visualmente en esta app puntual.

Esta es la causa más probable de que "Configuración no tenga nada de responsive" — no es un bug de esa página puntual, es que Configuración tiene el elemento más ancho no-shrinkable de toda la app (la toolbar del editor), y por eso expone el bug del layout raíz que otras páginas no disparan.

**Fix:** Cambiar:
```tsx
<div className="flex-1 flex flex-col">
```
por:
```tsx
<div className="flex-1 flex flex-col min-w-0">
```
Si después de este cambio el desborde persiste en la página de Configuración (verificar con las devtools en modo mobile, pestaña "Identidad"), agregar también `min-w-0` al `<main>` de la línea siguiente:
```tsx
<main className="flex-1 overflow-auto relative p-2 sm:p-4 md:p-6 min-w-0">
```

**Criterio de aceptación:** En `/app/settings?tab=identity` con devtools en modo mobile (ej. 390-412px de ancho), la página ya no debe tener scroll horizontal a nivel de toda la pantalla. La toolbar del editor de texto puede seguir teniendo su propio scroll horizontal interno (aceptable, es contenido secundario), pero el resto del layout (sidebar, header, título, tarjetas) no debe desbordar. Verificar también que ninguna otra página cambió su comportamiento en desktop.

**Ejecutar esta tarea PRIMERO**, antes que las demás de este archivo — es probable que arregle o reduzca la severidad de varios de los hallazgos siguientes sin tocarlos directamente.

---

## 1. [ ] BUG — Selector de sucursal vacío en Inventario (sin placeholder)

**Archivo:** `src/pages/Inventory.tsx`
**Línea:** 96

**Problema:** El `<Select>` de sucursal recibe `value={selectedBranchId || ''}`. Con Radix UI (base de shadcn `Select`), pasar un string vacío `''` como `value` hace que el componente lo trate como un valor "seleccionado" (aunque inválido), por lo que **no muestra el placeholder** ("Selecciona una sucursal...") y el select se ve completamente vacío hasta que el usuario elige una opción.

**Fix:** Cambiar:
```tsx
<Select onValueChange={setBranchId} value={selectedBranchId || ''}>
```
por:
```tsx
<Select onValueChange={setBranchId} value={selectedBranchId || undefined}>
```

**Criterio de aceptación:** Al entrar a `/app/inventory` sin haber seleccionado sucursal, el select debe mostrar el texto "Selecciona una sucursal..." en vez de aparecer vacío.

---

## 2. [ ] Causa raíz — `PageHeader` no se adapta a mobile (afecta casi todas las páginas)

**Archivo:** `src/components/PageHeader.tsx`
**Línea:** 12

**Problema:** El contenedor raíz usa `className="flex justify-between items-start mb-6"` sin `flex-col`/`flex-wrap`. En pantallas de ~375-390px, el título y los botones de acción (children) no tienen espacio para acomodarse y se aprietan o desbordan. Este componente es usado por casi todas las páginas de listado/edición de la app.

**Fix:** Cambiar la clase del div raíz para que apile verticalmente en mobile y vuelva a fila en `sm:`:
```tsx
<div className="flex justify-between items-start mb-6">
```
por:
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
```

**Criterio de aceptación:** En 375px de ancho, en cualquier página que use `PageHeader` con botones de acción, el título y los botones deben apilarse verticalmente sin cortarse ni desbordar el viewport. En ≥768px el comportamiento debe verse igual que antes.

---

## 3. [ ] `Products/ProductEditPage.tsx` — formulario con `grid-cols-2` fijo (4 ocurrencias)

**Archivo:** `src/pages/Products/ProductEditPage.tsx`
**Líneas:** 52, 66, 95, 105

**Problema:** El componente `ProductDetailsForm` (renderizado tanto en la rama mobile `md:hidden` como en la desktop `hidden md:block` de esta página, líneas 250 y 303) tiene 4 divs con `className="grid grid-cols-2 gap-4"` sin variante responsive, forzando 2 columnas también en 375px. Afecta: Nombre/SKU, Categoría/Marca, Contenido de Envase/switch, Precio de Costo/Código de Barras.

**Fix:** En las 4 líneas, cambiar:
```tsx
<div className="grid grid-cols-2 gap-4">
```
por:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

**Criterio de aceptación:** En 375px, cada par de campos se apila en una sola columna. En ≥640px (`sm`), vuelven a mostrarse en 2 columnas como antes.

---

## 4. [ ] `ClientDetailPage.tsx` — 4 cabeceras de sección sin apilar en mobile

**Archivo:** `src/pages/ClientDetailPage.tsx`
**Líneas:** 448-452, 564-569, 580-587, 600-604

**Problema:** Cuatro secciones ("Miembros Familiares", "Direcciones Adicionales", "Contactos Adicionales", "Proyectos Asignados") tienen un header con `className="flex justify-between items-center"` (o `flex items-center justify-between`) que combina un título con un botón de texto completo ("Añadir Familiar", "Añadir Dirección", "Añadir Contacto", "Asignar Proyecto"), sin apilar ni ocultar texto en mobile. A 375px el título y el botón se cortan o desbordan.

**Fix:** Para cada una de las 4 cabeceras, aplicar el mismo patrón: cambiar el contenedor de
```tsx
<div className="flex justify-between items-center">
```
(o su variante `flex items-center justify-between`) a:
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
```
Y en cada botón, envolver el texto (dejando el ícono visible siempre) en `<span className="hidden sm:inline">`, siguiendo el mismo patrón ya usado correctamente en `src/pages/Settings/PaymentMethodsCRUD.tsx` (líneas ~124-135) y en los managers de direcciones/contactos de `Suppliers`/`expenses`.

**Criterio de aceptación:** En 375px, las 4 secciones muestran el título arriba y el botón (solo ícono o ícono+texto corto) debajo, sin cortarse. En ≥640px se ve como antes (título y botón en la misma fila).

---

## 5. [ ] `projects/EditProjectPage.tsx` — mismo patrón de header sin apilar

**Archivo:** `src/pages/projects/EditProjectPage.tsx`
**Líneas:** 114-120

**Problema:** El header "Imágenes del Proyecto" + botón "Gestionar Imágenes" tiene el mismo problema que la tarea 4: sin apilar en mobile, texto del botón siempre visible.

**Fix:** Mismo patrón que la tarea 4: contenedor a `flex-col sm:flex-row` y texto del botón envuelto en `<span className="hidden sm:inline">`.

**Criterio de aceptación:** En 375px, título y botón se apilan sin cortarse. En ≥640px se ve como antes.

---

## 6. [ ] `Equipments/EditEquipmentPage.tsx` — grid anidado inconsistente

**Archivo:** `src/pages/Equipments/EditEquipmentPage.tsx`
**Línea:** 75

**Problema:** Dentro de un grid ya responsive (`grid-cols-1 md:grid-cols-2`), hay un sub-grid anidado con `grid grid-cols-2 gap-4` (campos "Frec. Mantenimiento" / "Unidad") fijo en 2 columnas incluso en mobile.

**Fix:** Cambiar el sub-grid interno a `grid-cols-1 sm:grid-cols-2`.

**Criterio de aceptación:** En 375px, los dos campos se apilan verticalmente. En ≥640px se muestran en 2 columnas.

---

## 7. [ ] `Settings/NumberingSequencesPage.tsx` — grid fijo dentro de diálogo

**Archivo:** `src/pages/Settings/NumberingSequencesPage.tsx`
**Línea:** 193

**Problema:** Los campos "Siguiente Número" y "Relleno" dentro del diálogo de crear/editar secuencia están en `grid grid-cols-2 gap-4` sin variante responsive. Prioridad baja.

**Fix:** Cambiar a `grid-cols-1 sm:grid-cols-2`.

**Criterio de aceptación:** Apilado en mobile, 2 columnas en ≥640px.

---

## 8. [ ] (Opcional — mejora de experiencia, no bloqueante) Tablas de inventario/reportes sin vista de tarjetas en mobile

**Archivos:**
- `src/pages/Inventory/BranchProductsPage.tsx` (línea ~47)
- `src/pages/Reports/StockReportPage.tsx` (línea ~54)
- `src/pages/Reports/ProductKardexPage.tsx` (línea ~61)

**Problema:** Estas 3 páginas renderizan una tabla de 5 columnas sin alternativa mobile. No rompen el layout (el componente `Table` base ya tiene `overflow-auto`), pero obligan a scroll horizontal en mobile, a diferencia de `BranchesPage.tsx` e `Inventory/PurchasesPage.tsx` que sí muestran tarjetas apiladas en mobile.

**Fix:** Esta tarea requiere más diseño (crear una vista de tarjetas equivalente a la tabla). **No ejecutar automáticamente** — evaluar con el equipo si vale la pena antes de implementar. Si se decide hacerlo, replicar el patrón condicional `isMobile` ya usado en `BranchesPage.tsx`.

**Criterio de aceptación:** N/A — tarea de evaluación, no de ejecución directa.

---

## Validación final (después de completar las tareas 1 a 7)

- [ ] `npm run build` sin errores.
- [ ] Recorrer manualmente (o con el navegador en modo responsive a 375px) las páginas: Inventario, Productos (catálogo y edición), Cliente (detalle), Proyectos (edición), Equipos, Configuración > Numeración. Confirmar que ningún header ni formulario se desborda horizontalmente ni corta contenido.
- [ ] Confirmar en desktop (1440px) que ninguna de estas páginas cambió su apariencia respecto a antes de los fixes.
