import {supabase} from '../config/supabase.js'

export async function getCategories(userId) {
    const {data, error} = await supabase.from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', {ascending: true});

    if (error) {
        throw error;
    }

    return data;
}

export async function addCategory(category) {
    const {data, error} = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function updateCategory(id, userId, category) {
    const {data, error} = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function deleteCategory(id, userId) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        throw error;
    }
}