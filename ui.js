// Gestión de la interfaz de usuario
class UI {
    constructor(store) {
        this.store = store;
        this.currentRandomFact = null;
        this.translations = this.getTranslations();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadInitialData();
    }

    // Navegación entre páginas
    setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(tab.getAttribute('data-page'));
            });
        });

        // Titlebar textual navigation (aparece solo en modo standalone/WCO)
        document.querySelectorAll('.titlebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(tab.getAttribute('data-page'));
            });
        });

        // Botones del header
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showPage('settings');
        });
        // Botón volver en pantalla de settings
        const settingsBack = document.getElementById('settings-back');
        if (settingsBack) {
            settingsBack.addEventListener('click', () => {
                this.showPage('home');
            });
        }
    }

    showPage(pageId) {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remover activo de todas las pestañas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        // Remover activo de las tabs dentro de la title bar (si existen)
        document.querySelectorAll('.titlebar-tab').forEach(t => { t.classList.remove('active'); });

        // Mostrar página y activar pestaña
        document.getElementById(pageId).classList.add('active');
    const mainTab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
    if (mainTab) mainTab.classList.add('active');
    const titleTab = document.querySelector(`.titlebar-tab[data-page="${pageId}"]`);
    if (titleTab) titleTab.classList.add('active');

        // Setear página actual en el body (fallback visual)
        try { document.body.setAttribute('data-page', pageId); } catch (e) {}

        // Cargar datos específicos de la página
        this.loadPageData(pageId);
    }

    // Configurar event listeners
    setupEventListeners() {
        // Búsqueda
        document.getElementById('history-search').addEventListener('input', 
            Utils.debounce((e) => this.searchHistory(e.target.value), 300)
        );

        document.getElementById('favorites-search').addEventListener('input',
            Utils.debounce((e) => this.searchFavorites(e.target.value), 300)
        );

        // Filtros de categoría
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                this.filterFavorites(e.target.getAttribute('data-category'));
            });
        });

        // Botones de favoritos
        document.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-btn')) {
                const btn = e.target.closest('.favorite-btn');
                const factId = parseInt(btn.getAttribute('data-id'));
                this.toggleFavorite(factId, btn);
            }

            if (e.target.closest('.remove-favorite-btn')) {
                const btn = e.target.closest('.remove-favorite-btn');
                const factId = parseInt(btn.getAttribute('data-id'));
                this.removeFavorite(factId);
            }
        });

        // Delegaci1n para filas de settings
        // Ignorar clicks que provengan de controles interactivos (input, label, .toggle)
        document.getElementById('settings')?.addEventListener('click', (e) => {
            // Si el click vino desde un input, label o dentro de un elemento .toggle, no abrir modal
            if (e.target.closest('input') || e.target.closest('label') || e.target.closest('.toggle')) {
                return;
            }

            const row = e.target.closest('.setting-row');
            if (!row) return;
            const action = row.getAttribute('data-action');
            if (!action) return;
            this.openSettingModal(action);
        });

        // Modal handlers
        const modal = document.getElementById('settings-modal');
        if (modal) {
            document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
            document.getElementById('modal-save').addEventListener('click', () => this.saveModal());
            modal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
            
            // Cerrar modal con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
                    this.closeModal();
                }
            });
        }


        // Configuración - Toggle notificaciones
        const notificationsToggle = document.getElementById('notifications-toggle');
        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', (e) => {
                this.toggleNotifications(e.target.checked);
            });
        }

        // Página aleatoria
        document.getElementById('new-random-btn').addEventListener('click', () => {
            this.showRandomFact();
        });

        document.getElementById('random-share-btn').addEventListener('click', () => {
            this.shareRandomFact();
        });

        document.getElementById('random-favorite-btn').addEventListener('click', () => {
            if (this.currentRandomFact) {
                this.toggleFavorite(this.currentRandomFact.id, document.getElementById('random-favorite-btn'));
            }
        });

        // Refrescar en página principal
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.refreshHome();
        });
    }

    // Cargar datos iniciales
    async loadInitialData() {
        await this.store.loadFacts();
        this.updateStats();
        this.loadHomePage();
        
        // Configurar tema (mantener tema claro por defecto)
        document.body.classList.remove('dark');
        
        // Configurar ajustes
        const settings = this.store.getSettings();
        console.log('Configuración cargada:', settings);
        
        // Configurar notificaciones
        const notificationsToggle = document.getElementById('notifications-toggle');
        if (notificationsToggle) {
            notificationsToggle.checked = settings.notifications;
        }
        
        // Actualizar hora de notificación en la UI
        this.updateNotificationTimeDisplay(settings.notificationTime);
        
        // Configurar notificaciones si están habilitadas
        if (settings.notifications) {
            this.setupNotifications();
        }
        
        // Aplicar traducciones según el idioma configurado
        this.applyTranslations();
    }

    // Abrir modal según la acción
    openSettingModal(action) {
        console.log('Abriendo modal para:', action);
        const modal = document.getElementById('settings-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        this.currentSettingAction = action;
        body.innerHTML = '';

        switch (action) {
            case 'language':
                title.textContent = 'Idioma de la aplicación';
                const currentLang = this.store.getSettings().language;
                body.innerHTML = `
                    <p>Selecciona el idioma de la aplicación:</p>
                    <select id="modal-language" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd">
                        <option value="es" ${currentLang === 'es' ? 'selected' : ''}>Español</option>
                        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                        <option value="fr" ${currentLang === 'fr' ? 'selected' : ''}>Français</option>
                        <option value="de" ${currentLang === 'de' ? 'selected' : ''}>Deutsch</option>
                    </select>
                `;
                break;
            case 'notificationTime':
                title.textContent = 'Hora de notificación';
                const currentTime = this.store.getSettings().notificationTime;
                body.innerHTML = `
                    <p>Selecciona la hora para recibir notificaciones diarias:</p>
                    <input id="modal-time" type="time" value="${currentTime}" style="width:120px;padding:8px;border-radius:6px;border:1px solid #ddd" />
                    <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                        Recibirás un dato curioso todos los días a esta hora.
                    </p>
                `;
                break;
            case 'about':
                title.textContent = 'Acerca de';
                body.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 2em; margin-bottom: 10px;">📚</div>
                        <h3>Datos Curiosos</h3>
                        <p><strong>Versión 1.0.0</strong></p>
                        <p>Descubre datos interesantes y curiosos todos los días.</p>
                        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
                            Desarrollado con ❤️ para aprender algo nuevo cada día.
                        </p>
                    </div>
                `;
                break;
            case 'privacy':
                title.textContent = 'Política de privacidad';
                body.innerHTML = `
                    <div style="max-height: 400px; overflow-y: auto;">
                        <h4>Política de Privacidad</h4>
                        <p><strong>Última actualización:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                        
                        <h5>1. Información que recopilamos</h5>
                        <p>Esta aplicación no recopila información personal. Todos los datos se almacenan localmente en tu dispositivo.</p>
                        
                        <h5>2. Uso de la información</h5>
                        <p>Los datos que guardas (favoritos, historial) se almacenan únicamente en tu dispositivo y no se envían a servidores externos.</p>
                        
                        <h5>3. Notificaciones</h5>
                        <p>Las notificaciones son opcionales y se pueden desactivar en cualquier momento desde la configuración.</p>
                        
                        <h5>4. Contacto</h5>
                        <p>Si tienes preguntas sobre esta política, puedes contactarnos a través de la aplicación.</p>
                    </div>
                `;
                break;
            case 'rate':
                title.textContent = 'Calificar aplicación';
                body.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 3em; margin-bottom: 15px;">⭐</div>
                        <p>¿Te gusta la aplicación?</p>
                        <p>Tu valoración nos ayuda a mejorar y llegar a más personas.</p>
                        <button id="modal-rate-btn" class="btn" style="margin-top: 15px;">
                            <i class="fas fa-star"></i> Calificar en la tienda
                        </button>
                        <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
                            Gracias por tu apoyo 🙏
                        </p>
                    </div>
                `;
                setTimeout(() => {
                    const btn = document.getElementById('modal-rate-btn');
                    if (btn) btn.addEventListener('click', () => { 
                        Utils.showToast('¡Gracias por tu valoración! ⭐', 3000);
                        this.closeModal();
                    });
                }, 50);
                break;
            case 'appearance':
                title.textContent = 'Cambiar apariencia';
                body.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p>Personaliza la apariencia de la aplicación:</p>
                        <div style="margin: 20px 0;">
                            <label style="display: block; margin: 10px 0;">
                                <input type="radio" name="theme" value="light" ${!this.store.getSettings().darkMode ? 'checked' : ''} style="margin-right: 8px;">
                                <i class="fas fa-sun"></i> Tema claro
                            </label>
                            <label style="display: block; margin: 10px 0;">
                                <input type="radio" name="theme" value="dark" ${this.store.getSettings().darkMode ? 'checked' : ''} style="margin-right: 8px;">
                                <i class="fas fa-moon"></i> Tema oscuro
                            </label>
                        </div>
                    </div>
                `;
                break;
            case 'notifications':
                title.textContent = 'Notificaciones';
                body.innerHTML = `
                    <div style="padding: 20px;">
                        <p>Configura tus notificaciones:</p>
                        <label style="display: flex; align-items: center; justify-content: space-between; margin: 15px 0;">
                            <span>Recibir notificaciones diarias</span>
                            <label class="toggle">
                                <input id="modal-notif-toggle" type="checkbox" ${this.store.getSettings().notifications ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </label>
                        <p style="font-size: 0.9em; color: #666;">
                            Recibirás un dato curioso todos los días a las ${this.store.getSettings().notificationTime}.
                        </p>
                    </div>
                `;
                break;
            default:
                title.textContent = 'Ajuste';
                body.innerHTML = `<p>Opción no disponible.</p>`;
        }

        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('active');
        
        // Enfocar el primer elemento interactivo del modal
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, button');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            // Remover foco de todos los elementos interactivos
            const focusableElements = modal.querySelectorAll('input, select, button, textarea');
            focusableElements.forEach(el => el.blur());
            
            // Cerrar modal
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('active');
            
            // Restaurar foco al botón que abrió el modal
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.focus();
            }
        }
        this.currentSettingAction = null;
    }

    saveModal() {
        const action = this.currentSettingAction;
        if (!action) return this.closeModal();

        console.log('Guardando configuración:', action);

        switch (action) {
            case 'language':
                const lang = document.getElementById('modal-language')?.value;
                if (lang) {
                    this.store.updateSettings({ language: lang });
                    this.updateLanguageDisplay(lang);
                    // Aplicar traducciones a toda la UI inmediatamente
                    this.applyTranslations();
                    Utils.showToast('Idioma actualizado: ' + this.getLanguageName(lang));
                }
                break;
            case 'notificationTime':
                const time = document.getElementById('modal-time')?.value;
                if (time) {
                    this.store.updateSettings({ notificationTime: time });
                    this.updateNotificationTimeDisplay(time);
                    Utils.showToast('Hora de notificación guardada: ' + this.formatTime(time));
                }
                break;
            case 'notifications':
                const notif = document.getElementById('modal-notif-toggle')?.checked;
                this.store.updateSettings({ notifications: !!notif });
                Utils.showToast(notif ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
                break;
        }

        this.closeModal();
    }

    // Cargar datos específicos de página
    loadPageData(pageId) {
        switch (pageId) {
            case 'home':
                this.loadHomePage();
                break;
            case 'history':
                this.loadHistoryPage();
                break;
            case 'favorites':
                this.loadFavoritesPage();
                break;
            case 'random':
                this.showRandomFact();
                break;
            case 'settings':
                // La configuración ya está cargada
                break;
        }
    }

    // Página principal
    loadHomePage() {
        // Primero intentamos sincronizar con el 'daily-fact' proporcionado por el servidor
        (async () => {
            try {
                const serverFact = await this.fetchDailyFactFromServer();
                if (serverFact && serverFact.fact) {
                    const factObj = {
                        id: serverFact.id || 0,
                        title: serverFact.title || 'Dato Curioso del Día',
                        content: serverFact.fact,
                        date: serverFact.date || new Date().toISOString().slice(0,10)
                    };
                    this.displayCurrentFact(factObj);
                    try { this.store.addToViewed(factObj.id); } catch (e) {}
                } else {
                    const currentFact = this.store.getRandomFact();
                    if (currentFact) {
                        this.displayCurrentFact(currentFact);
                        this.store.addToViewed(currentFact.id);
                    }
                }
            } catch (e) {
                // Fallback si el servidor no está disponible
                const currentFact = this.store.getRandomFact();
                if (currentFact) {
                    this.displayCurrentFact(currentFact);
                    this.store.addToViewed(currentFact.id);
                }
            }

            this.displayRecentFacts();
            this.updateStats();
        })();
    }

    displayCurrentFact(fact) {
        const container = document.getElementById('current-fact');
        // Rellenar partes existentes para mantener la estructura y estilos
        const iconEl = container.querySelector('.icon-circle i');
        if (iconEl) iconEl.className = 'fas fa-lightbulb';
        const dateEl = container.querySelector('.date');
        if (dateEl) dateEl.textContent = Utils.formatDate(fact.date);
        const contentEl = container.querySelector('.fact-content');
        if (contentEl) contentEl.textContent = fact.content;
        const descEl = container.querySelector('.desc');
        if (descEl) descEl.textContent = fact.content;

        // Actualizar botones
        const favBtn = container.querySelector('.favorite-btn');
        if (favBtn) {
            favBtn.setAttribute('data-id', fact.id);
            favBtn.innerHTML = `${this.store.isFavorite(fact.id) ? '<i class="fas fa-bookmark"></i> Guardado' : '<i class="far fa-bookmark"></i> Guardar en Favoritas'}`;
        }
    }

    displayRecentFacts() {
        const container = document.getElementById('recent-facts');
        const recentFacts = this.store.getRecentFacts(3);
        
        const ul = container.querySelector('ul');
        if (!ul) return;
        ul.innerHTML = recentFacts.map(fact => `
            <li>
                <div class="item-left"><div class="small-icon"><i class="fas fa-star"></i></div><div>
                    <div class="fact-title">${fact.title}</div>
                    <div class="fact-date">${Utils.formatShortDate(fact.date)}</div>
                </div></div>
                <div class="actions"><button class="favorite-btn" data-id="${fact.id}"><i class="${this.store.isFavorite(fact.id) ? 'fas' : 'far'} fa-bookmark"></i></button></div>
            </li>
        `).join('');
    }

    // Página de historial
    loadHistoryPage() {
        const container = document.getElementById('history-list');
        const viewedFacts = this.store.getViewedFacts();
        
        // Agrupar por fecha
        const groupedByDate = this.groupFactsByDate(viewedFacts);
        
        container.innerHTML = Object.keys(groupedByDate).map(date => `
            <div class="fact-item">
                <h2>${Utils.formatDate(date)}</h2>
                ${groupedByDate[date].map(fact => `
                    <div class="card">
                        <div class="fact-content"><strong>${fact.title}</strong></div>
                        <div class="fact-content">${fact.content.substring(0, 100)}...</div>
                        <div class="actions">
                            <button class="btn favorite-btn" data-id="${fact.id}">
                                <i class="${this.store.isFavorite(fact.id) ? 'fas' : 'far'} fa-bookmark"></i> Guardar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // Página de favoritos
    loadFavoritesPage() {
        const favorites = this.store.getFavorites();
        const container = document.getElementById('favorites-list');
        
        // Agrupar por categoría
        const groupedByCategory = this.groupFactsByCategory(favorites);
        
        container.innerHTML = Object.keys(groupedByCategory).map(category => `
            <div class="favorite-item" data-category="${category}">
                <h2>${Utils.capitalizeFirst(category)}</h2>
                ${groupedByCategory[category].map(fact => `
                    <div class="card">
                        <div class="tag">${Utils.capitalizeFirst(fact.category)}</div>
                        <div class="fact-content">${fact.content}</div>
                        <div class="saved-info">Guardado ${Utils.timeAgo(fact.savedAt || fact.date)} | ${Utils.formatDate(fact.date)}</div>
                        <div class="actions">
                            <button class="remove-favorite-btn" data-id="${fact.id}">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Actualizar contador
        document.getElementById('favorites-count-text').textContent = 
            `${favorites.length} datos curiosos guardados`;
    }

    // Página aleatoria
    showRandomFact() {
        const fact = this.store.getRandomFact();
        if (fact) {
            this.currentRandomFact = fact;
            document.getElementById('random-fact-text').textContent = fact.content;
            document.getElementById('random-fact-date').textContent = Utils.formatDate(fact.date);
            
            // Actualizar botón de favoritos
            const favoriteBtn = document.getElementById('random-favorite-btn');
            const icon = favoriteBtn.querySelector('i');
            if (this.store.isFavorite(fact.id)) {
                icon.className = 'fas fa-bookmark';
                favoriteBtn.innerHTML = '<i class="fas fa-bookmark"></i> En favoritos';
            } else {
                icon.className = 'far fa-bookmark';
                favoriteBtn.innerHTML = '<i class="far fa-bookmark"></i> Favoritos';
            }
            favoriteBtn.setAttribute('data-id', fact.id);
            
            this.store.addToViewed(fact.id);
            this.updateStats();
        }
    }

    // Utilidades
    groupFactsByDate(facts) {
        return facts.reduce((groups, fact) => {
            const date = fact.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(fact);
            return groups;
        }, {});
    }

    groupFactsByCategory(facts) {
        return facts.reduce((groups, fact) => {
            const category = fact.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(fact);
            return groups;
        }, {});
    }

    // Funcionalidades
    toggleFavorite(factId, button) {
        const wasAdded = this.store.toggleFavorite(factId);
        const icon = button.querySelector('i');
        
        if (wasAdded) {
            if (icon) icon.className = 'fas fa-bookmark';
            if (button.classList.contains('random-btn')) {
                button.innerHTML = '<i class="fas fa-bookmark"></i> En favoritos';
            } else {
                button.innerHTML = '<i class="fas fa-bookmark"></i> Guardado';
            }
            Utils.showToast(this.t('addedToFavorites'));
        } else {
            if (icon) icon.className = 'far fa-bookmark';
            if (button.classList.contains('random-btn')) {
                button.innerHTML = '<i class="far fa-bookmark"></i> Favoritos';
            } else {
                button.innerHTML = '<i class="far fa-bookmark"></i> Guardar';
            }
            Utils.showToast(this.t('removedFromFavorites'));
        }
        
        this.updateStats();
    }

    removeFavorite(factId) {
        this.store.toggleFavorite(factId);
        this.loadFavoritesPage();
        this.updateStats();
        Utils.showToast(this.t('removedFromFavorites'));
    }

    filterFavorites(category) {
        const items = document.querySelectorAll('.favorite-item');
        items.forEach(item => {
            if (category === 'all' || item.getAttribute('data-category') === category) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    searchHistory(query) {
        const container = document.getElementById('history-list');
        if (!query) {
            // Volver a la vista completa
            this.loadHistoryPage();
            return;
        }
        const results = this.store.searchFacts(query);
        // Filtrar solo los que están en el historial (viewed)
        const viewedIds = this.store.viewedFacts || [];
        const filtered = results.filter(r => viewedIds.includes(r.id));

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No se encontraron resultados</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(fact => `
            <div class="card">
                <div class="date">${Utils.formatDate(fact.date)}</div>
                <div class="fact-content"><strong>${fact.title}</strong></div>
                <div class="desc">${fact.content}</div>
                <div class="actions"><button class="favorite-btn" data-id="${fact.id}"><i class="${this.store.isFavorite(fact.id) ? 'fas' : 'far'} fa-bookmark"></i></button></div>
            </div>
        `).join('');
    }

    searchFavorites(query) {
        const container = document.getElementById('favorites-list');
        const favorites = this.store.getFavorites();
        if (!query) {
            this.loadFavoritesPage();
            return;
        }

        const lower = query.toLowerCase();
        const filtered = favorites.filter(f => (f.title + ' ' + f.content + ' ' + f.category).toLowerCase().includes(lower));

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No hay favoritos que coincidan</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(fact => `
            <div class="card" data-category="${fact.category}">
                <div class="tag">${Utils.capitalizeFirst(fact.category)}</div>
                <div class="fact-content">${fact.content}</div>
                <div class="saved-info">Guardado ${Utils.timeAgo(fact.savedAt || fact.date)} | ${Utils.formatDate(fact.date)}</div>
                <div class="actions">
                    <button class="remove-favorite-btn" data-id="${fact.id}"><i class="fas fa-bookmark"></i></button>
                </div>
            </div>
        `).join('');
    }


    toggleNotifications(enabled) {
        console.log('Cambiando notificaciones a:', enabled);
        this.store.updateSettings({ notifications: enabled });
        
        // Configurar o limpiar notificaciones según el estado
        if (enabled) {
            this.setupNotifications();
        } else {
            this.clearNotifications();
        }
        
        Utils.showToast(enabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
    }

    async shareRandomFact() {
        if (this.currentRandomFact) {
            const success = await Utils.shareContent(
                'Dato Curioso',
                this.currentRandomFact.content,
                window.location.href
            );
            if (success) {
                this.store.addToShared(this.currentRandomFact.id);
                this.updateStats();
            }
        }
    }

    refreshHome() {
        // Intentamos refrescar el dato en el servidor y reflejarlo en la UI
        (async () => {
            const icon = document.querySelector('#refresh-btn i');
            try {
                if (icon) { icon.style.transform = 'rotate(360deg)'; icon.style.transition = 'transform 0.5s'; }
                const refreshed = await this.requestRefreshDailyFact();
                if (refreshed && refreshed.fact) {
                    const factObj = { id: refreshed.id || 0, title: refreshed.title || 'Dato Curioso del Día', content: refreshed.fact, date: refreshed.date };
                    this.displayCurrentFact(factObj);
                    try { this.store.addToViewed(factObj.id); } catch (e) {}
                    Utils.showToast(this.t('dataUpdated'));
                } else {
                    // Fallback a comportamiento local
                    this.loadHomePage();
                    Utils.showToast(this.t('dataUpdated'));
                }
            } catch (e) {
                console.error('Error al refrescar daily-fact en servidor:', e);
                this.loadHomePage();
                Utils.showToast('No se pudo actualizar el dato en el servidor', 2500);
            } finally {
                setTimeout(() => { if (icon) icon.style.transform = 'rotate(0deg)'; }, 500);
            }
        })();
    }

    // Llama al endpoint del servidor para obtener el daily-fact actual
    async fetchDailyFactFromServer() {
        try {
            const res = await fetch('/api/daily-fact');
            if (!res.ok) throw new Error('Server error');
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    // Pide al servidor que elija/refresh un nuevo dato y lo escriba en widgets/daily-fact-data.json
    async requestRefreshDailyFact() {
        try {
            const res = await fetch('/api/daily-fact/refresh', { method: 'POST' });
            if (!res.ok) throw new Error('Refresh failed');
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    updateStats() {
        const stats = this.store.getStats();
        
        // Actualizar en página principal
        document.getElementById('viewed-count').textContent = stats.viewed;
        document.getElementById('favorites-count').textContent = stats.favorites;
        document.getElementById('shared-count').textContent = stats.shared;
        
        // Actualizar en página aleatoria
        document.getElementById('random-viewed-count').textContent = stats.viewed;
        document.getElementById('random-favorites-count').textContent = stats.favorites;
        document.getElementById('random-shared-count').textContent = stats.shared;
    }

    // Métodos auxiliares para configuración
    updateLanguageDisplay(lang) {
        const langDisplay = document.querySelector('[data-action="language"] .setting-sub');
        if (langDisplay) {
            langDisplay.textContent = this.getLanguageName(lang);
        }
    }

    getLanguageName(lang) {
        const languages = {
            'es': 'Español',
            'en': 'English',
            'fr': 'Français',
            'de': 'Deutsch'
        };
        return languages[lang] || 'Español';
    }

    updateNotificationTimeDisplay(time) {
        const timeDisplay = document.querySelector('[data-action="notificationTime"] .setting-sub');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(time);
        }
    }

    formatTime(time) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    // Configurar notificaciones
    async setupNotifications() {
        if (!('Notification' in window)) {
            Utils.showToast('Tu navegador no soporta notificaciones', 3000);
            return;
        }

        if (Notification.permission === 'granted') {
            this.scheduleNotification();
            Utils.showToast('Notificaciones configuradas correctamente', 2000);
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.scheduleNotification();
                Utils.showToast('Notificaciones configuradas correctamente', 2000);
            } else {
                Utils.showToast('Notificaciones bloqueadas', 3000);
                // Desactivar el toggle si se bloquean las notificaciones
                const toggle = document.getElementById('notifications-toggle');
                if (toggle) toggle.checked = false;
                this.store.updateSettings({ notifications: false });
            }
        } else {
            Utils.showToast('Notificaciones bloqueadas previamente', 3000);
            // Desactivar el toggle si están bloqueadas
            const toggle = document.getElementById('notifications-toggle');
            if (toggle) toggle.checked = false;
            this.store.updateSettings({ notifications: false });
        }
    }

    scheduleNotification() {
        // Limpiar notificaciones anteriores
        this.clearNotifications();
        
        const settings = this.store.getSettings();
        const [hours, minutes] = settings.notificationTime.split(':');
        
        // Calcular tiempo hasta la próxima notificación
        const now = new Date();
        const notificationTime = new Date();
        notificationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Si ya pasó la hora de hoy, programar para mañana
        if (notificationTime <= now) {
            notificationTime.setDate(notificationTime.getDate() + 1);
        }
        
        const timeUntilNotification = notificationTime.getTime() - now.getTime();
        
        // Verificar que el tiempo sea válido
        if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
            // Programar notificación
            this.notificationTimeout = setTimeout(() => {
                this.sendDailyNotification();
                // Programar la siguiente notificación para mañana
                this.scheduleNotification();
            }, timeUntilNotification);
            
            console.log(`Notificación programada para: ${notificationTime.toLocaleString()}`);
        } else {
            console.log('Error al programar notificación: tiempo inválido');
        }
    }

    sendDailyNotification() {
        if (Notification.permission === 'granted') {
            const randomFact = this.store.getRandomFact();
            if (randomFact) {
                try {
                    new Notification('Dato Curioso del Día', {
                        body: randomFact.content,
                        icon: 'icon-512.png',
                        badge: 'icon-512.png',
                        tag: 'daily-fact',
                        requireInteraction: false
                    });
                    console.log('Notificación enviada:', randomFact.content.substring(0, 50) + '...');
                } catch (error) {
                    console.error('Error al enviar notificación:', error);
                }
            }
        }
    }

    clearNotifications() {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
            console.log('Notificaciones programadas canceladas');
        }
    }

    // Sistema de traducciones
    getTranslations() {
        return {
            es: {
                // Navegación
                home: 'Inicio',
                history: 'Historial',
                favorites: 'Favoritas',
                random: 'Aleatorio',
                settings: 'Ajustes',
                
                // Página principal
                today: 'Hoy',
                search: 'Buscar',
                refresh: 'Refrescar',
                saveToFavorites: 'Guardar en Favoritos',
                saved: 'Guardado',
                viewed: 'Datos vistas',
                favorites: 'Favoritas',
                shared: 'Compartidas',
                recentFacts: 'Datos recientes',
                
                // Configuración
                configuration: 'Configuración',
                language: 'IDIOMA',
                appLanguage: 'Idioma de la aplicación',
                notifications: 'NOTIFICACIONES',
                dailyNotifications: 'Notificaciones diarias',
                receiveFacts: 'Recibe datos curiosos',
                notificationTime: 'Hora de notificación',
                information: 'INFORMACIÓN',
                about: 'Acerca de',
                version: 'Versión 1.0.0',
                privacyPolicy: 'Política de privacidad',
                viewTerms: 'Ver términos',
                rateApp: 'Calificar aplicación',
                helpUsImprove: 'Ayúdanos a mejorar',
                
                // Modales
                selectLanguage: 'Selecciona el idioma de la aplicación:',
                selectTime: 'Selecciona la hora para recibir notificaciones diarias:',
                aboutTitle: 'Datos Curiosos',
                aboutDesc: 'Descubre datos interesantes y curiosos todos los días.',
                aboutDev: 'Desarrollado con ❤️ para aprender algo nuevo cada día.',
                rateTitle: '¿Te gusta la aplicación?',
                rateDesc: 'Tu valoración nos ayuda a mejorar y llegar a más personas.',
                rateButton: 'Calificar en la tienda',
                rateThanks: 'Gracias por tu apoyo 🙏',
                
                // Mensajes
                languageUpdated: 'Idioma actualizado',
                notificationsActivated: 'Notificaciones activadas',
                notificationsDeactivated: 'Notificaciones desactivadas',
                notificationTimeSaved: 'Hora de notificación guardada',
                thanksForRating: '¡Gracias por tu valoración! ⭐',
                dataUpdated: 'Datos actualizados',
                addedToFavorites: 'Añadido a favoritos',
                removedFromFavorites: 'Eliminado de favoritos',
                
                // Búsquedas
                searchHistory: 'Buscar por palabra clave o fecha...',
                searchFavorites: 'Buscar en favoritos...',
                
                // Categorías
                all: 'Todos',
                sciences: 'Ciencias',
                history: 'Historia',
                nature: 'Naturaleza',
                
                // Botones
                share: 'Compartir',
                seeAnotherFact: 'Ver otro dato curioso'
            },
            en: {
                // Navigation
                home: 'Home',
                history: 'History',
                favorites: 'Favorites',
                random: 'Random',
                settings: 'Settings',
                
                // Main page
                today: 'Today',
                search: 'Search',
                refresh: 'Refresh',
                saveToFavorites: 'Save to Favorites',
                saved: 'Saved',
                viewed: 'Viewed facts',
                favorites: 'Favorites',
                shared: 'Shared',
                recentFacts: 'Recent facts',
                
                // Settings
                configuration: 'Configuration',
                language: 'LANGUAGE',
                appLanguage: 'App language',
                notifications: 'NOTIFICATIONS',
                dailyNotifications: 'Daily notifications',
                receiveFacts: 'Receive curious facts',
                notificationTime: 'Notification time',
                information: 'INFORMATION',
                about: 'About',
                version: 'Version 1.0.0',
                privacyPolicy: 'Privacy policy',
                viewTerms: 'View terms',
                rateApp: 'Rate app',
                helpUsImprove: 'Help us improve',
                
                // Modals
                selectLanguage: 'Select the app language:',
                selectTime: 'Select the time to receive daily notifications:',
                aboutTitle: 'Curious Facts',
                aboutDesc: 'Discover interesting and curious facts every day.',
                aboutDev: 'Developed with ❤️ to learn something new every day.',
                rateTitle: 'Do you like the app?',
                rateDesc: 'Your rating helps us improve and reach more people.',
                rateButton: 'Rate in store',
                rateThanks: 'Thanks for your support 🙏',
                
                // Messages
                languageUpdated: 'Language updated',
                notificationsActivated: 'Notifications activated',
                notificationsDeactivated: 'Notifications deactivated',
                notificationTimeSaved: 'Notification time saved',
                thanksForRating: 'Thanks for your rating! ⭐',
                dataUpdated: 'Data updated',
                addedToFavorites: 'Added to favorites',
                removedFromFavorites: 'Removed from favorites',
                
                // Search
                searchHistory: 'Search by keyword or date...',
                searchFavorites: 'Search in favorites...',
                
                // Categories
                all: 'All',
                sciences: 'Sciences',
                history: 'History',
                nature: 'Nature',
                
                // Buttons
                share: 'Share',
                seeAnotherFact: 'See another fact'
            },
            fr: {
                // Navigation
                home: 'Accueil',
                history: 'Historique',
                favorites: 'Favoris',
                random: 'Aléatoire',
                settings: 'Paramètres',
                
                // Main page
                today: 'Aujourd\'hui',
                search: 'Rechercher',
                refresh: 'Actualiser',
                saveToFavorites: 'Sauvegarder dans les Favoris',
                saved: 'Sauvegardé',
                viewed: 'Faits vus',
                favorites: 'Favoris',
                shared: 'Partagés',
                recentFacts: 'Faits récents',
                
                // Settings
                configuration: 'Configuration',
                language: 'LANGUE',
                appLanguage: 'Langue de l\'application',
                notifications: 'NOTIFICATIONS',
                dailyNotifications: 'Notifications quotidiennes',
                receiveFacts: 'Recevoir des faits curieux',
                notificationTime: 'Heure de notification',
                information: 'INFORMATION',
                about: 'À propos',
                version: 'Version 1.0.0',
                privacyPolicy: 'Politique de confidentialité',
                viewTerms: 'Voir les termes',
                rateApp: 'Noter l\'application',
                helpUsImprove: 'Aidez-nous à améliorer',
                
                // Modals
                selectLanguage: 'Sélectionnez la langue de l\'application:',
                selectTime: 'Sélectionnez l\'heure pour recevoir les notifications quotidiennes:',
                aboutTitle: 'Faits Curieux',
                aboutDesc: 'Découvrez des faits intéressants et curieux chaque jour.',
                aboutDev: 'Développé avec ❤️ pour apprendre quelque chose de nouveau chaque jour.',
                rateTitle: 'Aimez-vous l\'application?',
                rateDesc: 'Votre note nous aide à améliorer et à atteindre plus de personnes.',
                rateButton: 'Noter dans le magasin',
                rateThanks: 'Merci pour votre soutien 🙏',
                
                // Messages
                languageUpdated: 'Langue mise à jour',
                notificationsActivated: 'Notifications activées',
                notificationsDeactivated: 'Notifications désactivées',
                notificationTimeSaved: 'Heure de notification sauvegardée',
                thanksForRating: 'Merci pour votre note! ⭐',
                dataUpdated: 'Données mises à jour',
                addedToFavorites: 'Ajouté aux favoris',
                removedFromFavorites: 'Retiré des favoris',
                
                // Recherche
                searchHistory: 'Rechercher par mot-clé ou date...',
                searchFavorites: 'Rechercher dans les favoris...',
                
                // Catégories
                all: 'Tous',
                sciences: 'Sciences',
                history: 'Histoire',
                nature: 'Nature',
                
                // Boutons
                share: 'Partager',
                seeAnotherFact: 'Voir un autre fait'
            },
            de: {
                // Navigation
                home: 'Startseite',
                history: 'Verlauf',
                favorites: 'Favoriten',
                random: 'Zufällig',
                settings: 'Einstellungen',
                
                // Main page
                today: 'Heute',
                search: 'Suchen',
                refresh: 'Aktualisieren',
                saveToFavorites: 'Zu Favoriten hinzufügen',
                saved: 'Gespeichert',
                viewed: 'Angesehene Fakten',
                favorites: 'Favoriten',
                shared: 'Geteilt',
                recentFacts: 'Aktuelle Fakten',
                
                // Settings
                configuration: 'Konfiguration',
                language: 'SPRACHE',
                appLanguage: 'App-Sprache',
                notifications: 'BENACHRICHTIGUNGEN',
                dailyNotifications: 'Tägliche Benachrichtigungen',
                receiveFacts: 'Kuriositäten erhalten',
                notificationTime: 'Benachrichtigungszeit',
                information: 'INFORMATION',
                about: 'Über',
                version: 'Version 1.0.0',
                privacyPolicy: 'Datenschutzrichtlinie',
                viewTerms: 'Bedingungen anzeigen',
                rateApp: 'App bewerten',
                helpUsImprove: 'Helfen Sie uns zu verbessern',
                
                // Modals
                selectLanguage: 'Wählen Sie die App-Sprache:',
                selectTime: 'Wählen Sie die Zeit für tägliche Benachrichtigungen:',
                aboutTitle: 'Kuriositäten',
                aboutDesc: 'Entdecken Sie jeden Tag interessante und kuriosen Fakten.',
                aboutDev: 'Entwickelt mit ❤️ um jeden Tag etwas Neues zu lernen.',
                rateTitle: 'Gefällt Ihnen die App?',
                rateDesc: 'Ihre Bewertung hilft uns zu verbessern und mehr Menschen zu erreichen.',
                rateButton: 'Im Store bewerten',
                rateThanks: 'Danke für Ihre Unterstützung 🙏',
                
                // Messages
                languageUpdated: 'Sprache aktualisiert',
                notificationsActivated: 'Benachrichtigungen aktiviert',
                notificationsDeactivated: 'Benachrichtigungen deaktiviert',
                notificationTimeSaved: 'Benachrichtigungszeit gespeichert',
                thanksForRating: 'Danke für Ihre Bewertung! ⭐',
                dataUpdated: 'Daten aktualisiert',
                addedToFavorites: 'Zu Favoriten hinzugefügt',
                removedFromFavorites: 'Aus Favoriten entfernt',
                
                // Suche
                searchHistory: 'Nach Stichwort oder Datum suchen...',
                searchFavorites: 'In Favoriten suchen...',
                
                // Kategorien
                all: 'Alle',
                sciences: 'Wissenschaften',
                history: 'Geschichte',
                nature: 'Natur',
                
                // Buttons
                share: 'Teilen',
                seeAnotherFact: 'Andere Tatsache anzeigen'
            }
        };
    }

    // Método para obtener traducción
    t(key) {
        const currentLang = this.store.getSettings().language || 'es';
        return this.translations[currentLang]?.[key] || this.translations.es[key] || key;
    }

    // Aplicar traducciones a toda la UI
    applyTranslations() {
        const currentLang = this.store.getSettings().language || 'es';
        console.log('Aplicando traducciones para idioma:', currentLang);
        
        // Navegación
        document.querySelectorAll('.nav-label').forEach((el, index) => {
            const keys = ['home', 'history', 'favorites', 'random', 'settings'];
            if (keys[index]) {
                el.textContent = this.t(keys[index]);
            }
        });

        // Top nav (solo palabras) - actualizar también si existe
        const topNavTabs = document.querySelectorAll('.top-nav .nav-tab');
        if (topNavTabs && topNavTabs.length) {
            const keys = ['home', 'history', 'favorites', 'random', 'settings'];
            topNavTabs.forEach((tab, idx) => {
                if (keys[idx]) tab.textContent = this.t(keys[idx]);
            });
        }

        // Titlebar tabs (cuando la app está en modo standalone/WCO)
        const titlebarTabs = document.querySelectorAll('.titlebar-tab');
        if (titlebarTabs && titlebarTabs.length) {
            const keys = ['home', 'history', 'favorites', 'random', 'settings'];
            titlebarTabs.forEach((tab, idx) => {
                if (keys[idx]) tab.textContent = this.t(keys[idx]);
            });
        }

        // Página principal
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) headerTitle.textContent = this.t('today');

        // Botones del header
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) searchBtn.title = this.t('search');

        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) settingsBtn.title = this.t('settings');

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${this.t('refresh')}`;
        }

        // Botones de favoritos
        const favoriteBtns = document.querySelectorAll('.favorite-btn');
        favoriteBtns.forEach(btn => {
            if (btn.textContent.includes('Guardar') || btn.textContent.includes('Save')) {
                btn.innerHTML = `<i class="far fa-bookmark"></i> ${this.t('saveToFavorites')}`;
            }
        });

        // Estadísticas
        const statLabels = document.querySelectorAll('.stat-label');
        const statKeys = ['viewed', 'favorites', 'shared'];
        statLabels.forEach((label, index) => {
            if (statKeys[index]) {
                label.textContent = this.t(statKeys[index]);
            }
        });

        // Títulos de sección
        const sectionTitles = document.querySelectorAll('h1, h2');
        sectionTitles.forEach(title => {
            const text = title.textContent.toLowerCase();
            if (text.includes('historial') || text.includes('history')) {
                title.textContent = this.t('history');
            } else if (text.includes('favoritas') || text.includes('favorites')) {
                title.textContent = this.t('favorites');
            } else if (text.includes('aleatorio') || text.includes('random')) {
                title.textContent = this.t('random');
            } else if (text.includes('configuración') || text.includes('settings')) {
                title.textContent = this.t('settings');
            }
        });

        // Configuración
        this.updateSettingsTranslations();
        
        // Páginas específicas
        this.updatePageTranslations();
    }

    // Actualizar traducciones de configuración
    updateSettingsTranslations() {
        // Títulos de sección
        const sectionTitles = document.querySelectorAll('#settings h2');
        const sectionKeys = ['language', 'notifications', 'information'];
        sectionTitles.forEach((title, index) => {
            if (sectionKeys[index]) {
                title.textContent = this.t(sectionKeys[index]);
            }
        });

        // Filas de configuración
        const settingRows = document.querySelectorAll('.setting-row');
        settingRows.forEach(row => {
            const action = row.getAttribute('data-action');
            const label = row.querySelector('.setting-label');
            const sub = row.querySelector('.setting-sub');
            
            if (label) {
                switch (action) {
                    case 'language':
                        label.textContent = this.t('appLanguage');
                        break;
                    case 'notifications':
                        label.textContent = this.t('dailyNotifications');
                        if (sub) sub.textContent = this.t('receiveFacts');
                        break;
                    case 'notificationTime':
                        label.textContent = this.t('notificationTime');
                        break;
                    case 'about':
                        label.textContent = this.t('about');
                        if (sub) sub.textContent = this.t('version');
                        break;
                    case 'privacy':
                        label.textContent = this.t('privacyPolicy');
                        if (sub) sub.textContent = this.t('viewTerms');
                        break;
                    case 'rate':
                        label.textContent = this.t('rateApp');
                        if (sub) sub.textContent = this.t('helpUsImprove');
                        break;
                }
            }
        });
    }

    // Actualizar traducciones de páginas específicas
    updatePageTranslations() {
        // Página de historial
        const historySearch = document.getElementById('history-search');
        if (historySearch) {
            historySearch.placeholder = this.t('searchHistory') || 'Buscar por palabra clave o fecha...';
        }

        // Página de favoritos
        const favoritesSearch = document.getElementById('favorites-search');
        if (favoritesSearch) {
            favoritesSearch.placeholder = this.t('searchFavorites') || 'Buscar en favoritos...';
        }

        // Botones de categorías en favoritos
        const categoryBtns = document.querySelectorAll('.category-filter-btn');
        const categoryKeys = ['all', 'sciences', 'history', 'nature'];
        categoryBtns.forEach((btn, index) => {
            if (categoryKeys[index]) {
                const key = categoryKeys[index];
                if (key === 'all') {
                    btn.textContent = this.t('all') || 'Todos';
                } else if (key === 'sciences') {
                    btn.textContent = this.t('sciences') || 'Ciencias';
                } else if (key === 'history') {
                    btn.textContent = this.t('history') || 'Historia';
                } else if (key === 'nature') {
                    btn.textContent = this.t('nature') || 'Naturaleza';
                }
            }
        });

        // Botones aleatorios
        const newRandomBtn = document.getElementById('new-random-btn');
        if (newRandomBtn) {
            newRandomBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${this.t('seeAnotherFact') || 'Ver otro dato curioso'}`;
        }

        const randomFavoriteBtn = document.getElementById('random-favorite-btn');
        if (randomFavoriteBtn) {
            randomFavoriteBtn.innerHTML = `<i class="far fa-bookmark"></i> ${this.t('favorites')}`;
        }

        const randomShareBtn = document.getElementById('random-share-btn');
        if (randomShareBtn) {
            randomShareBtn.innerHTML = `<i class="fas fa-share-alt"></i> ${this.t('share')}`;
        }
    }
}

// Nota: la inicialización de UI la realiza la clase App en app.js
// Exportar la clase por si se necesita crear una instancia manualmente
window.UI = UI;