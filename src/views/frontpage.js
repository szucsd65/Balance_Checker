import { supabase } from "../config/supabase.js";
import { logout } from "../service/auth.js";

export async function loadPage(user) {
    const app = document.querySelector('#app');

    app.innerHTML = `
        <div class="frontpageLayout">
            <aside class="sidebar">
                <h2>Balance_Checker</h2>

                <nav>
                    <a class="active" href="#frontpage">Főoldal</a>
                    <a href="#transactions">Tranzakciók</a>
                    <a href="#categories">Kategóriák</a>
                    <a href="#budgets">Költségvetés</a>
                    <a href="#statistics">Statisztikák</a>
                    <a href="#profile">Profil</a>
                </nav>

                <button id="logoutBtn" class="logoutBtn">
                    Kijelentkezés
                </button>
            </aside>

            <main class="frontPageMain">
                <header class="frontPageHeader">
                    <div>
                        <h1>Főoldal</h1>
                        <p>Áttekintés</p>
                    </div>
                    <div class="userInfo">
                        ${escapeHtml(user.email)}
                    </div>
                </header>

                <section class="summaryTable">
                    <div class="summaryCard">
                        <span>Havi egyenleg</span>
                        <h2 id="balance"></h2>
                    </div>

                    <div class="summaryCardIncome">
                        <span>Havi bevétel</span>
                        <h2 id="income"></h2>
                    </div>

                    <div class="summaryCardExpense">
                        <span>Havi kiadás</span>
                        <h2 id="expense"></h2>
                    </div>

                    <div class="summaryCard">
                        <span>Megtakarítás</span>
                        <h2 id="savings"></h2>
                    </div>
                </section>

                <section class="transaction">
                    <div class="transactionHeader">
                        <h2>Legutóbbi tranzakciók</h2>
                    </div>

                    <div class="table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Leírás</th>
                                    <th>Dátum</th>
                                    <th>Típus</th>
                                    <th>Összeg</th>
                                </tr>
                            </thead>
                            <tbody id="transactionList">
                                <tr>
                                    <td colspan="4"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                <p id="frontpageMessage"></p>
            </main>
        </div>
    `;

    document.querySelector('#logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.hash = 'login';
        }
        catch (error) {
            alert('Hiba: ' + error.message);
        }
    });
    await loadPageData(user.id);
}

async function loadPageData(userId) {
    const now = new Date();

    const firstDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    ).toLocaleDateString('en-CA');

    const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
    ).toLocaleDateString('en-CA');

    const {data, error} = await supabase.from('transactions')
            .select('id, amount, type, description, transaction_date')
            .eq('user_id', userId)
            .gte('transaction_date', firstDay)
            .lte('transaction_date', lastDay)
            .order('transaction_date', {ascending: false});

    if (error) {
        document.querySelector('#frontpageMessage').textContent = 'Adatokat nem lehetett betölteni: ' + error.message;
        return;
    }

    const transactions = data || [];

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = income - expense;

    const saving = income > 0 ? ((balance / income) * 100) : 0;

    const currency = new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF'
    });

    document.querySelector('#balance').textContent = currency.format(balance);
    document.querySelector('#income').textContent = currency.format(income);
    document.querySelector('#expense').textContent = currency.format(expense);
    document.querySelector('#savings').textContent = saving.toFixed(1) + '%';

    const tbody = document.querySelector('#transactionList');

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">Még nincsenek tranzakciók.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.slice(0,10).map(t => `
        <tr>
            <td>${escapeHtml(t.description || 'Nincs leírás')}</td>
            <td>${escapeHtml(t.transaction_date)}</td>
            <td>
                <span class="${t.type}">
                    ${t.type === 'bevétel' ? 'Bevétel' : 'Kiadás'}
                </span>
            </td>
            <td class="${t.type}">
                ${t.type === 'bevétel' ? '+' : '-'}
                ${currency.format(Number(t.amount))}
            </td>
        </tr>
    `).join('');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}