import {register} from '..service/auth.js';

export function loadReg() {
    document.querySelector('#app').innerHTML = `
        <div id="registerContainer>
            <div id="registerCard">
                <h1>Kiadások</h1>
                <h2>Regisztráció</h2>

                <form id="registerForm">
                    <label>Név:</label>
                    <input type="text" id="name" placeholder="Neved" required>
                    <label>Email:</label>
                    <input type="email" id="email" placeholder="email@email.com" required>
                    <label>Jelszó:</label>
                    <input type="password" id="password" placeholder="Minimum 10 karakter" required minlength="10">
                    <label>Jelszó megerősítése:</label>
                    <input type="password" id="confirmPassword" placeholder="Jelszó újra" required>

                    <button type="submit">Regisztráció</button>

                    <p id="message"></p>
                </form>

                <p>
                    Rendelkezel fiókkal?
                    <a href="#login">Bejelentkezés</a>
                </p>
            </div>
        </div>
    `;

    document.querySelector('#registerForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.querySelector('#name').value.trim();
        const email = document.querySelector('#email').value.trim();
        const password = document.querySelector('#password').value.trim();
        const confirmPassword = document.querySelector('#confirmPassword').value.trim();
        const message = document.querySelector('#message').value.trim();

            if (password !== confirmPassword) {
            message.textContent = "A jelszavak nem egyeznek!";
            return;
        }

        try {
            const data = await register(name, email, password);
            if (data.session) {
                message.textContent = "Sikeres regisztráció!";
            }
            else {
                message.textContent = "Ellenőrizd az e-mail fiókodat.";
            }
        }
        catch (error) {
            message.textContent = error.message;
        }
    });
}