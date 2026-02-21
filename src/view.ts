import { TextFileView, WorkspaceLeaf } from 'obsidian';
import { KanbanBoard, moveCard, updateCard } from './types';
import { MarkdownParser } from './parser';

export const KANBAN_VIEW_TYPE = 'kanban-view';

export class KanbanView extends TextFileView {
    board: KanbanBoard | null = null;
    editingCardId: string | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return KANBAN_VIEW_TYPE;
    }

    getDisplayText() {
        return this.file ? this.file.basename : 'Kanban Board';
    }

    // This is called when the file is loaded into the view
    setViewData(data: string, clear: boolean) {
        this.board = MarkdownParser.parse(data);
        if (clear) {
            this.editingCardId = null;
        }
        this.render();
    }

    // This is called when Obsidian wants to save the file
    getViewData() {
        if (!this.board) return "";
        return MarkdownParser.stringify(this.board);
    }

    clear() {
        this.board = null;
        this.editingCardId = null;
    }

    async onOpen() {
        // TextFileView handles much of the container logic
    }

    // Helper to update board and request save
    private updateBoard(newBoard: KanbanBoard) {
        this.board = newBoard;
        this.requestSave(); // Triggers Obsidian's save lifecycle which calls getViewData
        this.render();
    }

    render() {
        const container = this.contentEl;
        container.empty();
        container.addClass('kanban-board-container');

        if (!this.board) {
            container.createEl('h2', { text: 'No board loaded' });
            return;
        }

        const boardEl = container.createDiv({ cls: 'kanban-board' });
        
        // Header section like the screenshot
        const headerEl = boardEl.createDiv({ cls: 'kanban-header' });
        headerEl.createEl('h1', { text: this.board.title || this.file?.basename || "Untitled Board", cls: 'kanban-title' });

        const lanesContainer = boardEl.createDiv({ cls: 'kanban-lanes' });

        for (const lane of this.board.lanes) {
            const laneEl = lanesContainer.createDiv({ cls: 'kanban-lane' });
            laneEl.dataset.laneId = lane.id;
            
            const laneHeader = laneEl.createDiv({ cls: 'kanban-lane-header' });
            laneHeader.createDiv({ text: lane.title, cls: 'kanban-lane-title' });
            laneHeader.createDiv({ text: lane.cards.length.toString(), cls: 'kanban-lane-count' });

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
                    const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);
                    const index = afterElement == null 
                        ? lane.cards.length 
                        : parseInt(afterElement.dataset.index || "0");
                    
                    this.updateBoard(moveCard({ ...this.board }, cardId, lane.id, index));
                }
            });

            lane.cards.forEach((card, index) => {
                const isEditing = this.editingCardId === card.id;
                const cardEl = cardsContainer.createDiv({ cls: `kanban-card ${isEditing ? 'kanban-card-editing' : ''} ${card.completed ? 'is-completed' : ''}` });
                cardEl.draggable = !isEditing;
                cardEl.dataset.cardId = card.id;
                cardEl.dataset.laneId = lane.id;
                cardEl.dataset.index = index.toString();

                if (!isEditing) {
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

                    cardEl.addEventListener('click', () => {
                        this.editingCardId = card.id;
                        this.render();
                    });
                }

                const checkboxWrapper = cardEl.createDiv({ cls: 'kanban-card-checkbox-wrapper' });
                const checkbox = checkboxWrapper.createEl('input', { 
                    type: 'checkbox', 
                    cls: 'kanban-card-checkbox' 
                });
                checkbox.checked = card.completed;
                checkbox.disabled = isEditing;
                
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (this.board) {
                        card.completed = checkbox.checked;
                        this.updateBoard({ ...this.board });
                    }
                });
                
                if (isEditing) {
                    const textarea = cardEl.createEl('textarea', {
                        cls: 'kanban-card-textarea',
                        text: card.content
                    });
                    
                    textarea.focus();
                    
                    const save = () => {
                        if (this.board) {
                            const newBoard = updateCard({ ...this.board }, card.id, textarea.value);
                            this.editingCardId = null;
                            this.updateBoard(newBoard);
                        }
                    };

                    textarea.addEventListener('blur', save);
                    textarea.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            textarea.blur();
                        } else if (e.key === 'Escape') {
                            this.editingCardId = null;
                            this.render();
                        }
                    });
                } else {
                    cardEl.createDiv({ text: card.content, cls: 'kanban-card-content' });
                }
            });

            // Add card button at bottom of lane
            const addCardBtn = laneEl.createDiv({ cls: 'kanban-add-card', text: '+ Add a card' });
            addCardBtn.addEventListener('click', () => {
                if (this.board) {
                    const newCard = {
                        id: Math.random().toString(36).substring(2, 11),
                        content: "",
                        completed: false
                    };
                    lane.cards.push(newCard);
                    this.editingCardId = newCard.id;
                    this.updateBoard({ ...this.board });
                }
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
