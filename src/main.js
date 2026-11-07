import './style.css';

import { loadLog } from '../views/login.js';
import { loadReg } from '../views/register.js';
import { loadPage } from '../views/frontpage.js';

import { getUser, authChangeListener } from '../service/auth.js';

async function navigate() {
  const page = window.location.hash.replace('#', '') || 'login';

    if (page === 'register') {
      loadReg();
      return;
    }
    if (page === 'frontpage') {
      try {
        const user = await getUser();

        if (!user) {
          window.location.hash = 'login';
          return;
        }

        await loadPage(user);
      }
      catch (error) {
        console.error('Frontpage error:', error);
        document.querySelector('#app').textContent = 'Hiba történt a betöltéskor.';
      }
      return;
    }
    loadLog();
}

window.addEventListener('hashchange', navigate);

authChangeListener((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    if (window.location.hash !== '#frontpage') {
      window.location.hash = '#frontpage';
    }
  }

  if (event === 'SIGNED_OUT') {
    window.location.hash = 'login'
  }
});

navigate();