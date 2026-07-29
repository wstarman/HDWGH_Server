import { readFile } from "fs/promises";

export async function loadJson<T>(path: string): Promise<T> {
    try {
        const text = await readFile(path, "utf-8");
        return JSON.parse(text) as T;
    } catch (err) {
        throw new Error(`Failed to load JSON: ${path}\n${err}`);
    }
}