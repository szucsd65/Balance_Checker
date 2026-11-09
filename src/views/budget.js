import { supabase } from "../config/supabase.js";
import { getCategories } from "../service/categoryService.js";

import { getBudget, saveBudget, deleteBudget, getCategoryExpenses } from "../service/budgetService.js";
import { logout } from "../service/auth.js";

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function formatMoney(amount, currency = "HUF") {
    return new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency
    }).format(amount);
}

function getCurrentMonth() {
    const now = new Date();

    return `${now.getFullYear()} - ${String(now.getMonth() + 1).padStart(2,"0")}`;
}

export async function loadBudgets(user) {
    const app = document.querySelector("#app");

    let selectedMonth = getCurrentMonth();
    let categories = [];
    let budgets = [];
    let expenses = [];

    app.innerHTML = `
        <div class="budgetsPage">

            <header class="budgetsHeader">
                <div>
                    <h1>Költségkeretek</h1>
                    <p>Kövesd nyomon a havi kiadásaidat.</p>
                </div>

                <button id="logoutBtn" class="logoutBtn">
                    Kijelentkezés
                </button>
            </header>

            <section class="budgetFormContainer">
                <h2>Új költségkeret</h2>

                <form id="budgetForm">

                    <div class="budgetFormGroup">
                        <label for="budgetCategory">Kategória</label>
                        <select id="budgetCategory" required>
                            <option value="">Válassz kategóriát</option>
                        </select>
                    </div>

                    <div class="budgetFormGroup">
                        <label for="budgetAmount">Havi keret</label>
                        <input
                            type="number"
                            id="budgetAmount"
                            min="0.01"
                            step="0.01"
                            placeholder="Például: 50000"
                            required
                        >
                    </div>

                    <div class="budgetFormGroup">
                        <label for="budgetMonth">Hónap</label>
                        <input
                            type="month"
                            id="budgetMonth"
                            value="${selectedMonth}"
                            required
                        >
                    </div>

                    <button type="submit" class="primaryBtn">
                        Költségkeret mentése
                    </button>

                </form>

                <p id="budgetFormMessage"></p>
            </section>

            <section class="budgetOverview">

                <div class="budgetOverviewHeader">
                    <h2>Havi költségkeretek</h2>

                    <input
                        type="month"
                        id="overviewMonth"
                        value="${selectedMonth}"
                    >
                </div>

                <div id="budgetList" class="budgetList">
                    <p></p>
                </div>

            </section>

        </div>
    `;

    document.querySelector('#logoutBtn').addEventListener('click', logout);

    const form = document.querySelector('#budgetForm')
    const categorySelector = document.querySelector('#budgetCategory')
    const amountInput = document.querySelector('#budgetAmount')
    const monthInput = document.querySelector('#budgetMonth')
    const overviewMonth = document.querySelector('#overviewMonth')
    const message = document.querySelector('#budgetFormMessage')
    const budgetList = document.querySelector('#budgetList')

    async function loadData() {
        selectedMonth = overviewMonth.value;

        if (!selectedMonth) {
            return;
        }

        const monthDate = `${selectedMonth}-01`;

        try {
            [categories, budgets, expenses] = await Promise.all([
                getCategories(user.id),
                getBudget(user.id, monthDate),
                getCategoryExpenses(user.id, selectedMonth)
            ]);

            renderCategoryOptions();
            renderBudget();
        }
        catch (error) {
            console.error("Betöltési hiba: " + error);
            budgetList.innerHTML = "<p>Nem sikerült betölteni a költségkereteket.</p>"
        }
    }

    function renderCategoryOptions() {
        const usedCategoryIds = budgets.map(budget => 
            Number(budget.category_id)
        );

        const availableCategories = categories.filter(category =>
            category.type === "expense" &&
            !usedCategoryIds.includes(Number(category.id))
        );

        categorySelector.innerHTML = `
            <option value="">Válassz kategóriát</option>
            ${availableCategories.map(category => `
                <option value="${category.id}">
                    ${escapeHtml(category.name)}
                </option>
            `).join("")}
        `;
    }

    function renderBudget() {
        if (budgets.length === 0) {
            budgetList.innerHTML = `
                <p class="emptyBudgets">
                    Erre a hónapra még nincs beállított költségkereted.
                </p>
            `;
            return;
        }

        budgetList.innerHTML = budgets.map(budget => {
            const spent = Number(expenses[budget.category_id] || 0);
            const limit = Number(budget.amount);
            const remaining = limit - spent;

            const percentage = limit > 0
                ? Math.min((spent / limit) * 100, 100)
                : 0;

            const exceeded = spent > limit;

            return `
                <article class="budgetCard">

                    <div class="budgetCardHeader">
                        <div>
                            <h3>
                                ${escapeHtml(budget.categories?.name || "Törölt kategória")}
                            </h3>

                            <p>
                                Keret: ${formatMoney(limit)}
                            </p>
                        </div>

                        <button
                            class="deleteBudgetBtn"
                            data-id="${budget.id}"
                            type="button"
                        >
                            Törlés
                        </button>
                    </div>

                    <div class="budgetProgress">
                        <div
                            class="budgetProgressBar ${exceeded ? "overBudget" : ""}"
                            style="width: ${percentage}%"
                        ></div>
                    </div>

                    <div class="budgetCardDetails">
                        <span>
                            Elköltve: ${formatMoney(spent)}
                        </span>

                        <span class="${exceeded ? "negativeAmount" : "positiveAmount"}">
                            ${exceeded
                                ? `Túllépés: ${formatMoney(Math.abs(remaining))}`
                                : `Maradék: ${formatMoney(remaining)}`
                            }
                        </span>
                    </div>

                    <p class="budgetPercentage">
                        ${Math.round((spent / limit) * 100)}% felhasználva
                    </p>

                </article>
            `;
        }).join("");
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const categoryId = Number(categorySelector.value);
        const amount = Number(amountInput.value);
        const month = monthInput.value;

        if (!categoryId || !month || !Number.isFinite(amount) || amount <= 0) {
            message.textContent = "Helyesen add meg az adatokat.";
            return;
        }

        try {
            await saveBudget(
                user.id,
                categoryId,
                `${month}-01`,
                amount
            );

            message.textContent = "A keret sikeresen mentve.";

            amountInput.value = "";

            overviewMonth.value = month;
            await loadData();
        }
        catch (error) {
            console.error("Mentési hiba: " + error);
            message.textContent = "Nem sikerült elmenteni a költségkeretet.";
        }
    });

    overviewMonth.addEventListener("change", loadData);

    budgetList.addEventListener("click", async event =>{
        const deleteButton = event.target.closest(".deleteBudgetBtn");

        if (!deleteButton) {
            return;
        }

        const budgetId = Number(deleteButton.dataset.id);

        if (!confirm("Szeretnéd törölni a keretet?")) {
            return;
        }

        try {
            await deleteBudget(budgetId, user.id);
            await loadData();
        }
        catch (error) {
            console.error("Törlési hiba: " + error);
            alert("Nem sikerölt törölni a keretet.");
        }
    });

    await loadData();
}