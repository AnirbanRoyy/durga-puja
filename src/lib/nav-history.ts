/**
 * In-app navigation memory, kept in module state so it survives route changes (but not a full
 * page load). Used by the back button to decide between "go back" and "go up".
 */
let navigations = 0;
let previous: string | null = null;

export function recordNavigation(from: string): void {
    navigations += 1;
    previous = from;
}

/** The page the visitor was on before this one, or null if they landed here directly. */
export function previousPath(): string | null {
    return navigations > 0 ? previous : null;
}
