// Utilidades generales
class Utils {
    // Formatear fecha
    static formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }

    static formatShortDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-ES', { month: 'short' });
        return `${day} ${month}`;
    }

    // Calcular tiempo transcurrido
    static timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'hace 1 día';
        if (diffDays < 7) return `hace ${diffDays} días`;
        if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
        return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
    }

    // Mostrar toast
    static showToast(message, duration = 2000) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.opacity = '1';
            
            setTimeout(() => {
                toast.style.opacity = '0';
            }, duration);
        }
    }

    // Compartir contenido
    static async shareContent(title, text, url) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text,
                    url: url
                });
                return true;
            } catch (error) {
                console.log('Error sharing:', error);
                return false;
            }
        } else {
            // Fallback: copiar al portapapeles
            try {
                await navigator.clipboard.writeText(text);
                Utils.showToast('Dato copiado al portapapeles');
                return true;
            } catch (error) {
                console.log('Error copying to clipboard:', error);
                Utils.showToast('Error al compartir');
                return false;
            }
        }
    }

    // Debounce para búsqueda
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Capitalizar primera letra
    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Validar si es móvil
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Cargar iconos Font Awesome
    static loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(link);
        }
    }
}