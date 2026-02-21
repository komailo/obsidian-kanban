import { ItemView, WorkspaceLeaf } from 'obsidian';
import { KanbanBoard } from './types';

export const KANBAN_VIEW_TYPE = 'kanban-view';

export class KanbanView extends ItemView {
    board: KanbanBoard | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return KANBAN_VIEW_TYPE;
    }

    getDisplayText() {
        return this.board?.title || 'Kanban Board';
    }

    async onOpen() {
        this.render();
    }

    async onClose() {
        // Cleanup logic if needed
    }

    setBoard(board: KanbanBoard) {
        this.board = board;
        this.render();
    }

    render() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('kanban-board-container');

        if (!this.board) {
            container.createEl('h2', { text: 'No board loaded' });
            return;
        }

        const boardEl = container.createDiv({ cls: 'kanban-board' });
        boardEl.createEl('h1', { text: this.board.title, cls: 'kanban-title' });

        const lanesContainer = boardEl.createDiv({ cls: 'kanban-lanes' });

        for (const lane of this.board.lanes) {
            const laneEl = lanesContainer.createDiv({ cls: 'kanban-lane' });
            laneEl.createDiv({ text: lane.title, cls: 'kanban-lane-title' });

            const cardsContainer = laneEl.createDiv({ cls: 'kanban-cards' });
            for (const card of lane.cards) {
                const cardEl = cardsContainer.createDiv({ cls: 'kanban-card' });
                
                const checkboxWrapper = cardEl.createDiv({ cls: 'kanban-card-checkbox-wrapper' });
                const checkbox = checkboxWrapper.createEl('input', { 
                    type: 'checkbox', 
                    cls: 'kanban-card-checkbox' 
                });
                checkbox.checked = card.completed;
                
                cardEl.createDiv({ text: card.content, cls: 'kanban-card-content' });
            }
        }
    }
}
