# JavaScript Routing System Implementation Guide

## Overview
This guide explains how to implement a client-side routing system similar to the one used in the FUSION project. The system uses vanilla JavaScript with Vite for bundling and provides a clean, modular approach to single-page application routing.

## Project Structure
```
project/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js
│   ├── router.js
│   ├── components/
│   │   ├── home.js
│   │   ├── about.js
│   │   ├── contact.js
│   │   └── profile.js
│   └── styles/
│       └── main.css
└── templates/
    ├── home.html
    ├── about.html
    ├── contact.html
    └── profile.html
```

## 1. Package.json Setup

```json
{
  "name": "routing-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

## 2. Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
```

## 3. HTML Entry Point

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Routing App</title>
    <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
    <div id="app">
        <!-- Content will be dynamically loaded here -->
    </div>
    
    <script type="module" src="/src/main.js"></script>
</body>
</html>
```

## 4. Router Implementation

```javascript
// src/router.js

// Route configuration object
const routes = {
    '/': {
        template: './templates/home.html',
        title: 'Home',
        description: 'Welcome to our app'
    },
    '/about': {
        template: './templates/about.html',
        title: 'About',
        description: 'About our company'
    },
    '/contact': {
        template: './templates/contact.html',
        title: 'Contact',
        description: 'Get in touch with us'
    },
    '/profile': {
        template: './templates/profile.html',
        title: 'Profile',
        description: 'User profile page'
    },
    '/404': {
        template: './templates/404.html',
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist'
    }
};

// Router class
class Router {
    constructor() {
        this.routes = routes;
        this.currentRoute = null;
        this.init();
    }

    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle initial route
        this.handleRoute();

        // Add click event listeners to navigation links
        this.setupNavigation();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const route = this.routes[path] || this.routes['/404'];
        
        try {
            // Load template
            const response = await fetch(route.template);
            const html = await response.text();
            
            // Update page content
            document.getElementById('app').innerHTML = html;
            
            // Update browser history
            if (this.currentRoute !== path) {
                window.history.pushState({}, '', path);
                this.currentRoute = path;
            }
            
            // Update page title
            document.title = route.title;
            
            // Load page-specific JavaScript
            await this.loadPageScript(path);
            
            // Trigger route change event
            this.onRouteChange(path, route);
            
        } catch (error) {
            console.error('Error loading route:', error);
            // Load 404 page on error
            const response = await fetch(this.routes['/404'].template);
            const html = await response.text();
            document.getElementById('app').innerHTML = html;
        }
    }

    async loadPageScript(path) {
        const scriptMap = {
            '/': './src/components/home.js',
            '/about': './src/components/about.js',
            '/contact': './src/components/contact.js',
            '/profile': './src/components/profile.js'
        };

        const scriptPath = scriptMap[path];
        if (scriptPath) {
            try {
                const module = await import(scriptPath);
                if (module.default && typeof module.default === 'function') {
                    module.default();
                }
            } catch (error) {
                console.warn(`No script found for route: ${path}`);
            }
        }
    }

    setupNavigation() {
        // Add click event listeners to all navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="/"]')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                this.navigate(href);
            }
        });
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    onRouteChange(path, route) {
        // Custom event for route changes
        const event = new CustomEvent('routeChange', {
            detail: { path, route }
        });
        window.dispatchEvent(event);
    }
}

// Export router instance
export const router = new Router();

// Export navigation function
export const navigate = (path) => router.navigate(path);
```

## 5. Main Application Entry

```javascript
// src/main.js
import { router } from './router.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    
    // Listen for route changes
    window.addEventListener('routeChange', (event) => {
        console.log('Route changed to:', event.detail.path);
        // Add any global route change logic here
    });
});

// Export for use in other modules
export { router };
```

## 6. Page Components

```javascript
// src/components/home.js
export default function initHome() {
    console.log('Home page initialized');
    
    // Add event listeners specific to home page
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            console.log('Home button clicked');
        });
    }
}
```

```javascript
// src/components/about.js
export default function initAbout() {
    console.log('About page initialized');
    
    // Add about page specific functionality
    const aboutContent = document.getElementById('aboutContent');
    if (aboutContent) {
        aboutContent.addEventListener('click', () => {
            console.log('About content clicked');
        });
    }
}
```

```javascript
// src/components/contact.js
export default function initContact() {
    console.log('Contact page initialized');
    
    // Handle contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Contact form submitted');
            // Add form handling logic here
        });
    }
}
```

```javascript
// src/components/profile.js
export default function initProfile() {
    console.log('Profile page initialized');
    
    // Add profile page functionality
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Profile form submitted');
            // Add profile update logic here
        });
    }
}
```

## 7. HTML Templates

```html
<!-- templates/home.html -->
<div class="page home-page">
    <header>
        <h1>Welcome Home</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/profile">Profile</a>
        </nav>
    </header>
    
    <main>
        <section class="hero">
            <h2>Welcome to Our App</h2>
            <p>This is a beautiful home page with client-side routing.</p>
            <button id="homeButton">Get Started</button>
        </section>
    </main>
</div>
```

```html
<!-- templates/about.html -->
<div class="page about-page">
    <header>
        <h1>About Us</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/profile">Profile</a>
        </nav>
    </header>
    
    <main>
        <section id="aboutContent">
            <h2>Our Story</h2>
            <p>Learn more about our company and mission.</p>
        </section>
    </main>
</div>
```

```html
<!-- templates/contact.html -->
<div class="page contact-page">
    <header>
        <h1>Contact Us</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/profile">Profile</a>
        </nav>
    </header>
    
    <main>
        <form id="contactForm">
            <h2>Get in Touch</h2>
            <div class="form-group">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="message">Message:</label>
                <textarea id="message" name="message" required></textarea>
            </div>
            <button type="submit">Send Message</button>
        </form>
    </main>
</div>
```

```html
<!-- templates/profile.html -->
<div class="page profile-page">
    <header>
        <h1>User Profile</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/profile">Profile</a>
        </nav>
    </header>
    
    <main>
        <form id="profileForm">
            <h2>Edit Profile</h2>
            <div class="form-group">
                <label for="firstName">First Name:</label>
                <input type="text" id="firstName" name="firstName" required>
            </div>
            <div class="form-group">
                <label for="lastName">Last Name:</label>
                <input type="text" id="lastName" name="lastName" required>
            </div>
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            <button type="submit">Update Profile</button>
        </form>
    </main>
</div>
```

```html
<!-- templates/404.html -->
<div class="page error-page">
    <header>
        <h1>Page Not Found</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/profile">Profile</a>
        </nav>
    </header>
    
    <main>
        <section class="error-content">
            <h2>404 - Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
            <a href="/" class="btn">Go Home</a>
        </section>
    </main>
</div>
```

## 8. Basic CSS Styling

```css
/* src/styles/main.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
}

.page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    background: #f4f4f4;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
}

header h1 {
    margin-bottom: 1rem;
}

nav {
    display: flex;
    gap: 1rem;
}

nav a {
    text-decoration: none;
    color: #333;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.3s;
}

nav a:hover {
    background-color: #ddd;
}

main {
    flex: 1;
    padding: 2rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.form-group textarea {
    height: 100px;
    resize: vertical;
}

button {
    background: #007bff;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button:hover {
    background: #0056b3;
}

.btn {
    display: inline-block;
    background: #007bff;
    color: white;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.btn:hover {
    background: #0056b3;
}

.hero {
    text-align: center;
    padding: 3rem 0;
}

.hero h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    color: #666;
}

.error-content {
    text-align: center;
    padding: 3rem 0;
}

.error-content h2 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #dc3545;
}

.error-content p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    color: #666;
}
```

## 9. Usage Examples

### Programmatic Navigation
```javascript
import { navigate } from './router.js';

// Navigate to a specific route
navigate('/about');

// Navigate with data
navigate('/profile?id=123');
```

### Route Change Event Listener
```javascript
window.addEventListener('routeChange', (event) => {
    const { path, route } = event.detail;
    console.log(`Navigated to ${path}: ${route.title}`);
    
    // Add analytics tracking
    // Update navigation state
    // Load page-specific resources
});
```

### Dynamic Route Loading
```javascript
// Add dynamic routes
router.addRoute('/products/:id', {
    template: './templates/product.html',
    title: 'Product Details',
    description: 'Product information page'
});
```

## 10. Advanced Features

### Route Parameters
```javascript
// Extract route parameters
const path = '/products/123';
const params = path.match(/\/products\/(\d+)/);
const productId = params ? params[1] : null;
```

### Route Guards
```javascript
// Add authentication checks
const protectedRoutes = ['/profile', '/admin'];

function checkAuth(path) {
    if (protectedRoutes.includes(path) && !isAuthenticated()) {
        navigate('/login');
        return false;
    }
    return true;
}
```

### Loading States
```javascript
// Show loading indicator
function showLoading() {
    document.getElementById('app').innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoading() {
    // Content will be loaded by router
}
```

## 11. Best Practices

1. **Modular Components**: Keep page-specific logic in separate component files
2. **Error Handling**: Always handle template loading errors gracefully
3. **SEO Considerations**: Use proper meta tags and titles for each route
4. **Performance**: Lazy load components and optimize bundle size
5. **Accessibility**: Ensure proper ARIA labels and keyboard navigation
6. **Testing**: Write unit tests for router logic and component functions

## 12. Deployment

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 13. Troubleshooting

### Common Issues:
1. **Template not loading**: Check file paths and CORS settings
2. **Navigation not working**: Ensure event listeners are properly attached
3. **Component not initializing**: Verify import/export syntax
4. **History not updating**: Check browser compatibility

### Debug Tips:
- Use browser dev tools to inspect network requests
- Add console logs to track route changes
- Check for JavaScript errors in the console
- Verify template HTML structure

This routing system provides a solid foundation for building single-page applications with vanilla JavaScript and Vite, without external dependencies like React or Vue. 