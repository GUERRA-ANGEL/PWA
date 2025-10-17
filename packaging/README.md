# NOTA IMPORTANTE PARA WIDGETS EN WINDOWS 11

Para que el widget de la PWA aparezca en el panel de widgets de Windows 11:

- El archivo `manifest.json` debe estar accesible desde la raíz (`/manifest.json`).
- Los archivos de plantilla y datos del widget deben estar accesibles desde `/widgets/`.
- La PWA debe instalarse desde Edge usando la URL raíz (por ejemplo, `http://localhost:8000`).
- El Service Worker debe estar registrado correctamente y activo.

Si el widget no aparece:
- Borra la caché de Edge y reinstala la PWA.
- Reinicia el panel de widgets y/o tu equipo.
- Verifica que los endpoints `/manifest.json`, `/widgets/daily-fact-template.json` y `/widgets/daily-fact-data.json` sean accesibles desde el navegador.

Consulta la documentación oficial: https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/widgets
# Widget PWA - Datos Curiosos

Este proyecto implementa un widget PWA siguiendo el [tutorial oficial de Microsoft Edge](https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/widgets).

## Qué está implementado

- ✅ **Manifest con widget**: `manifest.json` con definición completa del widget
- ✅ **Template Adaptive Cards**: `widgets/daily-fact-template.json` con formato oficial
- ✅ **Data JSON**: `widgets/daily-fact-data.json` con datos actualizables
- ✅ **Service Worker**: `sw.js` con eventos `widgetinstall`, `widgetclick`, etc.
- ✅ **API de sincronización**: Servidor Express para actualizar datos
- ✅ **Deep-links**: Manejo de acciones del widget que abren la PWA

## Estructura del Widget

```
pwa/
├── manifest.json          # Define el widget con ms_ac_template
├── widgets/
│   ├── daily-fact-template.json  # Adaptive Card template
│   └── daily-fact-data.json      # Datos actuales del widget
├── sw.js                  # Service worker con eventos de widget
├── server.js              # API para sincronizar datos
└── packaging/
    ├── deploy-widget.ps1  # Script de despliegue automatizado
    └── README.md          # Este archivo
```

## Cómo instalar el widget en tu laptop

### Opción 1: Script automatizado (recomendado)

```powershell
# Ejecutar desde PowerShell como administrador
cd 'C:\Users\52775\OneDrive\Documentos\PWA_efemerides\pwa\packaging'
.\deploy-widget.ps1
```

### Opción 2: Instalación manual

1. **Habilitar modo desarrollador**
   - Configuración > Privacidad y seguridad > Para desarrolladores
   - Activar "Modo de desarrollador"

2. **Instalar WinAppSDK 1.2**
   - Descargar desde: https://learn.microsoft.com/es-es/windows/apps/windows-app-sdk/older-downloads#windows-app-sdk-12

3. **Iniciar servidores**
   ```powershell
   # Terminal 1: Servidor PWA
   cd 'C:\Users\52775\OneDrive\Documentos\PWA_efemerides\pwa'
   npx http-server -p 8000

   # Terminal 2: API de sincronización  
   cd 'C:\Users\52775\OneDrive\Documentos\PWA_efemerides\pwa'
   npm start
   ```

4. **Instalar PWA**
   - Abrir Edge en http://localhost:8000
   - Hacer clic en icono de instalación
   - Seguir instrucciones de instalación

5. **Agregar widget**
   - Presionar Windows + W (Panel de Widgets)
   - Hacer clic en "Agregar widgets" (+)
   - Buscar "Datos Curiosos"
   - Hacer clic en "Agregar"

## Funcionalidades del widget

- **Mostrar dato**: El widget muestra el mismo dato que la PWA
- **⟳ Actualizar**: Selecciona un nuevo dato aleatorio y sincroniza con la PWA
- **❤ Guardar**: Abre la PWA y guarda el dato en favoritos automáticamente

## API Endpoints

- `GET /api/daily-fact` - Obtener dato actual
- `POST /api/daily-fact/refresh` - Actualizar con nuevo dato aleatorio
- `POST /api/daily-fact/save` - Registrar acción de guardar

## Verificar funcionamiento

```powershell
# Probar API
curl http://localhost:3001/api/daily-fact
curl -X POST http://localhost:3001/api/daily-fact/refresh

# Ver logs de widget
# F12 en PWA > Application > Service Workers > Console
```

## Estructura técnica

### Service Worker Events
- `widgetinstall`: Renderiza widget cuando se instala
- `widgetclick`: Maneja clicks en botones (saveFavorite, refreshFact)
- `activate`: Actualiza widgets al cargar nuevo SW

### Widget Template (Adaptive Cards)
```json
{
  "type": "AdaptiveCard",
  "body": [
    { "type": "TextBlock", "text": "${title}" },
    { "type": "TextBlock", "text": "${fact}" }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "❤ Guardar", "verb": "saveFavorite" },
    { "type": "Action.Execute", "title": "⟳ Actualizar", "verb": "refreshFact" }
  ]
}
```

### Data JSON
```json
{
  "title": "Dato Curioso del Día",
  "fact": "Las abejas pueden reconocer rostros humanos...",
  "date": "2025-10-16"
}
```

## Troubleshooting

**Widget no aparece en panel:**
- Verificar modo desarrollador habilitado
- Comprobar que PWA esté instalada correctamente
- Revisar logs del service worker

**Botones no funcionan:**
- Verificar que API esté corriendo en puerto 3001
- Comprobar eventos widgetclick en service worker console

**Datos no se sincronizan:**
- Verificar endpoints API respondan correctamente
- Comprobar que template use sintaxis Adaptive Cards (`${variable}`)

## Referencias

- [Tutorial oficial Microsoft Edge Widgets](https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/widgets)
- [Adaptive Cards Schema](http://adaptivecards.io/schemas/adaptive-card.json)
- [PWA Builder](https://www.pwabuilder.com/) (para empaquetado avanzado)