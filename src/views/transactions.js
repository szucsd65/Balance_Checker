import { supabase } from "../config/supabase.js";

import { getTransactions, addTransactions, updateTransactions, deleteTransactions } from "../service/transactionService.js";

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export async function loadTransactions(user) {
    const app = document.querySelector('#app');

    app.innerHTML = `
        <div class="dashboardLayout">
            <aside>
                <h2>Balance_Checker</h2>

                <nav>
                    <a href="#frontpage">Főoldal</a>
                    <a class="active" href="#transactions">Tranzakciók</a>
                    <a href="#categories">Kategóriák</a>
                    <a href="#budgets">Költségvetés</a>
                    <a href="#statistics">Statisztikák</a>
                    <a href="#profile">Profil</a>
                </nav>

                <button id="logoutBtn" class="logoutBtn">
                    Kijelentkezés
                </button>
            </aside>

            <main class="dashboardMain">
                <header class="dashboardHeader">
                    <div>
                        <h1>Tranzakciók</h1>
                        <p>Pénzügyek kezelése</p>
                    </div>
                    <button id="addTransactionsBtn" class="addTransactionsBtn">
                        Új tranzakció
                    </button>
                </header>

                <section class="transactionSection">
                    <div class="transactionHeader">
                        <h2>Összes tranzakció</h2>
                    </div>

                    <div class="transactionFilter">
                        <input type="search" id="transactionSearch" placeholder="Keresés">

                        <select id="filterType">
                            <option value="all">Összes típus</option>
                            <option value="income">Bevételek</option>
                            <option value="expenses">Kiadások</option>
                        </select>
                    </div>

                    <p id="transactionMessage" role="status"></p>

                    <div class="tableWrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Leírás</th>
                                    <th>Kategória</th>
                                    <th>Dátum</th>
                                    <th>Típus</th>
                                    <th>Összeg</th>
                                    <th>Műveletek</th>
                                </tr>
                            </thead>

                            <tbody id="transactionsList">
                                <tr>
                                    <td colspan="6"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section id="transactionFormContainer" class="transactionFormContainer" hidden>
                    <div class="TransactionFormCard">
                        <h2 id="formTitle">Új tranzakció</h2>

                        <form id="transactionForm">
                            <label for="transactionType">Típus</label>
                            <select id="transactionType" required>
                                <option value="expense">Kiadás</option>
                                <option value="income">Bevétel</option>
                            </select>

                            <label for="transactionAmount">Összeg (HUF)</label>
                            <input type="number" id="transactionAmount" min="0.01" max="99999999.99" step="0.01" required>

                            <label for="transactionDescription">Leírás</label>
                            <input type="text" id="transactionDescription" maxlength="200" placeholder="Leírás">

                            <label for="transactionCategory">Kategória</label>
                            <select id="transactionCategory">
                                <option value="">Nincs kategória</option>
                            </select>

                            <label for="transactionDate">Dátum</label>
                            <input type="date" id="transactionDate" value="${getToday()}" required>

                            <p id="formMessage" role="alert"></p>

                            <div class="formActions">
                                <button type="submit" class="primaryBtn">
                                    Mentés
                                </button>

                                <button type="button" id="cancelTransaction" class="secondaryBtn">
                                    Mégse
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    `;
}