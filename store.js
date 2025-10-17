class Store {
    constructor() {
        this.facts = [];
    // favorites ahora guarda objetos { id, savedAt }
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.viewedFacts = JSON.parse(localStorage.getItem('viewedFacts')) || [];
        this.sharedFacts = JSON.parse(localStorage.getItem('sharedFacts')) || [];
        this.settings = JSON.parse(localStorage.getItem('settings')) || {
            darkMode: false,
            notifications: true,
            notificationTime: '08:00',
            language: 'es'
        };
    }

    // Cargar datos desde JSON
    async loadFacts() {
        try {
            const response = await fetch('datos.json');
            const data = await response.json();
            this.facts = data.facts;
            return this.facts;
        } catch (error) {
            console.error('Error loading facts:', error);
            return [];
        }
    }

    // Favoritos
    toggleFavorite(factId) {
        const index = this.favorites.findIndex(f => f.id === factId);
        if (index === -1) {
            const entry = { id: factId, savedAt: Date.now() };
            this.favorites.push(entry);
            localStorage.setItem('favorites', JSON.stringify(this.favorites));
            return true;
        } else {
            this.favorites.splice(index, 1);
            localStorage.setItem('favorites', JSON.stringify(this.favorites));
            return false;
        }
    }

    isFavorite(factId) {
        return this.favorites.some(f => f.id === factId);
    }

    getFavorites() {
        // Devolver los hechos con la metadata savedAt
        return this.favorites.map(fav => {
            const fact = this.facts.find(f => f.id === fav.id);
            if (fact) return { ...fact, savedAt: fav.savedAt };
            return null;
        }).filter(Boolean);
    }

    // Historial
    addToViewed(factId) {
        if (!this.viewedFacts.includes(factId)) {
            this.viewedFacts.unshift(factId);
            // Mantener solo los últimos 50
            this.viewedFacts = this.viewedFacts.slice(0, 50);
            localStorage.setItem('viewedFacts', JSON.stringify(this.viewedFacts));
        }
    }

    getViewedFacts() {
        return this.viewedFacts.map(id => this.facts.find(fact => fact.id === id)).filter(Boolean);
    }

    // Compartidos
    addToShared(factId) {
        if (!this.sharedFacts.includes(factId)) {
            this.sharedFacts.push(factId);
            localStorage.setItem('sharedFacts', JSON.stringify(this.sharedFacts));
        }
    }

    // Configuración
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('settings', JSON.stringify(this.settings));
        return this.settings;
    }

    getSettings() {
        return this.settings;
    }

    // Búsqueda
    searchFacts(query) {
        const lowerQuery = query.toLowerCase();
        return this.facts.filter(fact => 
            fact.title.toLowerCase().includes(lowerQuery) ||
            fact.content.toLowerCase().includes(lowerQuery) ||
            fact.category.toLowerCase().includes(lowerQuery)
        );
    }

    // Obtener datos por categoría
    getFactsByCategory(category) {
        if (category === 'all') return this.facts;
        return this.facts.filter(fact => fact.category === category);
    }

    // Obtener dato aleatorio
    getRandomFact() {
        const availableFacts = this.facts.filter(fact => !this.viewedFacts.includes(fact.id));
        if (availableFacts.length === 0) {
            // Si todos los datos han sido vistos, reiniciar
            this.viewedFacts = [];
            localStorage.setItem('viewedFacts', JSON.stringify(this.viewedFacts));
            return this.facts[Math.floor(Math.random() * this.facts.length)];
        }
        return availableFacts[Math.floor(Math.random() * availableFacts.length)];
    }

    // Obtener datos recientes
    getRecentFacts(limit = 5) {
        const viewed = this.getViewedFacts();
        return viewed.slice(0, limit);
    }

    // Estadísticas
    getStats() {
        return {
            viewed: this.viewedFacts.length,
            favorites: this.favorites.length,
            shared: this.sharedFacts.length
        };
    }
}

// Crear instancia global
const appStore = new Store();