// Aplicación principal
class App {
    constructor() {
        this.ui = null;
        this.store = appStore;
        this.init();
    }

    async init() {
        try {
            // Registrar Service Worker
            if ('serviceWorker' in navigator) {
                try {
                    // Usar ruta relativa para entornos locales
                    await navigator.serviceWorker.register('sw.js');
                    console.log('Service Worker registrado correctamente');
                } catch (error) {
                    console.log('Error registrando Service Worker:', error);
                }
            }

            // Cargar datos
            await this.store.loadFacts();

            // Inicializar UI
            this.ui = new UI(this.store);

            // Configurar PWA
            this.setupPWA();

            // Manejar deep-links desde widgets
            this.handleWidgetActions();

            console.log('Aplicación iniciada correctamente');

        } catch (error) {
            console.error('Error iniciando la aplicación:', error);
        }
    }

    setupPWA() {
        // Prevenir comportamiento por defecto en enlaces
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('href') === '#') {
                e.preventDefault();
            }
        });

        // Manejar tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Cerrar búsquedas o modales si están abiertos
                const searchBars = document.querySelectorAll('.search-bar');
                searchBars.forEach(bar => {
                    if (bar.value) {
                        bar.value = '';
                        bar.dispatchEvent(new Event('input'));
                    }
                });
            }
        });

        // Manejar cambios de conexión
        window.addEventListener('online', () => {
            Utils.showToast('Conexión restaurada', 2000);
        });

        window.addEventListener('offline', () => {
            Utils.showToast('Sin conexión - Modo offline', 3000);
        });

        // Setup for window controls overlay and titlebar buttons
        this.setupWindowControls();
    }

    setupWindowControls() {
        // Guardar referencias de botones
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('maximize-btn');
        const closeBtn = document.getElementById('close-btn');
        const restoreBtn = document.getElementById('restore-btn');

        // Helper: toggle app visibility (used as a 'minimize' fallback)
        const hideApp = () => {
            const appEl = document.getElementById('app');
            if (appEl) appEl.style.display = 'none';
            if (restoreBtn) restoreBtn.style.display = 'inline-block';
            Utils.showToast('Aplicación minimizada (falso)', 1500);
        };

        const restoreApp = () => {
            const appEl = document.getElementById('app');
            if (appEl) appEl.style.display = '';
            if (restoreBtn) restoreBtn.style.display = 'none';
        };

        // Minimize: no hay API estándar en web para minimizar ventanas, usamos fallback
        minimizeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            hideApp();
        });

        // Restore
        restoreBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            restoreApp();
        });

        // Maximize -> usaremos Fullscreen API como 'maximizar' y también toggle
        maximizeBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    maximizeBtn.textContent = 'Salir de pantalla completa';
                } else {
                    await document.exitFullscreen();
                    maximizeBtn.textContent = 'Maximizar';
                }
            } catch (err) {
                console.error('Fullscreen error', err);
                Utils.showToast('No se pudo cambiar a pantalla completa', 1800);
            }
        });

        // Close -> intentar cerrar ventana, si no funciona mostrar aviso
        closeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                window.close();
                // Si window.close() no cierra (páginas no abiertas por window.open), avisar
                setTimeout(() => {
                    if (!window.closed) {
                        Utils.showToast('Imposible cerrar la ventana desde aquí', 2200);
                    }
                }, 300);
            } catch (err) {
                console.error('Close error', err);
                Utils.showToast('Imposible cerrar la ventana desde aquí', 2200);
            }
        });

        // Solo activar Window Controls Overlay si la app está en modo standalone (instalada)
        const isStandalone = () => {
            return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
                || window.matchMedia('(display-mode: fullscreen)').matches
                || window.navigator.standalone === true;
        };

        // Permitir forzar la title-bar en entorno de desarrollo mediante la clase
        // `body.force-wco`. Esto facilita pruebas sin necesidad de instalar la PWA.
        const forceWco = document.body.classList.contains('force-wco');
        if (!isStandalone() && !forceWco) {
            // No estamos en modo standalone ni se forzó el modo: no mostramos la title bar
            const tb = document.getElementById('title-bar');
            if (tb) { tb.style.display = 'none'; tb.setAttribute('aria-hidden', 'true'); }
            return;
        }

        // Si forzamos WCO en desarrollo, asegurarnos de mostrar la barra
        if (forceWco) {
            const tb = document.getElementById('title-bar');
            if (tb) {
                tb.style.display = '';
                tb.setAttribute('aria-hidden', 'false');
            }
            document.body.classList.add('using-wco');
            // No retornamos: dejamos que los listeners de botones funcionen.
        }

        // Si la app está en modo standalone (instalada), asegurarnos de mostrar la title-bar
        if (isStandalone()) {
            const tb = document.getElementById('title-bar');
            if (tb) {
                tb.style.display = '';
                tb.setAttribute('aria-hidden', 'false');
            }
            document.body.classList.add('using-wco');
            // continuar para intentar usar windowControlsOverlay si está disponible
        }

        // Si el navegador soporta Window Controls Overlay (experimental), ajustamos la UI
        try {
            const wnd = navigator.windowControlsOverlay;
            if (wnd) {
                const titleBarEl = document.getElementById('title-bar');

                // pequeño debounce reutilizable
                const debounce = (func, wait) => {
                    let timeout;
                    return function (...args) {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => func.apply(this, args), wait);
                    };
                };

                const onGeometryChange = (e) => {
                    const visible = wnd.visible;
                    // Mostrar/ocultar el elemento title-bar según soporte
                    if (titleBarEl) {
                        titleBarEl.style.display = visible ? '' : 'none';
                        titleBarEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
                    }

                    if (visible) {
                        document.body.classList.add('using-wco');
                    } else {
                        document.body.classList.remove('using-wco');
                    }

                    const rect = e?.titlebarAreaRect || (wnd.getTitlebarAreaRect ? wnd.getTitlebarAreaRect() : null);
                    if (rect && rect.width) {
                        // opcional: almacenar medidas como variables CSS
                        document.documentElement.style.setProperty('--titlebar-area-width', rect.width + 'px');
                        document.documentElement.style.setProperty('--titlebar-area-height', rect.height + 'px');
                        console.log('WCO geometry:', rect);
                    }
                };

                // Llamada inicial para setear estado actual
                try { onGeometryChange({ titlebarAreaRect: wnd.getTitlebarAreaRect?.() }); } catch (e) {}

                wnd.addEventListener('geometrychange', debounce(onGeometryChange, 200));

                // Aseguramos estado inicial según visible
                if (!wnd.visible && document.getElementById('title-bar')) {
                    document.getElementById('title-bar').style.display = 'none';
                }
            }
        } catch (e) {
            // no soportado
        }
    }

    // Manejar acciones desde widgets (deep-links)
    handleWidgetActions() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const fromWidget = urlParams.get('widget') === 'true';

        if (action && fromWidget) {
            console.log('Acción from widget:', action);
            
            setTimeout(() => {
                switch (action) {
                    case 'save':
                        this.handleWidgetSave();
                        break;
                    case 'refresh':
                        this.handleWidgetRefresh();
                        break;
                }
                // Limpiar URL params
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 1000); // Dar tiempo a que la UI se inicialice
        }
    }

    async handleWidgetSave() {
        try {
            // Obtener el dato actual del widget
            const response = await fetch('/api/daily-fact');
            if (response.ok) {
                const widgetData = await response.json();
                // Buscar el dato en la base de datos local por contenido
                const allFacts = this.store.facts || [];
                const fact = allFacts.find(f => f.content === widgetData.fact);
                
                if (fact && this.ui) {
                    // Añadir a favoritos
                    this.store.toggleFavorite(fact.id);
                    Utils.showToast('Dato guardado en favoritos desde widget', 3000);
                    
                    // Ir a la página de favoritos
                    this.ui.showPage('favorites');
                }
            }
        } catch (error) {
            console.error('Error guardando desde widget:', error);
            Utils.showToast('Error al guardar el dato', 2000);
        }
    }

    async handleWidgetRefresh() {
        try {
            if (this.ui) {
                // Ir a la página principal y refrescar
                this.ui.showPage('home');
                this.ui.refreshHome();
                Utils.showToast('Dato actualizado desde widget', 2000);
            }
        } catch (error) {
            console.error('Error refrescando desde widget:', error);
        }
    }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Manejar instalación de PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación (podrías añadir esto a la UI)
    setTimeout(() => {
        Utils.showToast('¡Instala nuestra app!', 4000);
    }, 5000);
});
    // Mostrar botón de instalación en cabecera solo cuando recibimos beforeinstallprompt
    // (deferredPrompt se asigna en el listener anterior)
    window.addEventListener('beforeinstallprompt', (e) => {
        // e.preventDefault() ya fue llamado anteriormente; aquí sólo mostramos el botón
        deferredPrompt = e;
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.style.display = 'inline-block';
            installBtn.addEventListener('click', async () => {
                installBtn.style.display = 'none';
                if (!deferredPrompt) {
                    Utils.showToast('No hay prompt de instalación disponible', 2000);
                    return;
                }
                try {
                    await deferredPrompt.prompt();
                    const choiceResult = await deferredPrompt.userChoice;
                    if (choiceResult.outcome === 'accepted') {
                        Utils.showToast('App instalada', 2000);
                    } else {
                        Utils.showToast('Instalación cancelada', 2000);
                    }
                } catch (err) {
                    console.error('Install prompt error', err);
                }
                deferredPrompt = null;
            });
        }
    });

// Archivo actualizado - sin referencias a process