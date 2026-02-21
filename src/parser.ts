import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTaskListItemFromMarkdown } from 'mdast-util-gfm-task-list-item';
import { gfmTaskListItem } from 'micromark-extension-gfm-task-list-item';
import { Root, ListItem } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { KanbanBoard, KanbanLane, KanbanCard } from './types';

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

        // If no lanes found, add default swimlanes
        if (board.lanes.length === 0) {
            const defaultLanes = ['Backlog', 'Todo', 'In Progress', 'Done'];
            board.lanes = defaultLanes.map(title => ({
                id: Math.random().toString(36).substring(2, 11),
                title,
                cards: []
            }));
        }

        return board;
    }

    private static parseCard(listItem: ListItem): KanbanCard {
        const completed = listItem.checked === true;
        
        // When using the GFM task list extension, the checkbox is a separate token, 
        // so toString(listItem) should not include it.
        const content = toString(listItem);

        return {
            id: Math.random().toString(36).substring(2, 11),
            content,
            completed
        };
    }

    static stringify(board: KanbanBoard): string {
        let markdown = '';
        
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
