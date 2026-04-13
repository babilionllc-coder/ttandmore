import './style.css';

// =========================================================
// TT & More — Premium Interactions
// =========================================================

// ---- Sticky header scroll effect ----
const header = document.querySelector('.header');
if (header) {
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });
}

// ---- Mobile menu toggle ----
const mobileToggle = document.querySelector('.mobile-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ---- FAQ Accordion ----
document.querySelectorAll('.faq-item__question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.closest('.faq-item');
    const isActive = item.classList.contains('active');

    // Close all
    document.querySelectorAll('.faq-item.active').forEach(activeItem => {
      activeItem.classList.remove('active');
    });

    // Toggle current
    if (!isActive) {
      item.classList.add('active');
    }
  });
});

// ---- Scroll reveal ----
const revealElements = document.querySelectorAll('.reveal');
if (revealElements.length > 0) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

// ---- Counter animation ----
const counters = document.querySelectorAll('.stat-item__number[data-count]');
if (counters.length > 0) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = 0;
        const startTime = performance.now();

        function animateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const current = Math.floor(start + (target - start) * eased);
          el.textContent = current.toLocaleString() + suffix;

          if (progress < 1) {
            requestAnimationFrame(animateCount);
          }
        }

        requestAnimationFrame(animateCount);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));
}

// ---- Tour tabs ----
const tourTabs = document.querySelectorAll('.tours__tab');
const tourCards = document.querySelectorAll('.tour-card');

tourTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active tab
    tourTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const category = tab.dataset.category;

    // Filter cards with animation
    tourCards.forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => { card.style.display = 'none'; }, 300);
      }
    });
  });
});

// ---- Smooth scroll for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// ---- Booking form WhatsApp redirect ----
const bookingForms = document.querySelectorAll('.booking-form');
bookingForms.forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    let message = `🚐 *TT & More Booking Request*\n\n`;
    if (data.service) message += `📋 Service: ${data.service}\n`;
    if (data.destination) message += `📍 Destination: ${data.destination}\n`;
    if (data.date) message += `📅 Date: ${data.date}\n`;
    if (data.passengers) message += `👥 Passengers: ${data.passengers}\n`;
    if (data.hotel) message += `🏨 Hotel: ${data.hotel}\n`;
    if (data.flight) message += `✈️ Flight: ${data.flight}\n`;
    if (data.name) message += `👤 Name: ${data.name}\n`;
    if (data.email) message += `📧 Email: ${data.email}\n`;
    if (data.phone) message += `📱 Phone: ${data.phone}\n`;
    if (data.notes) message += `📝 Notes: ${data.notes}\n`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/529981666981?text=${encoded}`, '_blank');
  });
});

console.log('TT & More — Premium Site Loaded ✨');
