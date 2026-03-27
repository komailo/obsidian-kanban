import { fromMarkdown } from 'mdast-util-from-markdown';
import { Root, ListItem } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { KanbanBoard, KanbanLane, KanbanCard } from './types';
import { parseYaml, stringifyYaml } from 'obsidian';

export class MarkdownParser {
    static parse(markdown: string): KanbanBoard {
        const tree: Root = fromMarkdown(markdown);

        const board: KanbanBoard = {
            title: '',
            lanes: [],
            settings: {}
        };

        // Extract frontmatter if present
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = markdown.match(frontmatterRegex);
        if (match && match[1]) {
            try {
                const yaml = parseYaml(match[1]);
                board.settings = {
                    lanes: yaml.lanes,
                    dateTrigger: yaml.dateTrigger,
                    dateFormat: yaml.dateFormat
                };
                if (yaml.title) board.title = yaml.title;
            } catch (e) {
                console.error("Error parsing kanban frontmatter", e);
            }
        }

        let currentLane: KanbanLane | null = null;

        for (const node of tree.children) {
            if (node.type === 'heading' && node.depth === 1 && !board.title) {
                board.title = toString(node);
                continue;
            }

            if (node.type === 'heading' && node.depth >= 2) {
                currentLane = {
                    id: Math.random().toString(36).substring(2, 11),
                    title: toString(node),
                    cards: []
                };
                board.lanes.push(currentLane);
                continue;
            }

            if (node.type === 'list' && currentLane) {
                for (const listItem of node.children) {
                    if (listItem.type === 'listItem') {
                        currentLane.cards.push(this.parseCard(listItem, markdown, board));
                    }
                }
            }
        }

        // Apply settings-defined lanes if we found any lanes in the file
        // Or if we have settings but no content yet
        if (board.settings?.lanes && board.lanes.length === 0) {
            board.lanes = board.settings.lanes.map(title => ({
                id: Math.random().toString(36).substring(2, 11),
                title,
                cards: []
            }));
        }

        return board;
    }

    private static parseCard(listItem: ListItem, rawMarkdown: string, board: KanbanBoard): KanbanCard {
        // Extract the exact substring from the raw markdown using position info
        let content = '';
        if (listItem.position && listItem.position.start && listItem.position.end) {
            content = rawMarkdown.substring(listItem.position.start.offset || 0, listItem.position.end.offset || 0);
        } else {
            content = toString(listItem);
        }

        // Strip the leading list marker (e.g., "- ", "* ", "1. ", or "- [ ] ")
        content = content.replace(/^[-*+]\s+/, '');
        content = content.replace(/^\d+\.\s+/, '');
        content = content.replace(/^\[[ xX/]\]\s*/, '');

        // Extract date
        const dateTrigger = board.settings?.dateTrigger || '@today'; // default if not in frontmatter
        
        // Escape dateTrigger for regex
        const escapedTrigger = dateTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Simple regex for YYYY-MM-DD or [[YYYY-MM-DD]]
        const dateRegex = new RegExp(`${escapedTrigger}(\\d{4}-\\d{2}-\\d{2})|${escapedTrigger}\\[\\[(\\d{4}-\\d{2}-\\d{2})\\]\\]`, 'g');
        
        let date: string | undefined = undefined;
        content = content.replace(dateRegex, (match, p1, p2) => {
            date = p1 || p2;
            return '';
        }).trim();

        // Re-align indentation for inner elements
        const lines = content.split('\n');
        if (lines.length > 1) {
            // Find the minimum indentation of the subsequent lines
            let minIndent: number | null = null;
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line === undefined || line.trim() === '') continue;
                const match = line.match(/^\s+/);
                const indent = match ? match[0].length : 0;
                if (minIndent === null || indent < minIndent) {
                    minIndent = indent;
                }
            }
            if (minIndent !== null && minIndent > 0) {
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (line !== undefined && line.length >= minIndent) {
                        lines[i] = line.substring(minIndent);
                    }
                }
            }
            content = lines.join('\n');
        }

        return {
            id: Math.random().toString(36).substring(2, 11),
            content: content.trimEnd(),
            date: date
        };
    }

    static stringify(board: KanbanBoard): string {
        let markdown = '---\n';
        const yaml: Record<string, unknown> = {};
        if (board.title) yaml.title = board.title;
        if (board.lanes.length > 0) {
            yaml.lanes = board.lanes.map(l => l.title);
        }
        if (board.settings?.dateTrigger) yaml.dateTrigger = board.settings.dateTrigger;
        if (board.settings?.dateFormat) yaml.dateFormat = board.settings.dateFormat;
        
        markdown += stringifyYaml(yaml);
        markdown += '---\n\n';

        if (board.title) {
            markdown += `# ${board.title}\n\n`;
        }

        const dateTrigger = board.settings?.dateTrigger || '@today';

        for (const lane of board.lanes) {
            markdown += `## ${lane.title}\n\n`;
            for (const card of lane.cards) {
                let cardContent = card.content;
                if (card.date) {
                    const firstLine = cardContent.split('\n')[0];
                    const rest = cardContent.split('\n').slice(1).join('\n');
                    cardContent = firstLine + ` ${dateTrigger}${card.date}` + (rest ? '\n' + rest : '');
                }

                const cardLines = cardContent.split('\n');
                if (cardLines.length === 1) {
                    markdown += `- ${cardLines[0]}\n`;
                } else {
                    markdown += `- ${cardLines[0]}\n`;
                    for (let i = 1; i < cardLines.length; i++) {
                        markdown += `  ${cardLines[i]}\n`;
                    }
                }
            }
            markdown += '\n';
        }

        return markdown;
    }
}
