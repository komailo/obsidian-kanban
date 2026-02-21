import { ItemView, WorkspaceLeaf } from 'obsidian';
import { KanbanBoard, moveCard } from './types';

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
            laneEl.dataset.laneId = lane.id;
            laneEl.createDiv({ text: lane.title, cls: 'kanban-lane-title' });

            const cardsContainer = laneEl.createDiv({ cls: 'kanban-cards' });
            
            cardsContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                cardsContainer.addClass('kanban-lane-drag-over');
            });

            cardsContainer.addEventListener('dragleave', () => {
                cardsContainer.removeClass('kanban-lane-drag-over');
            });

            cardsContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                cardsContainer.removeClass('kanban-lane-drag-over');
                const cardId = e.dataTransfer?.getData('text/plain');
                if (cardId && this.board) {
                    // Calculate drop index based on mouse position
                    const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);
                    const index = afterElement == null 
                        ? lane.cards.length 
                        : parseInt(afterElement.dataset.index || "0");
                    
                    this.board = moveCard(this.board, cardId, lane.id, index);
                    this.render();
                }
            });

            lane.cards.forEach((card, index) => {
                const cardEl = cardsContainer.createDiv({ cls: 'kanban-card' });
                cardEl.draggable = true;
                cardEl.dataset.cardId = card.id;
                cardEl.dataset.laneId = lane.id;
                cardEl.dataset.index = index.toString();

                cardEl.addEventListener('dragstart', (e) => {
                    if (e.dataTransfer) {
                        e.dataTransfer.setData('text/plain', card.id);
                        e.dataTransfer.effectAllowed = 'move';
                    }
                    cardEl.addClass('kanban-card-dragging');
                });

                cardEl.addEventListener('dragend', () => {
                    cardEl.removeClass('kanban-card-dragging');
                });

                const checkboxWrapper = cardEl.createDiv({ cls: 'kanban-card-checkbox-wrapper' });
                const checkbox = checkboxWrapper.createEl('input', { 
                    type: 'checkbox', 
                    cls: 'kanban-card-checkbox' 
                });
                checkbox.checked = card.completed;
                
                cardEl.createDiv({ text: card.content, cls: 'kanban-card-content' });
            });
        }
    }

    private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
        const draggableElements = [...container.querySelectorAll('.kanban-card:not(.kanban-card-dragging)')] as HTMLElement[];

        return draggableElements.reduce<{ offset: number; element: HTMLElement | null }>((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }
}
