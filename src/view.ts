import { TextFileView, WorkspaceLeaf, Menu, Modal, App, Setting, Notice, MarkdownRenderer } from 'obsidian';
import { KanbanBoard, moveCard, updateCard, KanbanLane } from './types';
import { MarkdownParser } from './parser';

export const KANBAN_VIEW_TYPE = 'kanban-view';

export class KanbanView extends TextFileView {
    plugin: any; // We'll use any or import KanbanPlugin, let's use any for now to avoid circular import issues if any, or better, import it
    board: KanbanBoard | null = null;
    editingCardId: string | null = null;
    editingLaneId: string | null = null;
    isEditingTitle: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: any) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return KANBAN_VIEW_TYPE;
    }

    getDisplayText() {
        return this.file ? this.file.basename : 'Kanban Board';
    }

    setViewData(data: string, clear: boolean) {
        this.board = MarkdownParser.parse(data);
        if (clear) {
            this.editingCardId = null;
            this.editingLaneId = null;
            this.isEditingTitle = false;
        }
        this.render();
    }

    getViewData() {
        if (!this.board) return "";
        return MarkdownParser.stringify(this.board);
    }

    clear() {
        this.board = null;
        this.editingCardId = null;
        this.editingLaneId = null;
        this.isEditingTitle = false;
    }

    setBoard(board: KanbanBoard) {
        this.board = board;
        this.render();
    }

    async onOpen() { }

    private updateBoard(newBoard: KanbanBoard) {
        this.board = newBoard;
        this.requestSave();
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

        const headerEl = boardEl.createDiv({ cls: 'kanban-header' });

        const titleWrapper = headerEl.createDiv({ cls: 'kanban-title-wrapper' });
        if (this.isEditingTitle) {
            const titleInput = titleWrapper.createEl('input', {
                cls: 'kanban-title-input',
                value: this.board.title || this.file?.basename || ""
            });
            titleInput.focus();

            const saveTitle = () => {
                this.board!.title = titleInput.value;
                this.isEditingTitle = false;
                this.updateBoard({ ...this.board! });
            };

            titleInput.addEventListener('blur', saveTitle);
            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                    this.isEditingTitle = false;
                    this.render();
                }
            });
        } else {
            const titleEl = titleWrapper.createEl('h1', {
                text: this.board.title || this.file?.basename || "Untitled Board",
                cls: 'kanban-title'
            });
            titleEl.addEventListener('click', () => {
                this.isEditingTitle = true;
                this.render();
            });
        }

        const settingsBtn = headerEl.createDiv({ cls: 'kanban-settings-btn', text: '⚙' });
        settingsBtn.addEventListener('click', () => {
            new BoardSettingsModal(this.app, this.board!, (newBoard) => {
                this.updateBoard(newBoard);
            }).open();
        });

        const lanesContainer = boardEl.createDiv({ cls: 'kanban-lanes' });

        for (const lane of this.board.lanes) {
            const laneEl = lanesContainer.createDiv({ cls: 'kanban-lane' });
            if (this.plugin.settings.laneWidth) {
                laneEl.style.width = `${this.plugin.settings.laneWidth}px`;
                laneEl.style.minWidth = `${this.plugin.settings.laneWidth}px`;
            }
            laneEl.dataset.laneId = lane.id;

            // Drag and drop listeners on the lane element itself
            laneEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                laneEl.addClass('kanban-lane-drag-over');
            });

            laneEl.addEventListener('dragleave', () => {
                laneEl.removeClass('kanban-lane-drag-over');
            });

            laneEl.addEventListener('drop', (e) => {
                e.preventDefault();
                laneEl.removeClass('kanban-lane-drag-over');
                const cardId = e.dataTransfer?.getData('text/plain');
                if (cardId && this.board) {
                    const cardsContainer = laneEl.querySelector('.kanban-cards') as HTMLElement;
                    const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);
                    const index = afterElement == null
                        ? lane.cards.length
                        : parseInt(afterElement.dataset.index || "0");

                    this.updateBoard(moveCard({ ...this.board }, cardId, lane.id, index));
                }
            });

            const laneHeader = laneEl.createDiv({ cls: 'kanban-lane-header' });

            if (this.editingLaneId === lane.id) {
                const laneInput = laneHeader.createEl('input', {
                    cls: 'kanban-lane-title-input',
                    value: lane.title
                });
                laneInput.focus();

                const saveLane = () => {
                    lane.title = laneInput.value;
                    this.editingLaneId = null;
                    this.updateBoard({ ...this.board! });
                };

                laneInput.addEventListener('blur', saveLane);
                laneInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveLane();
                    if (e.key === 'Escape') {
                        this.editingLaneId = null;
                        this.render();
                    }
                });
            } else {
                const titleEl = laneHeader.createDiv({ text: lane.title, cls: 'kanban-lane-title' });
                titleEl.addEventListener('click', () => {
                    this.editingLaneId = lane.id;
                    this.render();
                });

                const menuBtn = laneHeader.createDiv({ cls: 'kanban-lane-menu-btn', text: '⋮' });
                menuBtn.addEventListener('click', (e) => {
                    const menu = new Menu();
                    menu.addItem((item) =>
                        item.setTitle("Delete lane")
                            .setIcon("trash")
                            .setDisabled(lane.cards.length > 0)
                            .onClick(() => {
                                if (lane.cards.length > 0) {
                                    new Notice("Cannot delete a lane that contains cards.");
                                    return;
                                }
                                if (this.board) {
                                    this.board.lanes = this.board.lanes.filter(l => l.id !== lane.id);
                                    this.updateBoard({ ...this.board });
                                }
                            })
                    );
                    if (lane.cards.length > 0) {
                        menu.addItem((item) => item.setTitle("Only empty lanes can be deleted").setDisabled(true));
                    }
                    menu.showAtMouseEvent(e);
                });
            }

            const wipMatch = lane.title.match(/\((\d+)\)$/);
            const wipLimit = wipMatch && wipMatch[1] ? parseInt(wipMatch[1], 10) : null;
            const isOverLimit = wipLimit !== null && lane.cards.length > wipLimit;

            const countEl = laneHeader.createDiv({ cls: 'kanban-lane-count' });
            countEl.createSpan({ text: lane.cards.length.toString(), cls: isOverLimit ? 'kanban-wip-over' : '' });
            if (wipLimit !== null) {
                countEl.createSpan({ text: ` / ${wipLimit}` });
            }

            const cardsContainer = laneEl.createDiv({ cls: 'kanban-cards' });

            const isDoneLane = lane.title.toLowerCase() === 'done';

            lane.cards.forEach((card, index) => {
                const isEditing = this.editingCardId === card.id;
                const cardEl = cardsContainer.createDiv({ cls: `kanban-card ${isEditing ? 'kanban-card-editing' : ''} ${isDoneLane ? 'is-completed' : ''}` });
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
                        const trigger = this.plugin.settings.newLineTrigger || 'shift-enter';
                        const isNewLine = trigger === 'shift-enter' ? (e.key === 'Enter' && e.shiftKey) : (e.key === 'Enter' && !e.shiftKey);
                        const isSave = trigger === 'shift-enter' ? (e.key === 'Enter' && !e.shiftKey) : (e.key === 'Enter' && e.shiftKey);

                        if (isSave) {
                            e.preventDefault();
                            textarea.blur();
                        } else if (e.key === 'Escape') {
                            this.editingCardId = null;
                            this.render();
                        }
                    });
                } else {
                    let displayContent = card.content;

                    if (this.plugin.settings.hideTagsInTitle) {
                        displayContent = displayContent.replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim();
                    }

                    if (this.plugin.settings.showCheckboxes) {
                        const checkboxMatch = displayContent.match(/^- \[(x| )\]\s+([\s\S]*)/i);
                        if (checkboxMatch && checkboxMatch[1] && checkboxMatch[2] !== undefined) {
                            const isChecked = checkboxMatch[1].toLowerCase() === 'x';
                            const text = checkboxMatch[2];

                            const contentContainerEl = cardEl.createDiv({ cls: 'kanban-card-content kanban-card-has-checkbox' });
                            const checkboxEl = contentContainerEl.createEl('input', { type: 'checkbox', cls: 'kanban-card-checkbox' });
                            checkboxEl.checked = isChecked;

                            checkboxEl.addEventListener('change', (e) => {
                                e.stopPropagation();
                                const newMark = checkboxEl.checked ? 'x' : ' ';
                                const newContent = card.content.replace(/^- \[(x| )\]/i, `- [${newMark}]`);
                                if (this.board) {
                                    this.updateBoard(updateCard({ ...this.board }, card.id, newContent));
                                }
                            });

                            const textSpan = contentContainerEl.createSpan();
                            MarkdownRenderer.renderMarkdown(text, textSpan, this.file?.path || "", this);
                        } else {
                            const contentContainer = cardEl.createDiv({ cls: 'kanban-card-content' });
                            MarkdownRenderer.renderMarkdown(displayContent, contentContainer, this.file?.path || "", this);
                        }
                    } else {
                        const contentContainer = cardEl.createDiv({ cls: 'kanban-card-content' });
                        MarkdownRenderer.renderMarkdown(displayContent, contentContainer, this.file?.path || "", this);
                    }
                }
            });

            const addCardBtn = laneEl.createDiv({ cls: 'kanban-add-card', text: '+ Add a card' });
            addCardBtn.addEventListener('click', () => {
                if (this.board) {
                    const newCard = {
                        id: Math.random().toString(36).substring(2, 11),
                        content: ""
                    };
                    if (this.plugin.settings.newCardInsertionMethod === 'prepend') {
                        lane.cards.unshift(newCard);
                    } else {
                        lane.cards.push(newCard);
                    }
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

class BoardSettingsModal extends Modal {
    board: KanbanBoard;
    onSave: (board: KanbanBoard) => void;

    constructor(app: App, board: KanbanBoard, onSave: (board: KanbanBoard) => void) {
        super(app);
        this.board = board;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Board Settings' });

        new Setting(contentEl)
            .setName('Swim lanes')
            .setDesc('Configure the lanes for this board (one per line). Reordering the lines will reorder the lanes.')
            .addTextArea(text => {
                text.setPlaceholder('Backlog\nTodo\nIn Progress\nDone')
                    .setValue(this.board.lanes.map(l => l.title).join('\n'))
                    .onChange((value) => {
                        const newTitles = value.split('\n').filter(t => t.trim() !== '');

                        const currentLanes = [...this.board.lanes];
                        const updatedLanes: KanbanLane[] = [];

                        newTitles.forEach(title => {
                            const existing = currentLanes.find(l => l.title === title);
                            if (existing) {
                                updatedLanes.push(existing);
                            } else {
                                updatedLanes.push({
                                    id: Math.random().toString(36).substring(2, 11),
                                    title,
                                    cards: []
                                });
                            }
                        });

                        const removedWithCards = currentLanes.filter(l =>
                            !newTitles.includes(l.title) && l.cards.length > 0
                        );

                        if (removedWithCards.length > 0) {
                            removedWithCards.forEach(l => updatedLanes.push(l));
                        }

                        this.board.lanes = updatedLanes;
                    });
                text.inputEl.rows = 8;
                text.inputEl.style.width = '100%';
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(() => {
                    this.onSave(this.board);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
