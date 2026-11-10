import { supabase } from "../config/supabase.js";

export async function getBudget(userId, month) {
    const {data, error} = await supabase
        .from("budgets")
        .select(`
            *,
            categories (
                id,
                name,
                color,
                type
            )            
        `)
        .eq("user_id", userId)
        .eq("month", month)
        .order("id", {ascending: true});

    if (error) {
        throw error;
    }

    return data;
}

export async function saveBudget(userId, categoryId, month, amount) {
    const { data: existing, error: searchError } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", userId)
        .eq("category_id", categoryId)
        .eq("month", month)
        .maybeSingle();

    if (searchError) {
        throw searchError;
    }

    let result;

    if (existing) {
        result = await supabase
            .from("budgets")
            .update({ amount })
            .eq("id", existing.id)
            .eq("user_id", userId)
            .select()
            .single();
    }
    else {
        result = await supabase
            .from("budgets")
            .insert({
                user_id: userId,
                category_id: categoryId,
                month,
                amount
            })
            .select()
            .single();
    }

    if (result.error) {
        throw result.error;
    }

    return result.data;
}

export async function deleteBudget(id, userId) {
    const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
        throw error;
    }
}

export async function getCategoryExpenses(userId, month) {
    const startDate = `${month}-01`;

    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = new Date(year, monthNumber, 1);
    const endDate = [
        nextMonth.getFullYear(),
        String(nextMonth.getMonth() + 1).padStart(2, "0"),
        "01"
    ].join("-");

    const {data, error} = await supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("transaction_date", startDate.slice(0, 10))
        .lt("transaction_date", endDate);

    if (error) {
        throw error;
    }

    const expenses = {};

    data.forEach(transactions => {
        const categoryId = transactions.category_id;

        expenses[categoryId] = (expenses[categoryId] || 0) + Number(transactions.amount);
    });

    return expenses;
}