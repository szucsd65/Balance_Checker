import './style.css';

import { loadLog } from './views/login';
import { loadReg } from './views/register';

import { getUser, authChangeListener } from './service/auth';

function navigate() {
  const page = window.location.hash.replace('#', '');

    if (page === 'register') {
      loadReg();
    }
    else {
      loadLog();
    }
}

window.addEventListener('hashchange', navigate);

navigate();

authChangeListener((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    window.location.hash = 'frontpage';
  }
});