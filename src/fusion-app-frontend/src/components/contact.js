// Content generation function - returns HTML content only (no header/footer)
export function generateContactContent() {
    return `
        <div class="page-content contact-content">
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
        </div>
    `;
}

// Functionality initialization - called after content is injected
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

