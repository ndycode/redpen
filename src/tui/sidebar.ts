export interface CategoryData {
    id: string;
    name: string;
    subcategories: string[];
    completed: number;
    total: number;
}

export interface SidebarFilter {
    categoryId: string | null;
    subcategory: string | null;
}

export interface SidebarState {
    focused: boolean;
    selectedIndex: number;
    expandedCategories: string[];
    activeFilter: SidebarFilter;
    scrollTop: number;
    height: number;
    categories: CategoryData[];
    currentPromptPath: string | null;
}

export type SidebarItem =
    | { type: 'all' }
    | { type: 'category'; category: CategoryData; index: number }
    | { type: 'subcategory'; categoryId: string; subcategory: string; index: number };

const ESC = '\x1b';
const CSI = `${ESC}[`;

export const term = {
    bold: `${CSI}1m`,
    reset: `${CSI}0m`,
    fg: (r: number, g: number, b: number) => `${CSI}38;2;${r};${g};${b}m`,
    bg: (r: number, g: number, b: number) => `${CSI}48;2;${r};${g};${b}m`,
};

export const C = {
    selected: [50, 35, 40] as const,
    border: [50, 50, 50] as const,
    text: [228, 228, 228] as const,
    muted: [140, 140, 140] as const,
    dim: [90, 90, 90] as const,
    primary: [227, 70, 113] as const,
    green: [63, 162, 102] as const,
    yellow: [241, 180, 103] as const,
};

export const fg = (c: readonly [number, number, number]) => term.fg(c[0], c[1], c[2]);
export const bg = (c: readonly [number, number, number]) => term.bg(c[0], c[1], c[2]);

export function stripAnsi(str: string): string {
    return str.replace(new RegExp('\\x1b\\[[0-9;]*m', 'g'), '');
}

export function getVisibleItems(state: SidebarState): SidebarItem[] {
    const items: SidebarItem[] = [{ type: 'all' }];
    let index = 1;
    for (const cat of state.categories) {
        if (cat.total === 0) continue;
        items.push({ type: 'category', category: cat, index: index++ });
        if (state.expandedCategories.includes(cat.id)) {
            for (const sub of cat.subcategories) {
                items.push({ type: 'subcategory', categoryId: cat.id, subcategory: sub, index: index++ });
            }
        }
    }
    return items;
}

export function isItemActive(
    item: SidebarItem,
    activeFilter: SidebarFilter,
    currentPromptPath: string | null
): boolean {
    if (item.type === 'all') {
        return activeFilter.categoryId === null && activeFilter.subcategory === null;
    }

    const isFilter =
        item.type === 'category'
            ? activeFilter.categoryId === item.category.id && activeFilter.subcategory === null
            : item.type === 'subcategory'
              ? activeFilter.categoryId === item.categoryId && activeFilter.subcategory === item.subcategory
              : false;

    let isCurrent = false;
    if (currentPromptPath) {
        if (item.type === 'category') {
            isCurrent = currentPromptPath.startsWith(item.category.id + '/');
        } else if (item.type === 'subcategory') {
            isCurrent = currentPromptPath.startsWith(item.categoryId + '/' + item.subcategory + '/');
        }
    }

    return isFilter || isCurrent;
}

export function renderSidebar(state: SidebarState): string[] {
    const lines: string[] = [];
    const items = getVisibleItems(state);

    let startIdx = state.scrollTop;
    if (state.selectedIndex < startIdx) {
        startIdx = state.selectedIndex;
    } else if (state.selectedIndex >= startIdx + state.height) {
        startIdx = state.selectedIndex - state.height + 1;
    }

    const showUp = startIdx > 0;
    const showDown = startIdx + state.height < items.length;

    for (let i = 0; i < state.height; i++) {
        const itemIdx = startIdx + i;
        if (itemIdx >= items.length) {
            lines.push(' '.repeat(25) + `${fg(C.border)}│${term.reset}`);
            continue;
        }

        const item = items[itemIdx];
        if (!item) continue;

        const isSelected = state.selectedIndex === itemIdx;
        const isActive = isItemActive(item, state.activeFilter, state.currentPromptPath);

        let prefix = ' ';
        if (isSelected && state.focused) prefix = `${fg(C.primary)}▸${term.reset}`;
        else if (isSelected && !state.focused) prefix = `${fg(C.dim)}▸${term.reset}`;

        let bgStyle = '';
        if (isActive) bgStyle = bg(C.selected);

        let label = '';
        if (item.type === 'all') {
            const star = `${isActive ? term.bold : ''}★${term.reset}`;
            const name = `${isActive ? term.bold : ''}All Prompts${term.reset}`;
            label = `${prefix} ${star} ${name}`;
        } else if (item.type === 'category') {
            const isExpanded = state.expandedCategories.includes(item.category.id);
            const toggleIcon = item.category.subcategories.length > 0 ? (isExpanded ? '▼' : '▸') : ' ';
            const toggleStr = `${fg(C.muted)}${toggleIcon}${term.reset}`;

            const nameBold = isActive ? term.bold : '';
            const nameColor = fg(C.text);
            const countsStr = `(${item.category.completed}/${item.category.total})`;

            label = `${prefix} ${toggleStr} ${nameBold}${nameColor}${item.category.name}${term.reset} ${fg(C.dim)}${countsStr}${term.reset}`;
        } else if (item.type === 'subcategory') {
            const nameBold = isActive ? term.bold : '';
            const nameColor = fg(C.text);
            label = `  ${prefix} ${fg(C.dim)}├${term.reset} ${nameBold}${nameColor}${item.subcategory}${term.reset}`;
        }

        const stripped = stripAnsi(label);
        const len = stripped.length;

        let padLen = 25 - len;

        let lineContent = '';
        if (i === 0 && showUp) {
            padLen = padLen > 1 ? padLen - 1 : 0;
            const pad = ' '.repeat(padLen);
            const indicator = `${fg(C.primary)}▲${term.reset}`;
            lineContent = bgStyle ? `${bgStyle}${label}${pad}${indicator}${term.reset}` : `${label}${pad}${indicator}`;
        } else if (i === state.height - 1 && showDown) {
            padLen = padLen > 1 ? padLen - 1 : 0;
            const pad = ' '.repeat(padLen);
            const indicator = `${fg(C.primary)}▼${term.reset}`;
            lineContent = bgStyle ? `${bgStyle}${label}${pad}${indicator}${term.reset}` : `${label}${pad}${indicator}`;
        } else {
            const pad = padLen > 0 ? ' '.repeat(padLen) : '';
            lineContent = bgStyle ? `${bgStyle}${label}${pad}${term.reset}` : `${label}${pad}`;
        }

        const borderChar = `${fg(C.border)}│${term.reset}`;
        lines.push(lineContent + borderChar);
    }

    return lines;
}

export function handleSidebarKey(key: string, state: SidebarState): SidebarState {
    if (key === 'Tab' || key === '\t') {
        return { ...state, focused: !state.focused };
    }

    if (!state.focused) {
        return state;
    }

    const items = getVisibleItems(state);
    let { selectedIndex, expandedCategories, activeFilter, scrollTop } = state;

    if (key === 'j' || key === 'ArrowDown' || key === '\x1b[B' || key === '\x1bOB') {
        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
    } else if (key === 'k' || key === 'ArrowUp' || key === '\x1b[A' || key === '\x1bOA') {
        selectedIndex = Math.max(0, selectedIndex - 1);
    } else if (key === ' ' || key === 'Enter' || key === '\r' || key === '\n') {
        const item = items[selectedIndex];
        if (item) {
            if (item.type === 'all') {
                activeFilter = { categoryId: null, subcategory: null };
            } else if (item.type === 'category') {
                const categoryItem = item;
                const isExpanded = expandedCategories.includes(categoryItem.category.id);
                if (key === ' ' || categoryItem.category.subcategories.length === 0) {
                    if (categoryItem.category.subcategories.length > 0) {
                        if (isExpanded) {
                            expandedCategories = expandedCategories.filter((id) => id !== categoryItem.category.id);
                        } else {
                            expandedCategories = [...expandedCategories, categoryItem.category.id];
                        }
                    }
                } else if (key === 'Enter' || key === '\r' || key === '\n') {
                    if (!isExpanded) {
                        expandedCategories = [...expandedCategories, categoryItem.category.id];
                    }
                }

                if (key === 'Enter' || key === '\r' || key === '\n') {
                    activeFilter = { categoryId: categoryItem.category.id, subcategory: null };
                }
            } else if (item.type === 'subcategory') {
                const subItem = item;
                if (key === 'Enter' || key === '\r' || key === '\n' || key === ' ') {
                    activeFilter = { categoryId: subItem.categoryId, subcategory: subItem.subcategory };
                }
            }
        }
    }

    if (selectedIndex < scrollTop) {
        scrollTop = selectedIndex;
    } else if (selectedIndex >= scrollTop + state.height) {
        scrollTop = selectedIndex - state.height + 1;
    }

    return {
        ...state,
        selectedIndex,
        expandedCategories,
        activeFilter,
        scrollTop,
    };
}
