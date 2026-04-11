// Content generation function - returns HTML content only (no header/footer)
export function generateNotFoundContent() {
    return `
        <div class="page-content error-content">
            <h2>404 - Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
            <a href="/" class="btn">Go Home</a>
        </div>
    `;
}

// Functionality initialization - called after content is injected
export default function initNotFound() {
    console.log('404 page initialized');
}
