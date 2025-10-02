// Animate elements on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.bio-section, .links-section, .skills-section');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialize animations
function initAnimations() {
    const elements = document.querySelectorAll('.bio-section, .links-section, .skills-section');
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
}

// Add floating particles dynamically
function createFloatingParticles() {
    const bgAnimation = document.querySelector('.bg-animation');
    
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random position
        particle.style.top = Math.random() * 100 + '%';
        particle.style.left = Math.random() * 100 + '%';
        
        // Random animation delay and duration
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        
        // Random size
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        bgAnimation.appendChild(particle);
    }
}

// Typing effect for the name
function typewriterEffect() {
    const nameElement = document.querySelector('.name');
    const originalText = nameElement.textContent;
    nameElement.textContent = '';
    
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < originalText.length) {
            nameElement.textContent += originalText.charAt(i);
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 100);
}

// Add hover effect to skill items
function addSkillHoverEffects() {
    const skillItems = document.querySelectorAll('.skill-item');
    
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.05)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Smooth scroll for social links
function addSmoothScrolling() {
    const socialLinks = document.querySelectorAll('.social-link');
    
    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add a subtle click animation
            this.style.transform = 'translateY(-2px) scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-2px) scale(1)';
            }, 150);
        });
    });
}

// Add parallax effect to background
function addParallaxEffect() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const particles = document.querySelectorAll('.particle');
        
        particles.forEach((particle, index) => {
            const speed = 0.2 + (index % 3) * 0.1;
            particle.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
}

// Load external resources
function loadExternalResources() {
    // Load Google Fonts
    const fontLink = document.createElement('link');
    fontLink.href = ['https:', '', 'fonts.googleapis.com', 'css2?family=Inter:wght@300;400;500;600;700&display=swap'].join('/');
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    // Load Font Awesome
    const faLink = document.createElement('link');
    faLink.href = ['https:', '', 'cdnjs.cloudflare.com', 'ajax', 'libs', 'font-awesome', '6.4.0', 'css', 'all.min.css'].join('/');
    faLink.rel = 'stylesheet';
    document.head.appendChild(faLink);
}

// Fix social links and name
function fixSocialLinks() {
    const githubLink = document.querySelector('.github[data-url]');
    if (githubLink) {
        githubLink.href = ['https:', '', githubLink.getAttribute('data-url')].join('/');
    }
    
    const discordLink = document.querySelector('.discord[data-user]');
    if (discordLink) {
        discordLink.href = ['https:', '', 'discord.com', 'users', discordLink.getAttribute('data-user')].join('/');
    }
    
    const nameElement = document.querySelector('.name[data-name]');
    if (nameElement) {
        nameElement.textContent = nameElement.getAttribute('data-name');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load external resources
    loadExternalResources();
    
    // Fix social links first
    fixSocialLinks();
    
    // Initialize animations
    initAnimations();
    
    // Add scroll listener for animations
    window.addEventListener('scroll', animateOnScroll);
    
    // Trigger animation on load
    setTimeout(animateOnScroll, 100);
    
    // Add typing effect
    setTimeout(typewriterEffect, 500);
    
    // Create additional floating particles
    createFloatingParticles();
    
    // Add hover effects
    addSkillHoverEffects();
    
    // Add smooth scrolling
    addSmoothScrolling();
    
    // Add parallax effect
    addParallaxEffect();
    
    // Add a subtle fade-in effect to the entire page
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 1s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Add custom cursor effect (optional)
function addCustomCursor() {
    const cursor = document.createElement('div');
    cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        mix-blend-mode: difference;
        transition: transform 0.1s ease;
    `;
    document.body.appendChild(cursor);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
    });
    
    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'scale(0.8)';
    });
    
    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'scale(1)';
    });
}

// Uncomment the line below to enable custom cursor
// addCustomCursor();