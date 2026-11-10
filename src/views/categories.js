import { supabase } from "../config/supabase.js";

import { getCategories, addCategory, updateCategory, deleteCategory } from "../service/categoryService.js";

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

export async function loadCategories(user) {
    const app = document.querySelector('#app');

    app.innerHTML = `
        <div class="dashboardLayout">
            <aside class="sidebar">
                <h2>Kiadáskezelő</h2>

                <nav>
                    <a href="#frontpage">Főoldal</a>
                    <a href="#transactions">Tranzakciók</a>
                    <a class="active" href="#categories">Kategóriák</a>
                    <a href="#budgets">Költségvetés</a>
                    <a href="#statistics">Statisztikák</a>
                </nav>

                <button id="logoutBtn" class="logoutBtn">
                    Kijelentkezés
                </button>
            </aside>

            <main class="dashboardMain">
                <header class="dashboardHeader">
                    <div>
                        <h1>Kategóriák</h1>
                        <p>Kategóriák kezelése</p>
                    </div>
                    <button id="addCategoriesBtn" class="addCategoriesBtn">
                        Új kategória
                    </button>
                </header>

                <section class="categoryGrid">
                    <div class="categorySection">
                        <h2>Bevételi kategóriák</h2>
                        <div id="incomeCategories"></div>
                    </div>

                    <div class="categorySection">
                        <h2>Kiadási kategóriák</h2>
                        <div id="expenseCategories"></div>
                    </div>
                </section>

                <section id="categoryFormContainer"
                         class="categoryFormContainer"
                         hidden>
                    <div class="categoryFormCard">
                        <h2 id="categoryFormTitle">Új kategória</h2>

                        <form id="categoryForm">
                            <label for="categoryName">Kategória neve</label>

                            <input
                                type="text"
                                id="categoryName"
                                maxlength="50"
                                placeholder="Például: Élelmiszer"
                                required
                            >

                            <label for="categoryType">Kategória típusa</label>

                            <select id="categoryType" required>
                                <option value="expense">Kiadás</option>
                                <option value="income">Bevétel</option>
                            </select>

                            <label for="categoryColor">Kategória színe</label>

                            <input
                                type="color"
                                id="categoryColor"
                                value="#16a34a"
                            >

                            <p id="categoryFormMessage"></p>

                            <div class="formActions">
                                <button type="submit"
                                        class="primaryBtn">
                                    Mentés
                                </button>

                                <button type="button"
                                        id="cancelCategory"
                                        class="secondaryBtn">
                                    Mégse
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                <p id="categoryMessage" role="status"></p>
            </main>
        </div>
    `;

    let categories = [];
    let editingId = null;

    const form = document.querySelector('#categoryForm');
    const formContainer = document.querySelector('#categoryFormContainer');
    const formMessage = document.querySelector('#categoryFormMessage');
    const message = document.querySelector('#categoryMessage');

    document.querySelector('#logoutBtn')
        .addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();

            if (error) {
                message.textContent = error.message;
            } else {
                window.location.hash = 'login';
            }
        });

    function renderCategories() {
        const incomeContainer =
            document.querySelector('#incomeCategories');

        const expenseContainer =
            document.querySelector('#expenseCategories');

        const incomeCategories = categories.filter(
            category => category.type === 'income'
        );

        const expenseCategories = categories.filter(
            category => category.type === 'expense'
        );

        function createCategoryList(items) {
            if (items.length === 0) {
                return '<p class="emptyCategories">Még nincsenek kategóriák.</p>';
            }

            return items.map(category => `
                <div class="categoryItem">
                    <div class="categoryDetails">
                        <span
                            class="categoryColor"
                            style="background-color: ${escapeHtml(category.color || '#64748b')}"
                        ></span>

                        <span class="categoryName">
                            ${escapeHtml(category.name)}
                        </span>
                    </div>

                    <div class="categoryActions">
                        <button
                            class="editCategoryBtn"
                            data-id="${category.id}"
                        >
                            Szerkesztés
                        </button>

                        <button
                            class="deleteCategoryBtn"
                            data-id="${category.id}"
                        >
                            Törlés
                        </button>
                    </div>
                </div>
            `).join('');
        }

        incomeContainer.innerHTML =
            createCategoryList(incomeCategories);

        expenseContainer.innerHTML =
            createCategoryList(expenseCategories);
    }

    async function refreshCategories() {
        try {
            categories = await getCategories(user.id);
            renderCategories();
        } catch (error) {
            message.textContent =
                'Hiba a kategóriák betöltésekor: ' + error.message;
        }
    }

    function openForm(category = null) {
        editingId = category?.id ?? null;

        form.reset();

        document.querySelector('#categoryFormTitle').textContent =
            editingId ? 'Kategória szerkesztése' : 'Új kategória';

        document.querySelector('#categoryName').value =
            category?.name || '';

        document.querySelector('#categoryType').value =
            category?.type || 'expense';

        document.querySelector('#categoryColor').value =
            category?.color || '#16a34a';

        formMessage.textContent = '';
        formContainer.hidden = false;

        formContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    function closeForm() {
        formContainer.hidden = true;
        form.reset();
        editingId = null;
    }

    document.querySelector('#addCategoriesBtn')
        .addEventListener('click', () => openForm());

    document.querySelector('#cancelCategory')
        .addEventListener('click', closeForm);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;

        try {
            const name = document.querySelector('#categoryName')
                .value.trim();

            const type = document.querySelector('#categoryType').value;

            const color = document.querySelector('#categoryColor').value;

            if (!name) {
                throw new Error('A kategória neve kötelező!');
            }

            const category = {
                name,
                type,
                color
            };

            if (editingId) {
                await updateCategory(
                    editingId,
                    user.id,
                    category
                );

                message.textContent = 'Kategória sikeresen módosítva!';
            } else {
                await addCategory({
                    ...category,
                    user_id: user.id
                });

                message.textContent = 'Kategória sikeresen létrehozva!';
            }

            closeForm();
            await refreshCategories();

        } catch (error) {
            formMessage.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });

    document.querySelector('.categoryGrid').addEventListener('click', async event => {
        const editButton = event.target.closest(
            '.editCategoryBtn'
        );

        const deleteButton = event.target.closest(
            '.deleteCategoryBtn'
        );

        if (editButton) {
            const category = categories.find(
                item => item.id === Number(editButton.dataset.id)
            );

            if (category) {
                openForm(category);
            }
        }

        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);

            if (!confirm('Biztosan törlöd?')) {
                return;
            }

            try {
                const deletedCategory = await deleteCategory(id, user.id);

                message.textContent = `${deletedCategory.name} kategória törölve!`

                await refreshCategories();
            }
            catch (error) {
                message.textContent = 'Hiba: ' + error.message;
            }
        }
    });

    await refreshCategories();
}