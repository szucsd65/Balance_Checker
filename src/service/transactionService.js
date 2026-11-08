import { supabase } from "../config/supabase";

export async function getTransactions(userId) {
    const {data, error} = await supabase.from('transactions')
                    .select('id, type, amount, description, transaction_date, category_id, categories (id, name, color)')
                    .eq('user_id', userId)
                    .order('transaction_date', {ascending: false});
    
    if (error) {
        throw error
    }

    return data;
}

export async function addTransactions(transaction) {
    const {data, error} = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

    if (error) {
        throw error;
    }
    return data;
}

export async function updateTransactions(id, userId, transaction) {
    const {data, error} = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        throw error;
    }
    return data;
}

export async function deleteTransactions(id, userId) {
    const {error} = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        throw error;
    }
}