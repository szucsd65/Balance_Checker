import './style.css';

import { loadLog } from './views/login.js';
import { loadReg } from './views/register.js';
import { loadPage} from './views/frontpage.js';
import { loadTransactions } from './views/transactions.js';
import { loadCategories } from './views/categories.js';

import { getUser, authChangeListener } from './service/auth.js';

let navigationId = 0;

async function navigate() {
  const currentNavigation = ++navigationId;
  const page = window.location.hash.replace('#', '') || 'login';
  console.log('NAVIGATION:', page);
    if (page === 'login') {
      loadLog();
      return;
    }

    if (page === 'register') {
      loadReg();
      return;
    }
      
    try {
      const user = await getUser();
      console.log('USER:', user);
      console.log('CURRENT PAGE:', page);

      if (currentNavigation !== navigationId) return;

      if (!user) {
        window.location.hash = 'login';
        return;
      }

      if (page === 'frontpage') {
        await loadPage(user);
      }
      else if (page === 'transactions') {
        await loadTransactions(user);
      }
      else if (page === 'categories') {
        await loadCategories(user);
      }
      else {
        window.location.hash = 'frontpage';
      }
    }
    catch (error) {
      console.error('Frontpage error:', error);
      if (currentNavigation === navigationId) {
        document.querySelector('#app').innerHTML = '<p>Hiba történt a betöltéskor.</p>';
      }
    }
}

window.addEventListener('hashchange', navigate);

authChangeListener((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    if (window.location.hash !== '#frontpage' && window.location.hash !== '#transactions') {
      window.location.hash = '#frontpage';
    }
  }

  if (event === 'SIGNED_OUT') {
    window.location.hash = 'login'
  }
});

navigate();