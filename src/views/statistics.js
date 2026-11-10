import { supabase } from "../config/supabase.js"
import { logout } from "../service/auth.js"
import Chart from "chart.js/auto";

function formatMoney(amount, currency = "HUF") {
    return new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency: currency
    }).format(amount);
}

function getCurrentMonth() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}`;
}

export async function loadStatistics(user) {
    const app = document.querySelector("#app");

    let incomeChart = null;
    let categoryChart = null;

    app.innerHTML = `
        <div class="statisticsPage">

            <header class="statisticsHeader">
                <div>
                    <h1>Statisztikák</h1>
                    <p>Tekintsd át a pénzügyeid alakulását.</p>
                </div>

                <button id="logoutBtn" class="logoutBtn">
                    Kijelentkezés
                </button>
            </header>

            <section class="statisticsFilter">
                <label for="statisticsMonth">Vizsgált hónap</label>
                <input
                    type="month"
                    id="statisticsMonth"
                    value="${getCurrentMonth()}"
                >
            </section>

            <section class="statisticsSummary">

                <article class="statisticsCard">
                    <h3>Bevételek</h3>
                    <p id="statisticsIncome">Betöltés...</p>
                </article>

                <article class="statisticsCard">
                    <h3>Kiadások</h3>
                    <p id="statisticsExpenses">Betöltés...</p>
                </article>

                <article class="statisticsCard">
                    <h3>Egyenleg</h3>
                    <p id="statisticsBalance">Betöltés...</p>
                </article>

            </section>

            <section class="statisticsCharts">

                <article class="statisticsChartCard">
                    <h2>Bevételek és kiadások</h2>
                    <div class="chartContainer">
                        <canvas id="incomeExpenseChart"></canvas>
                    </div>
                </article>

                <article class="statisticsChartCard">
                    <h2>Kiadások kategóriánként</h2>
                    <div class="chartContainer">
                        <canvas id="categoryExpenseChart"></canvas>
                    </div>
                </article>

            </section>

            <p id="statisticsMessage"></p>

        </div>
    `;

    document.querySelector("#logoutBtn").addEventListener("click", logout);

    const monthInput = document.querySelector("#statisticsMonth");
    const incomeElement = document.querySelector("#statisticsIncome");
    const expenseElement = document.querySelector("#statisticsExpenses");
    const balanceElement = document.querySelector("#statisticsBalance");
    const messageElement = document.querySelector("#statisticsMessage");

    async function loadStatistics() {
        const selectedMonth = monthInput.value;

        if (!selectedMonth) {
            return;
        }

        const [year, month] = selectedMonth.split("-").map(Number);

        const startDate = `${selectedMonth}-01`;

        const nextMonth = new Date(year, month, 1);

        const endDate = [
            nextMonth.getFullYear(),
            String(nextMonth.getMonth() + 1).padStart(2, "0"),
            "01"
        ].join("-");

        messageElement.textContent = "";

        try {
            const {data, error} = await supabase
                .from("transactions")
                .select(`
                    amount,
                    type,
                    transaction_date,
                    categories (
                        name,
                        color
                    )    
                `)
                .eq("user_id", user.id)
                .gte("transaction_date", startDate)
                .lt("transaction_date", endDate)
                .order("transaction_date", { ascending: true });

            if (error) {
                throw error;
            }

            const transactions = data || [];

            const income = transactions
                .filter(item => item.type === "income")
                .reduce((sum, item) => sum + Number(item.amount), 0);

            const expenses = transactions
                .filter(item => item.type === "expense")
                .reduce((sum, item) => sum + Number(item.amount), 0);

            const balance = income - expenses;

            incomeElement.textContent = formatMoney(income);
            expenseElement.textContent = formatMoney(expenses);
            balanceElement.textContent = formatMoney(balance);

            balanceElement.className = balance >= 0 ? "positiveAmount" : "negativeAmount";

            renderIncomeExpenseChart(transactions, year, month);
            renderCategoryChart(transactions);

            messageElement.textContent = transactions.length === 0 ? "Ebben a hónapban nincs tranzakció." : "";
        }
        catch (error) {
            console.error("STATISTICS ERROR:", error);
            console.error("ERROR DETAILS:", JSON.stringify(error, null, 2));

            messageElement.textContent =
                error.message || "Nem sikerült betölteni.";
        }
    }

    function renderIncomeExpenseChart(transactions, year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();

        const labels = Array.from(
            { length: daysInMonth },
            (_, index) => `${index + 1}.`
        );

        const dailyIncome = Array(daysInMonth).fill(0);
        const dailyExpenses = Array(daysInMonth).fill(0);

        transactions.forEach(transaction => {
            const day = Number(
                transaction.transaction_date.split("-")[2]
            );

            if (transaction.type === "income") {
                dailyIncome[day - 1] += Number(transaction.amount);
            }

            if (transaction.type === "expense") {
                dailyExpenses[day - 1] += Number(transaction.amount);
            }
        });

        if (incomeChart) {
            incomeChart.destroy();
        }

        incomeChart = new Chart(
            document.querySelector("#incomeExpenseChart"),
            {
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Bevétel",
                            data: dailyIncome,
                            backgroundColor: "#35a66b"
                        },
                        {
                            label: "Kiadás",
                            data: dailyExpenses,
                            backgroundColor: "#e45b5b"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom"
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );
    }

    function renderCategoryChart(transactions) {
        const categoryTotals = {};

        transactions
            .filter(transaction => transaction.type === "expense")
            .forEach(transaction => {
                const category = transaction.categories;
                const categoryName = category?.name || "Kategória nélkül";

                if (!categoryTotals[categoryName]) {
                    categoryTotals[categoryName] = {
                        amount: 0,
                        color: category?.color || "#999999"
                    };
                }

                categoryTotals[categoryName].amount +=
                    Number(transaction.amount);
            });

        const entries = Object.entries(categoryTotals);

        if (categoryChart) {
            categoryChart.destroy();
        }

        const canvas = document.querySelector("#categoryExpenseChart");

        if (entries.length === 0) {
            categoryChart = new Chart(canvas, {
                type: "doughnut",
                data: {
                    labels: ["Nincs kiadás"],
                    datasets: [{
                        data: [1],
                        backgroundColor: ["#dddddd"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom"
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });

            return;
        }

        categoryChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: entries.map(([name]) => name),
                datasets: [{
                    data: entries.map(([, value]) => value.amount),
                    backgroundColor: entries.map(
                        ([, value]) => value.color
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }

    monthInput.addEventListener("change", loadStatistics);

    await loadStatistics();
}