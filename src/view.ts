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
    placeholderEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: any) {
        super(leaf);
        this.plugin = plugin;
        this.placeholderEl = document.createElement('div');
        this.placeholderEl.addClass('kanban-card-placeholder');
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

        const archiveBtn = headerEl.createDiv({ cls: 'kanban-archive-btn', text: '📦', attr: { title: 'View Archive' } });
        archiveBtn.addEventListener('click', () => {
            new ArchiveModal(this.app, this.board!).open();
        });

        const settingsBtn = headerEl.createDiv({ cls: 'kanban-settings-btn', text: '⚙' });
        settingsBtn.addEventListener('click', () => {
            new BoardSettingsModal(this.app, this.board!, (newBoard) => {
                this.updateBoard(newBoard);
            }).open();
        });

        const lanesContainer = boardEl.createDiv({ cls: 'kanban-lanes' });

        for (const lane of this.board.lanes) {
            if (lane.title === '*** Archive ***') continue;

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

                const cardsContainer = laneEl.querySelector('.kanban-cards');
                if (cardsContainer) {
                    const afterElement = this.getDragAfterElement(cardsContainer as HTMLElement, e.clientY);
                    if (afterElement == null) {
                        cardsContainer.appendChild(this.placeholderEl);
                    } else {
                        cardsContainer.insertBefore(this.placeholderEl, afterElement);
                    }
                }
            });

            laneEl.addEventListener('dragleave', () => {
                laneEl.removeClass('kanban-lane-drag-over');
            });

            laneEl.addEventListener('drop', (e) => {
                e.preventDefault();
                laneEl.removeClass('kanban-lane-drag-over');

                if (this.placeholderEl && this.placeholderEl.parentNode) {
                    this.placeholderEl.parentNode.removeChild(this.placeholderEl);
                }

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
                        if (this.placeholderEl && this.placeholderEl.parentNode) {
                            this.placeholderEl.parentNode.removeChild(this.placeholderEl);
                        }
                    });

                    cardEl.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        const menu = new Menu();

                        menu.addItem((item) => {
                            item.setTitle("Archive card")
                                .setIcon("box")
                                .onClick(() => {
                                    if (this.board) {
                                        let archiveLane = this.board.lanes.find(l => l.title === '*** Archive ***');
                                        if (!archiveLane) {
                                            archiveLane = { id: Math.random().toString(36).substring(2, 11), title: '*** Archive ***', cards: [] };
                                            this.board.lanes.push(archiveLane);
                                        }

                                        let newContent = card.content;
                                        if (this.plugin.settings.appendArchiveDate) {
                                            const format = this.plugin.settings.archiveDateFormat || 'YYYY-MM-DD';
                                            newContent += ` ${window.moment().format(format)}`;
                                        }

                                        let updatedBoard = moveCard({ ...this.board }, card.id, archiveLane.id, archiveLane.cards.length);
                                        updatedBoard = updateCard(updatedBoard, card.id, newContent);
                                        this.updateBoard(updatedBoard);
                                    }
                                });
                        });

                        menu.addItem((item) => {
                            item.setTitle("Create note from card")
                                .setIcon("document")
                                .onClick(async () => {
                                    await this.createNoteFromCard(card, lane);
                                });
                        });

                        menu.addItem((item) => {
                            item.setTitle("Delete card")
                                .setIcon("trash")
                                .onClick(() => {
                                    if (this.board) {
                                        lane.cards = lane.cards.filter(c => c.id !== card.id);
                                        this.updateBoard({ ...this.board });
                                    }
                                });
                        });

                        menu.showAtMouseEvent(e);
                    });

                    cardEl.addEventListener('click', (e: MouseEvent) => {
                        const target = e.target as HTMLElement;
                        
                        // Handle links
                        const anchor = target.closest('a');
                        if (anchor) {
                            const href = anchor.getAttr('data-href') || anchor.getAttr('href');
                            if (href) {
                                if (anchor.hasClass('internal-link')) {
                                    this.app.workspace.openLinkText(href, this.file?.path || "", e.ctrlKey || e.metaKey || e.button === 1);
                                } else if (anchor.hasClass('external-link')) {
                                    window.open(href);
                                }
                            }
                            return;
                        }

                        // If we're clicking a checkbox, don't enter edit mode
                        if (target.closest('.task-list-item-checkbox') || target.closest('input[type="checkbox"]')) {
                            return;
                        }

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
                            let valueToSave = textarea.value;

                            // Date Replacements
                            const df = this.plugin.settings.dateFormat || 'YYYY-MM-DD';

                            if (valueToSave.includes('@today')) {
                                valueToSave = valueToSave.replace(/@today/g, window.moment().format(df));
                            }

                            if (valueToSave.includes('@tomorrow')) {
                                valueToSave = valueToSave.replace(/@tomorrow/g, window.moment().add(1, 'day').format(df));
                            }

                            const customTrigger = this.plugin.settings.dateTrigger;
                            if (customTrigger && customTrigger !== '@today' && customTrigger !== '@tomorrow' && valueToSave.includes(customTrigger)) {
                                const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                const triggerRegex = new RegExp(escapeRegex(customTrigger), 'g');
                                valueToSave = valueToSave.replace(triggerRegex, window.moment().format(df));
                            }

                            const newBoard = updateCard({ ...this.board }, card.id, valueToSave);
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

                    if (this.plugin.settings.showRelativeDate || this.plugin.settings.linkDateToDailyNote) {
                        displayContent = displayContent.replace(/(?<!\[\[)(\b\d{4}-\d{2}-\d{2}\b)(?!\]\])/g, (match, p1) => {
                            let replacement = p1;
                            if (this.plugin.settings.linkDateToDailyNote) {
                                replacement = `[[${p1}]]`;
                            }
                            if (this.plugin.settings.showRelativeDate) {
                                const m = window.moment(p1, 'YYYY-MM-DD');
                                if (m.isValid()) {
                                    replacement += ` (${m.calendar(null, {
                                        sameDay: '[Today]',
                                        nextDay: '[Tomorrow]',
                                        nextWeek: 'dddd',
                                        lastDay: '[Yesterday]',
                                        lastWeek: '[Last] dddd',
                                        sameElse: 'fromNow'
                                    })})`; // calendar or fromNow, fromNow is easier: m.fromNow()
                                    // Actually fromNow() is better for standard relative
                                    replacement = replacement.replace(/\(.+?\)$/, `(${m.fromNow()})`);
                                }
                            }
                            return replacement;
                        });

                        if (this.plugin.settings.showRelativeDate) {
                            displayContent = displayContent.replace(/\[\[(\d{4}-\d{2}-\d{2})\]\](?!\s*\()/g, (match, p1) => {
                                const m = window.moment(p1, 'YYYY-MM-DD');
                                if (m.isValid()) {
                                    return `${match} (${m.fromNow()})`;
                                }
                                return match;
                            });
                        }
                    }

                    if (this.plugin.settings.hideTagsInTitle) {
                        displayContent = displayContent.replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim();
                    }

                    if (this.plugin.settings.showCheckboxes) {
                        // Instead of custom parsing the first line, we just render the raw markdown
                        // and use CSS to style the Obsidian task list items to match the UI.
                        // We also need to hook into clicks on those rendered checkboxes.
                        const contentContainer = cardEl.createDiv({ cls: 'kanban-card-content kanban-card-native-checkboxes' });
                        MarkdownRenderer.renderMarkdown(displayContent, contentContainer, this.file?.path || "", this)
                            .then(() => {
                                // Add event listeners to rendered checkboxes to update the card content
                                const checkboxes = contentContainer.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
                                checkboxes.forEach((cb: HTMLInputElement, index) => {
                                    cb.addEventListener('change', (e) => {
                                        e.stopPropagation();

                                        // Simple string replacement: find the nth instance of `- [ ]` or `- [x]`
                                        let matchCount = -1;
                                        const newMark = cb.checked ? 'x' : ' ';
                                        const newContent = card.content.replace(/- \[(x| )\]/ig, (match) => {
                                            matchCount++;
                                            if (matchCount === index) {
                                                return `- [${newMark}]`;
                                            }
                                            return match;
                                        });

                                        if (this.board && newContent !== card.content) {
                                            this.updateBoard(updateCard({ ...this.board }, card.id, newContent));
                                        }
                                    });
                                });
                            });
                    } else {
                        const contentContainer = cardEl.createDiv({ cls: 'kanban-card-content' });
                        MarkdownRenderer.renderMarkdown(displayContent, contentContainer, this.file?.path || "", this);
                    }

                    if (this.plugin.settings.showLinkedPageMetadata) {
                        const linkMatch = displayContent.match(/\[\[([^\]|]+)(?:\|.*)?\]\]/);
                        if (linkMatch) {
                            const linkText = linkMatch[1] as string;
                            const destFile = this.app.metadataCache.getFirstLinkpathDest(linkText, this.file?.path || "");
                            if (destFile) {
                                const cache = this.app.metadataCache.getFileCache(destFile);
                                if (cache && cache.frontmatter) {
                                    const metaEntries = Object.entries(cache.frontmatter)
                                        .filter(([k, v]) => k !== 'position' && v !== null && v !== undefined);

                                    if (metaEntries.length > 0) {
                                        const metaContainer = cardEl.createDiv({ cls: 'kanban-card-metadata', attr: { style: 'font-size: 0.8em; opacity: 0.7; margin-top: 5px; background: var(--background-secondary-alt); padding: 4px; border-radius: 4px;' } });
                                        metaEntries.forEach(([k, v]) => {
                                            metaContainer.createDiv({ text: `${k}: ${v}` });
                                        });
                                    }
                                }
                            }
                        }
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

    private async createNoteFromCard(card: any, lane: KanbanLane) {
        let noteTitle = card.content.split('\n')[0].replace(/[\\/:"*?<>|#]/g, '').trim() || `Card ${card.id}`;
        if (noteTitle.length > 50) noteTitle = noteTitle.substring(0, 50).trim();

        const folderPath = this.file?.parent?.path || "";
        const templatePath = this.plugin.settings.newNoteTemplate || "";

        let folder = this.app.vault.getAbstractFileByPath(folderPath || '/');
        if (!folder && folderPath) {
            try {
                folder = await this.app.vault.createFolder(folderPath);
            } catch (e) {
                new Notice("Failed to create folder: " + folderPath);
                return;
            }
        }

        const fullPath = `${folderPath && folderPath !== '/' ? folderPath + '/' : ''}${noteTitle}.md`;

        // check if exists
        let file = this.app.vault.getAbstractFileByPath(fullPath);
        if (file) {
            new Notice("File already exists: " + fullPath);
            this.app.workspace.getLeaf(false).openFile(file as any);
            return;
        }

        let content = "";
        if (templatePath) {
            try {
                const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
                if (templateFile) {
                    content = await this.app.vault.read(templateFile as any);
                }
            } catch (e) {
                new Notice("Failed to read template file: " + templatePath);
            }
        } else {
            content = `# ${noteTitle}\n\n`;
        }

        try {
            file = await this.app.vault.create(fullPath, content);
            new Notice(`Created note: ${noteTitle}`);

            if (this.board) {
                const newContent = `[[${noteTitle}]]`;
                this.updateBoard(updateCard({ ...this.board }, card.id, newContent));
            }

            this.app.workspace.getLeaf(false).openFile(file as any);
        } catch (e: any) {
            new Notice("Failed to create note: " + e.message);
        }
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

class ArchiveModal extends Modal {
    board: KanbanBoard;

    constructor(app: App, board: KanbanBoard) {
        super(app);
        this.board = board;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Archived Cards' });

        const archiveLane = this.board.lanes.find(l => l.title === '*** Archive ***');
        if (!archiveLane || archiveLane.cards.length === 0) {
            contentEl.createEl('p', { text: 'No archived cards.' });
            return;
        }

        const list = contentEl.createEl('ul', { cls: 'kanban-archive-list', attr: { style: 'max-height: 400px; overflow-y: auto;' } });
        archiveLane.cards.forEach(card => {
            const li = list.createEl('li', { attr: { style: 'margin-bottom: 10px; padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px;' } });
            MarkdownRenderer.renderMarkdown(card.content, li, "", this as any);
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
