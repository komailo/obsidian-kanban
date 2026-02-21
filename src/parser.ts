import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTaskListItemFromMarkdown } from 'mdast-util-gfm-task-list-item';
import { gfmTaskListItem } from 'micromark-extension-gfm-task-list-item';
import { Root, ListItem } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { KanbanBoard, KanbanLane, KanbanCard } from './types';
import { parseYaml, stringifyYaml } from 'obsidian';

export class MarkdownParser {
    static parse(markdown: string): KanbanBoard {
        const tree: Root = fromMarkdown(markdown, {
            extensions: [gfmTaskListItem()],
            mdastExtensions: [gfmTaskListItemFromMarkdown()]
        });
        
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
                    lanes: yaml.lanes
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
                        currentLane.cards.push(this.parseCard(listItem));
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

    private static parseCard(listItem: ListItem): KanbanCard {
        const completed = listItem.checked === true;
        const content = toString(listItem);

        return {
            id: Math.random().toString(36).substring(2, 11),
            content,
            completed
        };
    }

    static stringify(board: KanbanBoard): string {
        let markdown = '---\n';
        const yaml: any = {};
        if (board.title) yaml.title = board.title;
        if (board.lanes.length > 0) {
            yaml.lanes = board.lanes.map(l => l.title);
        }
        markdown += stringifyYaml(yaml);
        markdown += '---\n\n';
        
        if (board.title) {
            markdown += `# ${board.title}\n\n`;
        }

        for (const lane of board.lanes) {
            markdown += `## ${lane.title}\n\n`;
            for (const card of lane.cards) {
                const checkChar = card.completed ? 'x' : ' ';
                markdown += `- [${checkChar}] ${card.content}\n`;
            }
            markdown += '\n';
        }

        return markdown;
    }
}
