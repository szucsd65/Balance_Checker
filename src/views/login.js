import {login} from '../service/auth.js';

export function loadLog() {
    document.querySelector('#app').innerHTML = `
        <div id="authContainer>
            <div id="authCard">
                <h1>Kiadások</h1>
                <h2>Bejelentkezés</h2>

                <form id="loginForm">
                    <label>Email:</label>
                    <input type="email" id="email" placeholder="email@email.com" required>
                    <label>Jelszó:</label>
                    <input type="password" id="password" placeholder="Jelszó" required>

                    <button type="submit">Bejelentkezés</button>

                    <p id="message"></p>
                </form>

                <p>
                    Nem rendelkezel fiókkal?
                    <a href="#register">Bejelentkezés</a>
                </p>
            </div>
        </div>
    `;

    document.querySelector('#loginForm').addEventListener('sumbit', async (event) => {
        event.preventDefault();

        const email = document.querySelector('#email').value.trim();
        const password = document.querySelector('#password').value.trim();
        const message = document.querySelector('#message').value.trim();

        try {
            await login(email, password);

            window.location.hash = 'frontpage';
        }
        catch (error) {
            message.textContent = "Helytelen bejelentkezési adatok.";
        }
    });
}