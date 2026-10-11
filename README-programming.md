# Programar en Prisma

Las seis aplicaciones incluyen **Programar · Macros**. Las macros Prisma son archivos JSON `.prismamacro`: se guardan en el dispositivo, se pueden compartir como archivo y se ejecutan mediante el mismo intérprete en web, Windows y Android. No requieren Office, GenOffice, ONLYOFFICE ni un servicio de documentos.

Abre un documento, carga el ejemplo o escribe instrucciones, pulsa **Comprobar y previsualizar**, revisa los cambios y pulsa **Aplicar macro**. La vista previa no modifica el documento. Si el documento cambió desde la comprobación, hay que comprobar de nuevo. Una operación aplicada se puede deshacer.

| Aplicación | Operaciones disponibles |
| --- | --- |
| Writer / PDF en vista de escritura | `replaceText`, `appendParagraph` |
| Sheets | `setCell`, `replaceText` en celdas de texto; las fórmulas no se sustituyen |
| Slides / Publisher | `replaceText` en texto y celdas de tablas de todas las páginas |
| Data | `sql`; las consultas de una macro se aplican en una transacción |

```json
{
  "version": 1,
  "name": "Serie de valores",
  "steps": [
    {"repeat": 5, "as": "i", "steps": [
      {"op": "setCell", "args": {
        "sheet": "Hoja1",
        "cell": {"concat": ["A", {"var": "i"}]},
        "value": {"multiply": [{"var": "i"}, 10]}
      }}
    ]},
    {"log": "Se prepararon cinco celdas."}
  ]
}
```

Las variables se declaran con `{"let":{"name":"cantidad","value":5}}`. Una condición usa `if`, `then` y `else`; los bloques contienen listas de pasos. `read` consulta el valor de una celda con `{"read":"Hoja1!A1"}` e incluye los cambios de celdas ya preparados en la misma macro. Las expresiones admiten `var`, `text`, `read`, `add`, `multiply`, `subtract`, `divide`, `concat`, `eq`, `gt`, `lt`, `and`, `or` y `not`. `text` contiene el texto del documento al comenzar la vista previa; no simula los reemplazos posteriores. No se interpreta JavaScript ni VBA.

Los límites son 100.000 caracteres por macro, 5.000 pasos de evaluación, 12 niveles, 1.000 repeticiones por bloque, 1.000 operaciones preparadas y 500 mensajes. Data admite hasta 100 sentencias SQL y 100.000 caracteres por operación; los resultados visibles se limitan a 500 filas. El editor administra la transacción y rechaza sentencias que intenten cerrarla o conectar otra base.

El intérprete no ofrece acceso a red, procesos, archivos del equipo ni ejecución automática al abrir un documento. El formato es propio de Prisma. **No existe compatibilidad completa ni conversión automática de VBA.** Una macro de Office debe traducirse a las operaciones disponibles. COM, ActiveX, formularios VBA, eventos `AutoOpen` y complementos de Office no se ejecutan.

DOCM y PPTM pueden conservar sus partes VBA originales en las rutas de conservación compatibles; se exportan con la extensión correspondiente y permanecen inactivas. Sheets permite abrir XLSM y descargar su original intacto. Exportar una copia XLSX reconstruye las celdas compatibles sin VBA y requiere revisar el informe de compatibilidad. La exportación DOCX reconstruida tampoco conserva VBA. No se anuncian estos archivos como macros ejecutables en Prisma.

La diferencia entre VBA de escritorio y automatización multiplataforma está documentada por [Microsoft](https://learn.microsoft.com/en-us/office/dev/scripts/resources/vba-differences). Prisma utiliza su propio modelo de operaciones portables.
