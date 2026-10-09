/**
 * How many in-app navigations happened since the page was first loaded. Zero means the visitor
 * landed on this page directly (a shared link, a search result), so "back" must not leave the site.
 */
let navigations = 0;

export function recordNavigation(): void {
    navigations += 1;
}

export function hasInAppHistory(): boolean {
    return navigations > 0;
}
