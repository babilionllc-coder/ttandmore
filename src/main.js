import './style.css';

// =========================================================
// TT & More — Premium Interactions
// =========================================================

// ---- Cinematic Hero Slideshow ----
const heroSlides = document.querySelectorAll('.hero-slide');
if (heroSlides.length > 0) {
  let currentSlide = 0;
  const slideInterval = 6000; // 6 seconds per slide

  function nextSlide() {
    heroSlides[currentSlide].classList.remove('hero-slide--active');
    currentSlide = (currentSlide + 1) % heroSlides.length;
    heroSlides[currentSlide].classList.add('hero-slide--active');
  }

  setInterval(nextSlide, slideInterval);
}

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
  // CRITICAL: The .header uses backdrop-filter which creates a new containing block
  // for position:fixed descendants. If .mobile-menu stays inside .header, it gets
  // clipped to the header's box (~70px tall) and appears broken on mobile.
  // Portal it to <body> so position:fixed anchors to the viewport.
  if (mobileMenu.parentElement !== document.body) {
    document.body.appendChild(mobileMenu);
  }

  // Inject sticky header bar with logo + close X (once)
  if (!mobileMenu.querySelector('.mobile-menu__header')) {
    const bar = document.createElement('div');
    bar.className = 'mobile-menu__header';
    bar.innerHTML = `
      <span class="mobile-menu__brand">TT&amp;More</span>
      <button class="mobile-menu__close" aria-label="Close menu" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    mobileMenu.insertBefore(bar, mobileMenu.firstChild);
  }

  const closeMenu = () => {
    mobileToggle.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  };

  mobileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close button
  const closeBtn = mobileMenu.querySelector('.mobile-menu__close');
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) closeMenu();
  });
}

// ---- Pricing OW/RT Toggle (book pages) ----
document.querySelectorAll('.price-toggle').forEach(toggleWrap => {
  const table = toggleWrap.parentElement.querySelector('.pricing-table[data-trip]');
  if (!table) return;
  toggleWrap.querySelectorAll('.price-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const trip = btn.dataset.trip; // "ow" or "rt"
      toggleWrap.querySelectorAll('.price-toggle__btn').forEach(b => b.classList.toggle('is-active', b === btn));
      table.setAttribute('data-trip', trip);
      table.querySelectorAll('td.price').forEach(cell => {
        const val = cell.dataset[trip];
        if (val) cell.textContent = val;
      });
    });
  });
});

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
    window.open(`https://wa.me/529983000307?text=${encoded}`, '_blank');
  });
});

// =========================================================
// AI Chat Widget — Gemini-powered Concierge
// =========================================================
const chatWidget = document.getElementById('chat-widget');
const chatToggle = document.getElementById('chat-toggle');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatQuickActions = document.getElementById('chat-quick-actions');

if (chatToggle && chatWidget) {
  let conversationHistory = [];
  let isLoading = false;

  // Toggle chat open/close
  let welcomeAnimated = false;
  
  chatToggle.addEventListener('click', () => {
    chatWidget.classList.toggle('active');
    const isVisible = chatWidget.classList.contains('active');
    
    if (isVisible) {
      if (!welcomeAnimated) {
        welcomeAnimated = true;
        const welcomeEl = document.getElementById('initial-welcome-msg');
        if (welcomeEl) {
          const originalText = welcomeEl.textContent;
          welcomeEl.textContent = '';
          let i = 0;
          const typeWriter = setInterval(() => {
            welcomeEl.textContent += originalText.charAt(i);
            i++;
            if (i >= originalText.length) clearInterval(typeWriter);
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
          }, 25);
        }
      }
      setTimeout(() => chatInput?.focus(), 300);
    }
  });

  // Send message
  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    // Hide quick actions after first message
    if (chatQuickActions) chatQuickActions.style.display = 'none';

    // Add user message
    appendMessage(text, 'user');
    conversationHistory.push({ role: 'user', text });

    // Clear input
    if (chatInput) chatInput.value = '';

    // Show typing indicator
    isLoading = true;
    const typingEl = showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-10), // Keep last 10 messages for context
          lang: window.location.pathname.startsWith('/es') ? 'es' : 'en'
        })
      });

      const data = await response.json();
      removeTyping(typingEl);

      if (data.reply) {
        appendMessage(data.reply, 'bot');
        conversationHistory.push({ role: 'model', text: data.reply });
      } else if (data.error) {
        appendMessage(data.error, 'bot');
      }
    } catch (error) {
      removeTyping(typingEl);
      appendMessage("I'm having trouble connecting. Please try again or contact us via WhatsApp at +52 998 300 0307. 📱", 'bot');
    }

    isLoading = false;
  }

  // Escape HTML to prevent injection when rendering bot text
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Render a markdown pipe-table into <table class="chat-table">
  function renderTable(tableText) {
    const lines = tableText.trim().split('\n').filter(l => l.trim().startsWith('|'));
    if (lines.length < 2) return escapeHtml(tableText);
    const rows = lines
      .filter(l => !/^\|\s*-+/.test(l.replace(/\|/g, '|').trim().split('|').slice(1,2).join('')))
      .map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length < 1) return escapeHtml(tableText);
    const [head, ...body] = rows;
    const th = head.map(c => `<th>${escapeHtml(c)}</th>`).join('');
    const tb = body.map(r => '<tr>' + r.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('');
    return `<table class="chat-table"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
  }

  // Parse [btn:label|action] and [qr:text] markers, return { html, quickReplies[] }
  function parseDSL(raw) {
    const quickReplies = [];
    let text = raw;

    // Extract [qr:...] first (pull them all out of text, render separately)
    text = text.replace(/\[qr:([^\]]+)\]/g, (_m, label) => {
      quickReplies.push(label.trim());
      return '';
    });

    // Extract markdown tables into placeholders
    const tables = [];
    text = text.replace(/(?:^|\n)(\|[^\n]+\|(?:\n\|[^\n]+\|)+)/g, (_m, tbl) => {
      tables.push(renderTable(tbl));
      return `\n{{TABLE_${tables.length - 1}}}\n`;
    });

    // Escape the rest
    let html = escapeHtml(text);

    // Reinsert tables
    html = html.replace(/\{\{TABLE_(\d+)\}\}/g, (_m, i) => tables[+i] || '');

    // [btn:label|action] → button
    html = html.replace(/\[btn:([^|\]]+)\|([^\]]+)\]/g, (_m, label, action) => {
      const act = action.trim();
      const lbl = escapeHtml(label.trim());
      if (act.startsWith('wa:')) {
        const msg = encodeURIComponent(act.slice(3).trim());
        return `<a class="chat-btn chat-btn--wa" href="https://wa.me/529983000307?text=${msg}" target="_blank" rel="noopener">${lbl}</a>`;
      }
      const safe = act.startsWith('/') || act.startsWith('http') ? act : '/' + act;
      return `<a class="chat-btn" href="${escapeHtml(safe)}" target="_blank" rel="noopener">${lbl}</a>`;
    });

    // Basic markdown
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/(\+52[\s\d]+)/g, '<a href="tel:$1">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return { html: `<p>${html}</p>`, quickReplies };
  }

  // Append message bubble
  function appendMessage(text, type) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg chat-msg--${type}`;

    if (type === 'bot') {
      const { html, quickReplies } = parseDSL(text);
      msgEl.innerHTML = html;
      chatMessages.appendChild(msgEl);

      if (quickReplies.length > 0) {
        const qrWrap = document.createElement('div');
        qrWrap.className = 'chat-qr-wrap';
        quickReplies.forEach(qr => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chat-qr';
          b.textContent = qr;
          b.addEventListener('click', () => {
            qrWrap.remove();
            sendMessage(qr);
          });
          qrWrap.appendChild(b);
        });
        chatMessages.appendChild(qrWrap);
      }
    } else {
      msgEl.textContent = text;
      chatMessages.appendChild(msgEl);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Typing indicator
  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingEl;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Send button click
  if (chatSend) {
    chatSend.addEventListener('click', () => {
      sendMessage(chatInput.value);
    });
  }

  // Enter to send
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });
  }

  // Quick action buttons
  if (chatQuickActions) {
    chatQuickActions.querySelectorAll('.chat-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sendMessage(btn.dataset.msg);
      });
    });
  }
}

console.log('TT & More — Premium Site Loaded ✨');

// Promo Video Play Logic
const promoContainer = document.getElementById('promoContainer');
const promoVideo = document.getElementById('promoVideo');
const promoPlayBtn = document.getElementById('promoPlayBtn');

if (promoContainer && promoVideo && promoPlayBtn) {
  promoContainer.addEventListener('click', () => {
    if (promoVideo.paused) {
      promoVideo.play();
      promoVideo.setAttribute('controls', 'true');
      promoPlayBtn.classList.add('is-hidden');
    } else {
      promoVideo.pause();
      promoPlayBtn.classList.remove('is-hidden');
    }
  });

  promoVideo.addEventListener('ended', () => {
    promoPlayBtn.classList.remove('is-hidden');
    promoVideo.removeAttribute('controls');
  });
}
