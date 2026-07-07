function a(){return`
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
    `}function n(){console.log("Contact page initialized");const e=document.getElementById("contactForm");e&&e.addEventListener("submit",t=>{t.preventDefault(),console.log("Contact form submitted")})}export{n as default,a as generateContactContent};
