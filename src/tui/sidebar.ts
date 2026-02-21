export interface CategoryData {
    id: string;
    name: string;
    subcategories: string[];
    icon: string;
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
    element: [38, 38, 38] as const,
    primaryBr: [252, 107, 131] as const,
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
            lines.push(`${fg(C.border)}│${term.reset}`);
            continue;
        }

        const item = items[itemIdx];
        if (!item) continue;

                        const isSelected = state.selectedIndex === itemIdx;
        const isActive = isItemActive(item, state.activeFilter, state.currentPromptPath);
        const isCursor = isSelected && state.focused;

        let bgStyle = '';
        if (isCursor) bgStyle = bg(C.element);
        else if (isActive) bgStyle = bg(C.selected);

        const cursorChar = isCursor ? `${fg(C.primary)}┃${term.reset}` : (isActive ? `${fg(C.dim)}┃${term.reset}` : ' ');

        let nameStr = '';
        let countStr = '';
        
        if (item.type === 'all') {
            const icon = '★';
            const nameColor = isActive ? fg(C.primaryBr) : fg(C.text);
            const nameBold = isActive ? term.bold : '';
            nameStr = `${icon} ${nameBold}${nameColor}All Prompts${term.reset}`;
            
            let tot = 0; let done = 0;
            for (const c of state.categories) { tot += c.total; done += c.completed; }
            countStr = `${done}/${tot}`;
        } else if (item.type === 'category') {
            const c = item.category;
            const icon = c.icon || '📁';
            const nameColor = isActive ? fg(C.primaryBr) : (isCursor ? fg(C.text) : fg(C.muted));
            const nameBold = isActive ? term.bold : '';
            nameStr = `${icon} ${nameBold}${nameColor}${c.name}${term.reset}`;
            countStr = `${c.completed}/${c.total}`;
        } else if (item.type === 'subcategory') {
            const nameColor = isActive ? fg(C.primaryBr) : (isCursor ? fg(C.text) : fg(C.muted));
            const nameBold = isActive ? term.bold : '';
            nameStr = `  ${fg(C.dim)}├${term.reset} ${nameBold}${nameColor}${item.subcategory}${term.reset}`;
        }

        const countFormatted = `${fg(C.dim)}${countStr.padStart(5)}${term.reset}`;
        
        // Emojis screw up string length (they count as 2 chars, and take 2 columns).
        // Let's use a standard pad to total 23 columns (since we have cursor + space = 2)
        const rawName = stripAnsi(nameStr);
        // JS string length for emojis is usually 2, which matches terminal width.
        const nameLen = rawName.length;
        
        // Target width: 25. Cursor=1, Space=1. Content area = 23.
        // Count needs 5 chars + 1 space padding at end = 6.
        // Name gets the rest: 23 - 6 = 17.
        const maxNameLen = 16;
        let finalNameStr = nameStr;
        let actualNameLen = nameLen;
        
        if (nameLen > maxNameLen) {
            actualNameLen = maxNameLen;
        }
        
        let padLen = 23 - actualNameLen - 6;
        if (padLen < 0) padLen = 0;
        
        let lineContent = '';
        if (item.type === 'subcategory') {
            const subPad = 23 - actualNameLen;
            lineContent = `${cursorChar} ${finalNameStr}${' '.repeat(Math.max(0, subPad))}`;
        } else {
            lineContent = `${cursorChar} ${finalNameStr}${' '.repeat(padLen)} ${countFormatted}`;
        }

        if (bgStyle) lineContent = lineContent.replaceAll(term.reset, term.reset + bgStyle);
        lineContent = bgStyle ? `${bgStyle}${lineContent}${term.reset}` : lineContent;

        if (i === 0 && showUp) {
            lineContent = lineContent.substring(0, lineContent.length - 20) + `${fg(C.primary)}▲${term.reset}`; 
        } else if (i === state.height - 1 && showDown) {
            lineContent = lineContent.substring(0, lineContent.length - 20) + `${fg(C.primary)}▼${term.reset}`; 
        }

        const borderChar = `${fg(C.border)}│${term.reset}`;
        lines.push(borderChar + lineContent);
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
