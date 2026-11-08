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
                            <option value="expense">Kiadások</option>
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
    
    let transactions = [];
    let editingId = null;

    const tbody = document.querySelector('#transactionsList');
    const formContainer = document.querySelector('#transactionFormContainer');
    const form = document.querySelector('#transactionForm');
    const formMessage = document.querySelector('#formMessage');
    const message = document.querySelector('#transactionMessage');

    document.querySelector('#logoutBtn').addEventListener('click', async () => {
        const {error} = await supabase.auth.signOut();

        if (error) {
            message.textContent = error.message;
        }
        else {
            window.location.hash = 'login';
        }
    });

    async function loadCategories(selectedId = '') {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', user.id)
            .order('name');

        if (error) throw error;

        const categorySelect =
            document.querySelector('#transactionCategory');

        categorySelect.innerHTML = `
            <option value="">Nincs kategória</option>
            ${(data || []).map(category => `
                <option
                    value="${category.id}"
                    data-type="${category.type}"
                >
                    ${escapeHtml(category.name)}
                </option>
            `).join('')}
        `;

        categorySelect.value = selectedId || '';
    }

    function renderTransactions() {
        const search = document.querySelector('#transactionSearch')
            .value.toLowerCase();

        const filter = document.querySelector('#filterType').value;

        const filtered = transactions.filter(transaction => {
            const matchesSearch =
                (transaction.description || '')
                    .toLowerCase()
                    .includes(search);

            const matchesType =
                filter === 'all' || transaction.type === filter;

            return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">Nem található tranzakció.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(transaction => `
            <tr>
                <td>${escapeHtml(transaction.description || 'Nincs leírás')}</td>
                <td>${escapeHtml(transaction.categories?.name || 'Nincs kategória')}</td>
                <td>${escapeHtml(transaction.transaction_date)}</td>
                <td>
                    <span class="${transaction.type}">
                        ${transaction.type === 'income' ? 'Bevétel' : 'Kiadás'}
                    </span>
                </td>
                <td class="${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}
                    ${Number(transaction.amount).toFixed(2)}
                </td>
                <td>
                    <button
                        class="editBtn"
                        data-id="${transaction.id}"
                    >Szerkesztés</button>

                    <button
                        class="deleteBtn"
                        data-id="${transaction.id}"
                    >Törlés</button>
                </td>
            </tr>
        `).join('');
    }

    async function refreshTransactions() {
        try {
            transactions = await getTransactions(user.id);
            renderTransactions();
        } catch (error) {
            message.textContent =
                'Hiba a tranzakciók betöltésekor: ' + error.message;
        }
    }

    function openForm(transaction = null) {
        editingId = transaction?.id ?? null;

        form.reset();

        document.querySelector('#formTitle').textContent =
            editingId ? 'Tranzakció szerkesztése' : 'Új tranzakció';

        document.querySelector('#transactionType').value =
            transaction?.type || 'expense';

        document.querySelector('#transactionAmount').value =
            transaction?.amount ?? '';

        document.querySelector('#transactionDescription').value =
            transaction?.description ?? '';

        document.querySelector('#transactionDate').value =
            transaction?.transaction_date || getToday();

        formMessage.textContent = '';

        loadCategories(transaction?.category_id)
            .then(() => {
                formContainer.hidden = false;
                formContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            })
            .catch(error => {
                formMessage.textContent = error.message;
                formContainer.hidden = false;
        });
    }

    function closeForm() {
        formContainer.hidden = true;
        form.reset();
        editingId = null;
    }

     document.querySelector('#addTransactionsBtn')
        .addEventListener('click', () => openForm());

    document.querySelector('#cancelTransaction')
        .addEventListener('click', closeForm);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        formMessage.textContent = '';

        try {
            const type = document.querySelector('#transactionType').value;
            const amount = Number(
                document.querySelector('#transactionAmount').value
            );

            const description = document.querySelector(
                '#transactionDescription'
            ).value.trim();

            const categoryId = document.querySelector(
                '#transactionCategory'
            ).value;

            const transactionDate = document.querySelector(
                '#transactionDate'
            ).value;

            if (!Number.isFinite(amount) || amount <= 0) {
                throw new Error('Adj meg érvényes összeget!');
            }

            const selectedCategory = categoryId
                ? document.querySelector(
                    '#transactionCategory option:checked'
                  )
                : null;

            if (
                selectedCategory &&
                selectedCategory.dataset.type !== type
            ) {
                throw new Error(
                    'A kategória típusa nem egyezik a tranzakció típusával!'
                );
            }

            const transaction = {
                user_id: user.id,
                type,
                amount,
                description,
                category_id: categoryId ? Number(categoryId) : null,
                transaction_date: transactionDate
            };

            if (editingId) {
                await updateTransactions(
                    editingId,
                    user.id,
                    transaction
                );
            } else {
                await addTransactions(transaction);
            }

            closeForm();
            message.textContent = 'A tranzakció sikeresen mentve!';

            await refreshTransactions();

        } catch (error) {
            formMessage.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });

    tbody.addEventListener('click', async event => {
        const editButton = event.target.closest('.editBtn');
        const deleteButton = event.target.closest('.deleteBtn');

        if (editButton) {
            const transaction = transactions.find(
                t => t.id === Number(editButton.dataset.id)
            );

            if (transaction) {
                openForm(transaction);
            }
        }

        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);

            if (!confirm('Biztosan törölni szeretnéd ezt a tranzakciót?')) {
                return;
            }

            try {
                await deleteTransactions(id, user.id);

                message.textContent = 'A tranzakció törölve lett.';

                await refreshTransactions();

            } catch (error) {
                message.textContent =
                    'Törlési hiba: ' + error.message;
            }
        }
    });

    document.querySelector('#transactionSearch')
        .addEventListener('input', renderTransactions);

    document.querySelector('#filterType')
        .addEventListener('change', renderTransactions);

    await refreshTransactions();
}